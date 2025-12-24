-- Ver el USING clause de cada política para identificar cuál está fallando
SELECT 
    policyname,
    cmd,
    qual::text as using_clause,
    with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'employees'
ORDER BY policyname;
