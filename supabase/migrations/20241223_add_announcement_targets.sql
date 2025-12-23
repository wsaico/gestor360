-- Add display_targets column to announcements table
-- Allows selecting where announcements are displayed (Board, Food Kiosk, Driver Kiosk)

ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS display_targets TEXT[] DEFAULT ARRAY['BOARD', 'FOOD_KIOSK', 'DRIVER_KIOSK'];

-- Add comment for documentation
COMMENT ON COLUMN public.announcements.display_targets IS 'Dónde se mostrará el anuncio: BOARD (Panel Principal), FOOD_KIOSK (Kiosko de Comida), DRIVER_KIOSK (Kiosko de Conductor)';

-- Update existing announcements to have all targets (backward compatibility)
UPDATE public.announcements
SET display_targets = ARRAY['BOARD', 'FOOD_KIOSK', 'DRIVER_KIOSK']
WHERE display_targets IS NULL OR array_length(display_targets, 1) IS NULL;
