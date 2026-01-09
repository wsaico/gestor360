ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS lat double precision,
ADD COLUMN IF NOT EXISTS lng double precision;
