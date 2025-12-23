-- RPC to safely fetch passengers for a specific schedule
-- FIXED: Added explicit table aliases to avoid ambiguous "id" reference
-- The error "column reference 'id' is ambiguous" happens because the return table 
-- column "id" name clashes with the table column "id" name in PL/pgSQL.

CREATE OR REPLACE FUNCTION get_passengers_for_schedule(p_schedule_id UUID)
RETURNS TABLE (
    pax_id UUID,
    full_name TEXT,
    dni TEXT,
    station_name TEXT,
    station_code TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_manifest UUID[];
BEGIN
    -- Get the manifest from the schedule
    SELECT ts.passengers_manifest INTO v_manifest
    FROM transport_schedules ts
    WHERE ts.id = p_schedule_id;

    IF v_manifest IS NULL OR array_length(v_manifest, 1) = 0 THEN
        RETURN;
    END IF;

    -- Return employee details for those in the manifest
    -- We select into the columns defined in RETURNS TABLE
    RETURN QUERY
    SELECT 
        e.id as pax_id,
        e.full_name,
        e.dni,
        s.name as station_name,
        s.code as station_code
    FROM employees e
    LEFT JOIN stations s ON e.station_id = s.id
    WHERE e.id = ANY(v_manifest);
END;
$$;
