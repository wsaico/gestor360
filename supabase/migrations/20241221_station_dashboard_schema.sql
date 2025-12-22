-- 1. ENHANCE ANNOUNCEMENTS TABLE
-- Support for multimedia and prioritization
ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS media_type text CHECK (media_type IN ('image', 'video', 'text')) DEFAULT 'text',
ADD COLUMN IF NOT EXISTS media_url text,
ADD COLUMN IF NOT EXISTS priority text CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'low',
ADD COLUMN IF NOT EXISTS station_id uuid REFERENCES public.stations(id); -- Nullable: NULL = Global Announcement

-- 2. CREATE SECURE RPC FOR KIOSK ALERTS
-- Replaces previous version
CREATE OR REPLACE FUNCTION public.get_station_public_alerts(p_station_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_birthdays jsonb;
    v_docs jsonb;
BEGIN
    -- 1. Fetch Active Employees with Birthdays (Current Month)
    SELECT jsonb_agg(t) INTO v_birthdays FROM (
        SELECT 
            full_name,
            to_char(birth_date, 'DD/MM') as birth_day_str,
            birth_date
        FROM public.employees
        WHERE station_id = p_station_id 
        -- Flexible status check (case insensitive or allow null if needed, but 'ACTIVO' is standard)
        AND UPPER(status) = 'ACTIVO' 
        AND birth_date IS NOT NULL
        -- STRICTLY Current Month
        AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        ORDER BY EXTRACT(DAY FROM birth_date) ASC
    ) t;

    -- 2. Fetch Expiring Documents (Expired + Next 45 Days to cover 1 month, 15 days, today)
    SELECT jsonb_agg(d) INTO v_docs FROM (
        SELECT 
            e.full_name,
            ed.doc_type as document_type, -- Corrected column name from 'document_type' to 'doc_type'
            to_char(ed.expiry_date, 'DD/MM/YYYY') as expiry_date_fmt,
            ed.expiry_date,
            CASE 
                WHEN ed.expiry_date < CURRENT_DATE THEN 'expired'
                ELSE 'expiring'
            END as status
        FROM public.employee_docs ed
        JOIN public.employees e ON ed.employee_id = e.id
        WHERE e.station_id = p_station_id
        AND UPPER(e.status) = 'ACTIVO' -- ensure active employees only
        -- Case insensitive document types
        AND UPPER(ed.doc_type) IN ('EMO', 'PHOTOCHECK')
        AND (
            ed.expiry_date < CURRENT_DATE -- Already Expired
            OR 
            ed.expiry_date <= (CURRENT_DATE + INTERVAL '45 days') -- Expiring in next 45 days (covers 1 month + 15 days margin)
        )
        ORDER BY ed.expiry_date ASC -- Urgent first
    ) d;

    RETURN jsonb_build_object(
        'birthdays', COALESCE(v_birthdays, '[]'::jsonb),
        'docs', COALESCE(v_docs, '[]'::jsonb)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_station_public_alerts(uuid) TO anon, authenticated, service_role;
