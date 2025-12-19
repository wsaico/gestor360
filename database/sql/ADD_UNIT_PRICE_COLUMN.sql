-- Add unit_price column to epp_items if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epp_items' AND column_name = 'unit_price') THEN 
        ALTER TABLE public.epp_items ADD COLUMN unit_price DECIMAL(10,2) DEFAULT 0; 
    END IF; 
END $$;
