-- Add 'recognition' to the allowed priority values
ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_priority_check;
ALTER TABLE public.announcements ADD CONSTRAINT announcements_priority_check CHECK (priority IN ('high', 'medium', 'low', 'recognition'));
