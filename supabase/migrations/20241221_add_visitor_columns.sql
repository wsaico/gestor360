-- Add visitor columns to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS is_visitor BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS visitor_discount_type TEXT DEFAULT 'STANDARD'; -- 'STANDARD' (subsidy), 'NONE' (full price), 'COURTESY' (free)

COMMENT ON COLUMN employees.visitor_discount_type IS 'Rules: STANDARD=Apply Subsidy, NONE=Full Price (User), COURTESY=Free (Company Pays)';
