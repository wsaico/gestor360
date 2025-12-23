-- Drop existing function first (if it exists)
DROP FUNCTION IF EXISTS get_passengers_for_schedule(UUID);

-- RPC to safely fetch passengers for a specific schedule
-- FIXED: Match exact column types from employees table (VARCHAR instead of TEXT)

CREATE OR REPLACE FUNCTION get_passengers_for_schedule(p_schedule_id UUID)
RETURNS TABLE (
    pax_id UUID,
    full_name VARCHAR(255),
    dni VARCHAR(20),
    station_name VARCHAR(255),
    station_code VARCHAR(50)
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
    RETURN QUERY
    SELECT 
        e.id,
        e.full_name,
        e.dni,
        s.name,
        s.code
    FROM employees e
    LEFT JOIN stations s ON e.station_id = s.id
    WHERE e.id = ANY(v_manifest);
END;
$$;
