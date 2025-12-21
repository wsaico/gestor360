-- Add station_id to announcements table
alter table public.announcements 
add column if not exists station_id uuid references public.stations(id);

-- Update RLS policies to respect station access?
-- Existing policy "Admins can manage" uses system_users check.
-- We might want to restrict Station Admins to only Create/Edit their own station's announcements.
-- But for now, the UI logic is sufficient, database constraint references stations.

-- Index for performance
create index if not exists announcements_station_id_idx on public.announcements(station_id);
