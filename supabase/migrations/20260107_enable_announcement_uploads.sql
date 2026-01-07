-- Enable Announcements Uploads (Robust Version)

-- 1. Create Bucket (Idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcements', 'announcements', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop existing policies to avoid conflicts or errors on re-run
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;

-- 3. Re-create Policies

-- Allow public access to view files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'announcements' );

-- Allow authenticated users to upload (INSERT uses WITH CHECK)
CREATE POLICY "Auth Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'announcements' );

-- Allow authenticated users to update (UPDATE uses USING)
CREATE POLICY "Auth Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'announcements' );

-- Allow authenticated users to delete (DELETE uses USING)
CREATE POLICY "Auth Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'announcements' );

-- 4. Update Table Constraints for PDF support
ALTER TABLE public.announcements 
DROP CONSTRAINT IF EXISTS announcements_media_type_check;

ALTER TABLE public.announcements 
ADD CONSTRAINT announcements_media_type_check 
CHECK (media_type IN ('image', 'video', 'text', 'pdf'));
