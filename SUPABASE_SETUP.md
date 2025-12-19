# Guía de Configuración de Supabase para Gestor360°

Esta guía te ayudará a configurar Supabase como backend para el sistema Gestor360°.

## 📋 Requisitos Previos

- Cuenta de Supabase (ya creada)
- Node.js >= 16.x instalado
- Credenciales de Supabase (ya proporcionadas)

## 🔧 Paso 1: Instalar Dependencias

```bash
npm install
```

Esto instalará todas las dependencias incluyendo `@supabase/supabase-js`.

## 🗄️ Paso 2: Configurar la Base de Datos

### 2.1 Acceder al SQL Editor de Supabase

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto: **ohbwsuktgmnycsokqdja**
3. En el menú lateral, haz clic en **SQL Editor**

### 2.2 Ejecutar el Script de Creación de Tablas

1. Abre el archivo `supabase_schema.sql` de este proyecto
2. Copia todo el contenido del archivo
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **RUN** (o presiona Ctrl+Enter)

El script creará:
- ✅ 8 tablas principales (stations, system_users, employees, etc.)
- ✅ Índices para optimización
- ✅ Triggers para updated_at automático
- ✅ Políticas de seguridad (RLS)
- ✅ Datos de prueba (estaciones y empleados de ejemplo)

### 2.3 Verificar la Creación de Tablas

Ejecuta el siguiente query en el SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Deberías ver las siguientes tablas:
- audit_logs
- deliveries
- delivery_details
- employee_docs
- employees
- food_orders
- incidents
- inventory_items
- menus
- role_pricing_config
- stations
- system_settings
- system_users

## 🔐 Paso 3: Configurar la Autenticación

### 3.1 Crear Usuario de Prueba en Supabase Auth

1. Ve a **Authentication** → **Users** en el dashboard de Supabase
2. Haz clic en **Add user** → **Create new user**
3. Ingresa:
   - **Email:** `admin@gestor360.com`
   - **Password:** `admin123` (o la que prefieras)
   - **Auto Confirm User:** ✅ (marcar)
4. Haz clic en **Create user**

### 3.2 Vincular Usuario con system_users

Después de crear el usuario en Supabase Auth, necesitas vincularlo con la tabla `system_users`:

```sql
-- Obtener el UUID del usuario recién creado
SELECT id, email FROM auth.users WHERE email = 'admin@gestor360.com';

-- Actualizar el registro en system_users con el UUID correcto
-- (Reemplaza 'USUARIO_UUID_AQUI' con el UUID que obtuviste arriba)
UPDATE system_users
SET id = 'USUARIO_UUID_AQUI'
WHERE email = 'admin@gestor360.com';
```

**NOTA IMPORTANTE:** Por simplicidad en desarrollo, puedes eliminar el registro inicial y crear uno nuevo:

```sql
-- Eliminar el registro de prueba
DELETE FROM system_users WHERE email = 'admin@gestor360.com';

-- Insertar nuevo registro con el UUID correcto de Supabase Auth
INSERT INTO system_users (id, email, username, password_hash, role, station_id, is_active)
VALUES (
  'UUID_DEL_USUARIO_AUTH',  -- UUID de auth.users
  'admin@gestor360.com',
  'admin',
  'hasheado_no_usado',      -- No se usa porque autenticamos con Supabase Auth
  'ADMIN',
  NULL,                     -- NULL para Admin Global
  TRUE
);
```

## 🌐 Paso 4: Variables de Entorno

El archivo `.env` ya está configurado con tus credenciales:

```env
VITE_SUPABASE_URL=https://ohbwsuktgmnycsokqdja.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_NAME=Gestor360°
VITE_APP_VERSION=2.0.0
```

**⚠️ IMPORTANTE:** Nunca subas el archivo `.env` a Git. Ya está incluido en `.gitignore`.

## 🚀 Paso 5: Iniciar la Aplicación

```bash
npm run dev
```

La aplicación estará disponible en: **http://localhost:3000**

## 🔑 Paso 6: Iniciar Sesión

Usa las credenciales del usuario que creaste en el Paso 3:

- **Email:** `admin@gestor360.com`
- **Password:** `admin123` (o la que configuraste)

## ✅ Verificación de Funcionalidades

Después de iniciar sesión, verifica que:

1. **Dashboard** muestra KPIs reales de la base de datos
2. **Empleados** carga la lista de empleados (deberías ver los 2 empleados de prueba)
3. **Inventario SST** muestra los items de EPPs (deberías ver 3 items de prueba)

## 🛠️ Troubleshooting

### Problema: "Error al cargar empleados"

**Causa:** Las tablas no se crearon correctamente o no hay datos.

**Solución:**
1. Ve al SQL Editor
2. Ejecuta: `SELECT * FROM employees;`
3. Si no hay datos, ejecuta nuevamente la sección de "Datos de prueba" del script SQL

### Problema: "Login failed" o "Invalid credentials"

**Causa:** El usuario no fue creado en Supabase Auth o las credenciales son incorrectas.

**Solución:**
1. Ve a Authentication → Users en Supabase
2. Verifica que el usuario `admin@gestor360.com` existe
3. Si no existe, créalo siguiendo el Paso 3.1
4. Asegúrate de que "Email Confirm" esté marcado

### Problema: "Missing Supabase environment variables"

**Causa:** El archivo `.env` no existe o está mal configurado.

**Solución:**
1. Verifica que el archivo `.env` existe en la raíz del proyecto
2. Asegúrate de que las variables comiencen con `VITE_`
3. Reinicia el servidor de desarrollo (`npm run dev`)

### Problema: RLS (Row Level Security) bloquea las consultas

**Causa:** Las políticas de seguridad están muy restrictivas.

**Solución temporal para desarrollo:**
```sql
-- Deshabilitar RLS temporalmente para desarrollo
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items DISABLE ROW LEVEL SECURITY;
-- Repetir para otras tablas si es necesario
```

**⚠️ ADVERTENCIA:** Solo hacer esto en desarrollo. En producción, configurar correctamente las políticas RLS.

## 📊 Datos de Prueba Adicionales

Si necesitas más datos de prueba, puedes ejecutar estos queries:

### Agregar más empleados:

```sql
INSERT INTO employees (station_id, full_name, dni, role_name, status, uniform_size, phone, email)
SELECT
  s.id,
  'Pedro Martínez Rojas',
  '45678901',
  'Técnico',
  'ACTIVO',
  'L',
  '987654324',
  'pedro.martinez@ejemplo.com'
FROM stations s WHERE s.code = 'JAU';
```

### Agregar más items de inventario:

```sql
INSERT INTO inventory_items (station_id, name, stock_current, stock_min, lifespan_months, unit)
SELECT
  s.id,
  'Arnés de Seguridad',
  15,
  10,
  36,
  'und'
FROM stations s WHERE s.code = 'JAU';
```

## 🔄 Multi-Tenancy: Filtrado por Estación

El sistema está configurado para que cada usuario solo vea datos de su estación asignada:

- **Admin Global** (sin `station_id`): Ve TODAS las estaciones
- **Otros roles** (con `station_id`): Solo ven su estación

Esto se maneja automáticamente en los servicios:

```javascript
// Ejemplo en employeeService.js
async getAll(stationId = null) {
  let query = supabase.from('employees').select('*')

  if (stationId) {
    query = query.eq('station_id', stationId)  // Filtro automático
  }

  return query
}
```

## 📱 Próximos Pasos

Una vez que todo funcione:

1. **Agregar más estaciones** desde el módulo de Administración (cuando esté completo)
2. **Crear usuarios adicionales** para diferentes roles (Supervisor, Monitor, Proveedor)
3. **Configurar RLS adecuadamente** para producción
4. **Implementar módulos pendientes** (Entregas EPP, Incidentes, Alimentación)

## 🆘 Soporte

Si tienes problemas con la configuración:

1. Revisa los logs del navegador (F12 → Console)
2. Revisa los logs de Supabase (Dashboard → Logs)
3. Verifica que todas las tablas existan
4. Asegúrate de que el usuario esté correctamente vinculado

---

**Configuración completada exitosamente** ✅

Tu sistema Gestor360° ahora está conectado a Supabase y listo para usar en localhost:3000
