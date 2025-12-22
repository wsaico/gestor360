-- Ensure notification settings exist
INSERT INTO public.app_settings (key, value, description)
VALUES
    ('ENABLE_NOTIFICATIONS_GLOBAL', 'true', 'Master switch for email notifications'),
    ('ENABLE_ALERT_LOW_STOCK', 'true', 'Enable low stock alerts'),
    ('ENABLE_ALERT_EPPS', 'true', 'Enable EPP renewal alerts'),
    ('ENABLE_ALERT_BIRTHDAYS', 'true', 'Enable birthday alerts'),
    ('ENABLE_ALERT_EMO', 'true', 'Enable EMO expiration alerts'),
    ('ENABLE_ALERT_PHOTOCHECK', 'true', 'Enable Photocheck expiration alerts')
ON CONFLICT (key) DO NOTHING;
