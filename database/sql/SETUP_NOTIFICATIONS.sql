-- TABLA DE CONFIGURACIÓN DEL SISTEMA
-- Almacena claves API y toggles de notificaciones
create table if not exists app_settings (
  key text primary key,
  value text,
  description text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Insertar valores por defecto (Toggles Activados por defecto, Credenciales vacías)
insert into app_settings (key, value, description) values
('BREVO_API_KEY', '', 'Clave API de Brevo (Sendinblue) para envío de correos'),
('SMTP_SENDER_EMAIL', 'no-reply@gestor360.com', 'Correo remitente que aparecerá en las notificaciones'),
('ENABLE_NOTIFICATIONS_GLOBAL', 'true', 'Interruptor maestro para activar/desactivar todo el sistema de correos'),
('ENABLE_ALERT_BIRTHDAYS', 'true', 'Activar notificaciones de Cumpleaños'),
('ENABLE_ALERT_EMO', 'true', 'Activar notificaciones de Exámenes Médicos (EMO)'),
('ENABLE_ALERT_PHOTOCHECK', 'true', 'Activar notificaciones de Vencimiento de Fotochecks'),
('ENABLE_ALERT_EPPS', 'true', 'Activar notificaciones de Renovación de EPPs'),
('ENABLE_ALERT_LOW_STOCK', 'true', 'Activar notificaciones de Stock Bajo (Inventario)')
on conflict (key) do nothing;

-- Habilitar RLS (Row Level Security)
alter table app_settings enable row level security;

-- Política: Solo Administradores pueden ver/editar configuraciones
-- Usando la tabla correcta 'system_users' detectada en authService.js

drop policy if exists "Enable read access for authenticated users" on app_settings;
drop policy if exists "Enable write access for admins only" on app_settings;

create policy "Enable read access for authenticated users" on app_settings
  for select using (auth.role() = 'authenticated');

create policy "Enable write access for admins only" on app_settings
  for all using (
    exists (
      select 1 from system_users
      where id = auth.uid() and role = 'ADMIN'
    )
  );
