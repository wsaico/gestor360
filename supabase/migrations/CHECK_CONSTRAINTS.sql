-- SCRIPT: CHECK_CONSTRAINTS.sql
-- OBJECTIVE: Verify Foreign Keys on employees.id to see if it MUST be an Auth User.
-- DATE: 2025-12-24

-- 1. FOREIGN KEYS ON EMPLOYEES
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'employees';

-- 2. TRIGGERS ON EMPLOYEES
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'employees';

-- 3. PRIMARY KEY TYPE
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'employees' AND column_name = 'id';
