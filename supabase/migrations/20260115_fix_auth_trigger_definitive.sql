-- Fix Auth Trigger to run AFTER INSERT and robust function
-- See task: Debugging Login Failure (Registration Error)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_username text;
  v_role text;
  v_station_id uuid;
BEGIN
  -- Extract values from metadata, with fallbacks
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', NEW.email);
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'OPERATOR');
  
  -- Handle station_id safely
  BEGIN
    v_station_id := (NEW.raw_user_meta_data->>'station_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_station_id := NULL;
  END;

  -- Insert into system_users
  -- Uses ON CONFLICT just in case, but usually this is a fresh insert
  INSERT INTO public.system_users (id, email, username, role, station_id, is_active, password_hash)
  VALUES (
    NEW.id,
    NEW.email,
    v_username,
    v_role,
    v_station_id,
    true,
    'managed_by_supabase_auth'
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    station_id = EXCLUDED.station_id,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Ensure trigger is created and runs AFTER INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
