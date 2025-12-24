-- FUNCTION: delete_user_by_id
-- OBJECTIVE: Allow deletion of a user from auth.users (for rollback) via RPC
-- SECURITY: Restricted to ADMIN role only.

CREATE OR REPLACE FUNCTION public.delete_user_by_id(user_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if executing user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.system_users 
    WHERE id = auth.uid() 
    AND role IN ('SUPERADMIN', 'ADMIN')
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only Admins can delete users';
  END IF;

  -- Delete from public.employees first (cascade should handle it, but being explicit)
  DELETE FROM public.employees WHERE id = user_id;

  -- Delete from auth.users (requires special privileges usually not available to postgres user unless supabase_admin)
  -- NOTE: In Supabase, deleting from auth.users via SQL is possible if the role has permissions.
  -- Better approach: calling Supabase Admin API. But via SQL:
  
  DELETE FROM auth.users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
