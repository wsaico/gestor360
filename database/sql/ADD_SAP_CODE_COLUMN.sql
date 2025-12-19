DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'epp_items'
        AND column_name = 'sap_code'
    ) THEN
        ALTER TABLE public.epp_items ADD COLUMN sap_code TEXT;
    END IF;
END $$;
