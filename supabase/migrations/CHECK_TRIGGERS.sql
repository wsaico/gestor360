-- SCRIPT: CHECK_TRIGGERS.sql
-- OBJECTIVE: List all triggers on employees table to find hidden permission checks
-- DATE: 2025-12-24

SELECT 
    event_object_table as table_name,
    trigger_name,
    event_manipulation as event,
    action_statement as definition
FROM information_schema.triggers
WHERE event_object_table = 'employees';
