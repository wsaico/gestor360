-- Add 'responsible' column to epp_items if it doesn't exist
-- This field allows tracking the person responsible for the record or the item.

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epp_items' AND column_name = 'responsible') THEN 
        ALTER TABLE public.epp_items ADD COLUMN responsible TEXT; 
    END IF; 
END $$;
