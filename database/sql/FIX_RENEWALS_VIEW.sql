-- =====================================================
-- FIX: VIEW RENEWALS PENDING
-- Excludes ceased employees from the renewal list
-- =====================================================

DROP VIEW IF EXISTS vw_renewals_pending;

CREATE VIEW vw_renewals_pending AS
SELECT
  ea.id,
  ea.station_id,
  ea.employee_id,
  ea.item_id,
  ea.delivery_id,
  ea.quantity,
  ea.size,
  ea.delivery_date,
  ea.renewal_date,
  ea.status,
  ea.renewal_notified,
  ea.notification_date,
  ea.created_at,
  ea.updated_at,
  -- Extract names for compatibility
  SPLIT_PART(e.full_name, ' ', 1) as first_name,
  SUBSTRING(e.full_name FROM POSITION(' ' IN e.full_name) + 1) as last_name,
  e.full_name,
  e.dni,
  e.role_name,
  e.role_name as area, -- Fallback to role_name if area column doesn't exist on view needed
  ei.name as item_name,
  ei.item_type,
  ei.useful_life_months,
  CURRENT_DATE - ea.renewal_date as days_overdue,
  CASE
    WHEN ea.renewal_date < CURRENT_DATE THEN 'VENCIDO'
    WHEN ea.renewal_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'POR_VENCER'
    ELSE 'VIGENTE'
  END as renewal_status
FROM employee_epp_assignments ea
JOIN employees e ON ea.employee_id = e.id
JOIN epp_items ei ON ea.item_id = ei.id
WHERE ea.status = 'ACTIVE'
  AND e.status != 'CESADO' -- CRITICAL FIX: Exclude ceased employees
  AND ea.renewal_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY ea.renewal_date ASC;
