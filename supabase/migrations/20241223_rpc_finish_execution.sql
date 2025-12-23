-- MIGRATION: 20241223_rpc_finish_execution.sql
-- OBJECTIVE: Securely finish trip, saving check-ins and calculating final cost.
-- DATE: 2024-12-23

BEGIN;

CREATE OR REPLACE FUNCTION public.finish_transport_execution(
  p_schedule_id uuid,
  p_check_ins jsonb, -- Array of employee_ids that were present
  p_end_location jsonb DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_execution_id uuid;
  v_result jsonb;
BEGIN
  -- 1. Get Execution ID
  SELECT id INTO v_execution_id FROM public.transport_execution WHERE schedule_id = p_schedule_id;

  IF v_execution_id IS NULL THEN
    RAISE EXCEPTION 'Execution not found for this schedule';
  END IF;

  -- 2. Update Execution with Check-ins and End Time
  -- We format the p_check_ins to be the expected JSONB structure for check-in records 
  -- (e.g. {employee_id: "...", timestamp: "..."})
  -- Or we just store the list of present IDs if we want to be simple.
  -- The table schema says: check_ins JSONB DEFAULT '[]'::jsonb
  -- Let's assume p_check_ins is ALREADY a valid JSONB array of check-in objects from the frontend.
  
  UPDATE public.transport_execution
  SET 
    check_ins = p_check_ins,
    end_time = NOW(),
    gps_track = CASE 
                  WHEN p_end_location IS NOT NULL THEN gps_track || p_end_location
                  ELSE gps_track
                END
  WHERE id = v_execution_id;

  -- 3. Update Schedule Status to COMPLETED
  -- (This will trigger the cost calculation trigger 'calculate_transport_cost')
  UPDATE public.transport_schedules
  SET status = 'COMPLETED'
  WHERE id = p_schedule_id;

  -- 4. Return updated execution
  SELECT to_jsonb(e) INTO v_result FROM public.transport_execution e WHERE id = v_execution_id;
  
  RETURN v_result;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.finish_transport_execution(uuid, jsonb, jsonb) TO authenticated;

COMMIT;
