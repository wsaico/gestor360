-- Fix for announcements showing everywhere
-- This updates any announcements that have NULL or empty display_targets
-- to have all targets (backward compatibility)

UPDATE public.announcements
SET display_targets = ARRAY['BOARD', 'FOOD_KIOSK', 'DRIVER_KIOSK']
WHERE display_targets IS NULL 
   OR array_length(display_targets, 1) IS NULL
   OR array_length(display_targets, 1) = 0;

-- Verify the update
SELECT id, title, display_targets 
FROM public.announcements
ORDER BY created_at DESC;
