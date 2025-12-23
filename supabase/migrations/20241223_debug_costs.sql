-- DEBUG SCRIPT: Check Routes vs Schedules Costs
-- Run this and check the output to see why costs are 0

SELECT 
    s.id as schedule_id,
    s.status,
    s.cost as schedule_cost,
    r.id as route_id,
    r.name as route_name,
    r.default_price as route_price,
    r.organization_id
FROM public.transport_schedules s
JOIN public.transport_routes r ON s.route_id = r.id
WHERE s.scheduled_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY s.scheduled_date DESC
LIMIT 20;

-- IF route_price is NULL or 0, then the update script worked correctly (it set 0 because source was 0).
-- You need to UPDATE transport_routes first.
