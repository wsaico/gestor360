-- Create a function to get all header notifications in one request
CREATE OR REPLACE FUNCTION public.get_header_notifications(p_station_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_birthdays jsonb;
    v_docs jsonb;
    v_epps jsonb;
BEGIN
    -- 1. Fetch Birthdays (Today + Next 7 Days)
    SELECT jsonb_agg(t) INTO v_birthdays FROM (
        SELECT 
            full_name,
            to_char(birth_date, 'DD/MM') as birth_day_str,
            birth_date,
            -- Calculate days until birthday (handling year wrap)
            (
                CASE 
                    WHEN extract(doy from birth_date) >= extract(doy from CURRENT_DATE)
                    THEN extract(doy from birth_date) - extract(doy from CURRENT_DATE)
                    ELSE (extract(doy from birth_date) + 365) - extract(doy from CURRENT_DATE)
                END
            ) as days_until
        FROM public.employees
        WHERE station_id = p_station_id 
        AND UPPER(status) = 'ACTIVO' 
        AND birth_date IS NOT NULL
        AND (
            -- Check if birthday is within next 7 days
            (
                make_date(extract(year from CURRENT_DATE)::int, extract(month from birth_date)::int, extract(day from birth_date)::int) 
                BETWEEN CURRENT_DATE AND (CURRENT_DATE + 7)
            )
            OR
            -- Handle year wrap (e.g. Dec 30 looking at Jan 2)
            (
                make_date(extract(year from CURRENT_DATE)::int + 1, extract(month from birth_date)::int, extract(day from birth_date)::int) 
                BETWEEN CURRENT_DATE AND (CURRENT_DATE + 7)
            )
        )
        ORDER BY days_until ASC
    ) t;

    -- 2. Fetch Expiring Documents (Expired + Next 30 Days)
    SELECT jsonb_agg(d) INTO v_docs FROM (
        SELECT 
            e.full_name,
            ed.doc_type as document_type, 
            to_char(ed.expiry_date, 'DD/MM/YYYY') as expiry_date_fmt,
            ed.expiry_date,
            (ed.expiry_date - CURRENT_DATE) as days_remaining,
            CASE 
                WHEN ed.expiry_date < CURRENT_DATE THEN 'expired'
                ELSE 'expiring'
            END as status
        FROM public.employee_docs ed
        JOIN public.employees e ON ed.employee_id = e.id
        WHERE e.station_id = p_station_id
        AND UPPER(e.status) = 'ACTIVO'
        AND UPPER(ed.doc_type) IN ('EMO', 'FOTOCHECK', 'PHOTOCHECK')
        AND (
            ed.expiry_date < CURRENT_DATE 
            OR 
            ed.expiry_date <= (CURRENT_DATE + INTERVAL '30 days')
        )
        ORDER BY ed.expiry_date ASC
        LIMIT 50
    ) d;

    -- 3. Fetch EPP Renewals (Expired + Next 30 Days)
    SELECT jsonb_agg(r) INTO v_epps FROM (
        SELECT 
            e.full_name,
            i.name as item_name,
            to_char(d.renewal_date, 'DD/MM/YYYY') as renewal_date_fmt,
            d.renewal_date,
            (d.renewal_date - CURRENT_DATE) as days_remaining,
            CASE 
                WHEN d.renewal_date < CURRENT_DATE THEN 'expired'
                ELSE 'expiring'
            END as status
        FROM public.employee_epp_assignments d
        JOIN public.employees e ON d.employee_id = e.id
        LEFT JOIN public.epp_items i ON d.item_id = i.id
        WHERE e.station_id = p_station_id
        AND d.renewal_date IS NOT NULL
        AND d.status = 'ACTIVE'
        AND (
            d.renewal_date < CURRENT_DATE 
            OR 
            d.renewal_date <= (CURRENT_DATE + INTERVAL '30 days')
        )
        ORDER BY d.renewal_date ASC
        LIMIT 50
    ) r;

    RETURN jsonb_build_object(
        'birthdays', COALESCE(v_birthdays, '[]'::jsonb),
        'docs', COALESCE(v_docs, '[]'::jsonb),
        'epps', COALESCE(v_epps, '[]'::jsonb)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_header_notifications(uuid) TO authenticated;
