-- Includes previous fixes (Birthday Range) + Fotocheck addition
CREATE OR REPLACE FUNCTION public.get_station_public_alerts(p_station_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_birthdays jsonb;
    v_docs jsonb;
BEGIN
    -- 1. Fetch Active Employees with Birthdays (Current Month AND Next Month)
    SELECT jsonb_agg(t) INTO v_birthdays FROM (
        SELECT 
            full_name,
            -- Format: "15/01"
            to_char(birth_date, 'DD/MM') as birth_day_str,
            birth_date
        FROM public.employees
        WHERE station_id = p_station_id 
        AND UPPER(status) = 'ACTIVO' 
        AND birth_date IS NOT NULL
        AND (
            -- Current Month
            EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
            OR
            -- Next Month
            EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM (CURRENT_DATE + INTERVAL '1 month'))
        )
        -- Order logic:
        -- 1. "Next Year" check: If birth month < current month (e.g. Jan < Dec), it belongs to next year -> Last.
        -- 2. Then by Month ASC
        -- 3. Then by Day ASC
        ORDER BY 
            (EXTRACT(MONTH FROM birth_date) < EXTRACT(MONTH FROM CURRENT_DATE)),
            EXTRACT(MONTH FROM birth_date),
            EXTRACT(DAY FROM birth_date)
            ASC
    ) t;

    -- 2. Fetch Expiring Documents (Expired + Next 45 Days)
    SELECT jsonb_agg(d) INTO v_docs FROM (
        SELECT 
            e.full_name,
            ed.doc_type as document_type, 
            to_char(ed.expiry_date, 'DD/MM/YYYY') as expiry_date_fmt,
            ed.expiry_date,
            CASE 
                WHEN ed.expiry_date < CURRENT_DATE THEN 'expired'
                ELSE 'expiring'
            END as status
        FROM public.employee_docs ed
        JOIN public.employees e ON ed.employee_id = e.id
        WHERE e.station_id = p_station_id
        AND UPPER(e.status) = 'ACTIVO'
        -- FIX: Added 'FOTOCHECK' (Standard) alongside 'PHOTOCHECK' (Legacy/Typo)
        AND UPPER(ed.doc_type) IN ('EMO', 'FOTOCHECK', 'PHOTOCHECK')
        AND (
            ed.expiry_date < CURRENT_DATE 
            OR 
            ed.expiry_date <= (CURRENT_DATE + INTERVAL '45 days')
        )
        ORDER BY ed.expiry_date ASC
    ) d;

    RETURN jsonb_build_object(
        'birthdays', COALESCE(v_birthdays, '[]'::jsonb),
        'docs', COALESCE(v_docs, '[]'::jsonb)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_station_public_alerts(uuid) TO anon, authenticated, service_role;
