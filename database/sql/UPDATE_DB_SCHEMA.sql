-- Drop Brand and Model columns from epp_items if they exist
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epp_items' AND column_name = 'brand') THEN 
        ALTER TABLE public.epp_items DROP COLUMN brand; 
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epp_items' AND column_name = 'model') THEN 
        ALTER TABLE public.epp_items DROP COLUMN model; 
    END IF;
END $$;
