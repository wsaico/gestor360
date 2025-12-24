-- Verificar si HAY empleados en la base de datos
SELECT 
    COUNT(*) as total_employees,
    station_id,
    (SELECT name FROM stations WHERE id = employees.station_id) as station_name
FROM employees
GROUP BY station_id
ORDER BY total_employees DESC;

-- Ver empleados de Jauja específicamente
SELECT id, full_name, dni, station_id
FROM employees
WHERE station_id = (SELECT id FROM stations WHERE code = 'JAU')
LIMIT 10;

-- Ver el ID de la estación Jauja
SELECT id, code, name FROM stations WHERE code = 'JAU';
