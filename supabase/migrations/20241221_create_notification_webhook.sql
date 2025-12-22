-- Enable pg_net for HTTP requests
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Function to Trigger Edge Function
CREATE OR REPLACE FUNCTION public.trigger_low_stock_alert()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    payload jsonb;
    request_id int;
    edge_function_url text;
    service_role_key text;
BEGIN
    -- 1. Get Metadata (URL and Key from settings or secrets if possible, otherwise hardcoded/env)
    -- For this implementation, we will try to fetch from app_settings or default to specific project URL
    -- NOTE: In local dev, this might need localhost. In prod, the project URL.
    -- We will assume a setting 'EDGE_FUNCTION_URL' exists, or fallback to a standard structure.
    
    SELECT value INTO edge_function_url FROM public.app_settings WHERE key = 'EDGE_FUNCTION_URL';
    
    -- Fallback strategy
    IF edge_function_url IS NULL THEN
        edge_function_url := 'https://ohbwsuktgmnycsokqdja.supabase.co/functions/v1/send-email-alerts'; 
    END IF;

    -- 2. Construct Payload (Supabase Webhook Standard)
    payload := jsonb_build_object(
        'type', 'UPDATE',
        'table', 'epp_items',
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD)
    );

    -- 3. Send Post Request (Async)
    -- Requires pg_net extension
    -- We use a dummy Authorization header or the ANON key if needed. 
    -- For Edge Functions with 'no verify', it's open. If 'verify JWT', we need a key.
    -- Assuming Internal Service Role or Anon for now.
    
    PERFORM net.http_post(
        url := edge_function_url,
        body := payload,
        headers := '{"Content-Type": "application/json"}'::jsonb
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Fail silently to not block the transaction, but log it
        RAISE WARNING 'Failed to trigger notification: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Trigger Definition
DROP TRIGGER IF EXISTS on_low_stock_update ON public.epp_items;

CREATE TRIGGER on_low_stock_update
AFTER UPDATE OF stock_current ON public.epp_items
FOR EACH ROW
WHEN (NEW.stock_current <= NEW.stock_min AND OLD.stock_current > NEW.stock_min)
EXECUTE FUNCTION public.trigger_low_stock_alert();

-- Insert Production URL

-- Insert Default URL (Production)
INSERT INTO public.app_settings (key, value, description)
VALUES ('EDGE_FUNCTION_URL', 'https://ohbwsuktgmnycsokqdja.supabase.co/functions/v1/send-email-alerts', 'URL for the send-email-alerts Edge Function')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;


-- 4. Enable PG_CRON for Daily Digests
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Schedule Daily Digest (Runs at 8:00 AM every day)
-- This calls the Edge Function without a specific record, triggering the "Digest" mode
SELECT cron.schedule(
    'daily-digest',
    '0 8 * * *', 
    $$
    SELECT net.http_post(
        url := (SELECT value FROM public.app_settings WHERE key = 'EDGE_FUNCTION_URL'),
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);

