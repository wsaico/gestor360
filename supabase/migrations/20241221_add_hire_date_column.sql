-- Add hire_date to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hire_date DATE DEFAULT CURRENT_DATE;

-- Update RLS if necessary (usually not for adding columns unless explicit select policy)
-- No generic policy needed as long as existing policies cover 'all columns'.
