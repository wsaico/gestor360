# 🚀 Cómo Iniciar Gestor360° en localhost:3000

Guía rápida para poner en funcionamiento el sistema.

## 📋 Requisitos

- Node.js >= 16.x
- npm >= 8.x
- Cuenta de Supabase (ya configurada)

## ⚡ Inicio Rápido (3 pasos)

### 1️⃣ Instalar Dependencias

```bash
npm install
```

### 2️⃣ Configurar Supabase

**IMPORTANTE:** Antes de iniciar, debes configurar la base de datos en Supabase:

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto: **ohbwsuktgmnycsokqdja**
3. Ve a **SQL Editor**
4. Copia y pega el contenido de `supabase_schema.sql`
5. Ejecuta el script (botón RUN o Ctrl+Enter)

**Crear usuario de prueba:**

1. Ve a **Authentication** → **Users**
2. Haz clic en **Add user** → **Create new user**
3. Email: `admin@gestor360.com`
4. Password: `admin123`
5. Marca: **Auto Confirm User** ✅
6. Haz clic en **Create user**

### 3️⃣ Iniciar la Aplicación

```bash
npm run dev
```

## ✅ ¡Listo!

Abre tu navegador en: **http://localhost:3000**

**Credenciales de acceso:**
- Email: `admin@gestor360.com`
- Password: `admin123`

## 📁 Archivos Importantes

- `.env` - Variables de entorno (YA CONFIGURADO)
- `supabase_schema.sql` - Script SQL para crear tablas
- `SUPABASE_SETUP.md` - Guía detallada de configuración

## 🆘 ¿Problemas?

### Error: "Missing Supabase environment variables"

El archivo `.env` ya está creado. Si no lo ves, verifica que estás en la carpeta correcta:

```bash
pwd  # Debe mostrar: e:\WILLY\Gestor360
ls -la .env  # Debe mostrar el archivo .env
```

### Error: "Login failed"

1. Verifica que creaste el usuario en Supabase Auth (Paso 2)
2. Asegúrate de marcar "Auto Confirm User"
3. Usa las credenciales exactas: `admin@gestor360.com` / `admin123`

### Error: "Error al cargar empleados"

1. Verifica que ejecutaste el script SQL completo
2. Ve al SQL Editor de Supabase y ejecuta:
   ```sql
   SELECT * FROM employees;
   ```
3. Si está vacío, ejecuta nuevamente el script `supabase_schema.sql`

### La página carga pero no hay datos

Ejecuta este query en el SQL Editor para agregar datos de prueba:

```sql
-- Insertar empleado de prueba
INSERT INTO employees (station_id, full_name, dni, role_name, status, uniform_size, phone, email)
SELECT
  s.id,
  'Juan Pérez',
  '12345678',
  'Operario',
  'ACTIVO',
  'M',
  '987654321',
  'juan.perez@ejemplo.com'
FROM stations s WHERE s.code = 'JAU'
ON CONFLICT (station_id, dni) DO NOTHING;
```

## 📚 Documentación Completa

- [SUPABASE_SETUP.md](SUPABASE_SETUP.md) - Guía detallada de Supabase
- [README.md](README.md) - Documentación técnica completa
- [PROYECTO_COMPLETO.md](PROYECTO_COMPLETO.md) - Resumen del proyecto

## 🎯 Módulos Disponibles

Una vez que inicies sesión, tendrás acceso a:

- ✅ **Dashboard** - KPIs en tiempo real
- ✅ **Recursos Humanos** - Gestión de empleados
- ✅ **SST - Inventario** - Control de EPPs
- 🚧 **SST - Entregas** - En desarrollo
- 🚧 **SST - Incidentes** - En desarrollo
- 🚧 **Alimentación** - En desarrollo
- 🚧 **Administración** - En desarrollo

---

## 🎉 ¡Disfruta de Gestor360°!

Si todo salió bien, deberías ver:
1. Página de login en localhost:3000
2. Dashboard con KPIs después de iniciar sesión
3. Lista de empleados en el módulo de RRHH
4. Inventario de EPPs en el módulo SST

**Desarrollado por Wilber Saico** | [wsaico.com](https://wsaico.com)
