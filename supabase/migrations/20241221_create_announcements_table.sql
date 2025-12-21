-- Create announcements table
create table if not exists public.announcements (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  message text not null,
  start_date date not null default current_date,
  end_date date not null default current_date,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id)
);

-- Enable RLS
alter table public.announcements enable row level security;

-- Policies

-- 1. All users (authenticated and anonymous) can read ACTIVE announcements
-- We'll allow Select for everyone. The frontend filters by date/active.
create policy "Anyone can read announcements"
  on public.announcements for select
  using ( true );

-- 2. Only Admins/Providers/Supervisors can Insert/Update/Delete
-- They must exist in system_users with the correct role.
create policy "Admins can manage announcements"
  on public.announcements for all
  using ( 
    auth.uid() in (
      select id from public.system_users 
      where role in ('ADMIN', 'SUPERADMIN', 'PROVIDER', 'SUPERVISOR')
    )
  );

-- Grant permissions
grant select on public.announcements to authenticated, anon;
grant all on public.announcements to authenticated;
