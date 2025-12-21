-- Enable pgcrypto extension for password hashing functions like gen_salt and crypt
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Verify the function works (optional, but good for manual test)
-- SELECT gen_salt('bf');
