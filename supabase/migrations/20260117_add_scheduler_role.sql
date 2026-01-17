-- MIGRATION: 20260117_add_scheduler_role.sql
-- PURPOSE: Add TRANSPORT_SCHEDULER role for restricted transport management

INSERT INTO public.app_roles (name, label, description, is_system, permissions)
VALUES 
  ('TRANSPORT_SCHEDULER', 'Programador de Transporte', 'Acceso para programar servicios de transporte sin visualización de costos', true, '["OPERATIONS_VIEW", "OPERATIONS_EDIT"]')
ON CONFLICT (name) DO NOTHING;
