-- Enable the storage extension if not already enabled
-- create extension if not exists "uuid-ossp";

-- Create a new private bucket called 'settings'
insert into storage.buckets (id, name, public)
values ('settings', 'settings', true);

-- Policy to allow authenticated users to upload files
create policy "Allow authenticated uploads"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'settings' );

-- Policy to allow public to view files (since it's for logos)
create policy "Allow public viewing"
on storage.objects for select
to public
using ( bucket_id = 'settings' );

-- Policy to allow authenticated users to update/delete their uploads (optional, good for management)
create policy "Allow authenticated updates"
on storage.objects for update
to authenticated
using ( bucket_id = 'settings' );
