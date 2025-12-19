# ✅ Configuración Completa de Gestor360° con Supabase

## 🎉 Estado: LISTO PARA USAR

Tu proyecto **Gestor360°** está completamente configurado y listo para ejecutarse en localhost:3000.

---

## 📦 Lo que se ha configurado:

### ✅ 1. Dependencias Instaladas
- React 18.3
- Vite 5.4
- TailwindCSS 3.4
- Supabase JS Client 2.39
- React Router DOM 6
- Axios, Lucide React, date-fns, jwt-decode

**Total:** 401 paquetes instalados correctamente

### ✅ 2. Configuración de Supabase
- **Cliente configurado** en `src/services/supabase.js`
- **URL:** https://ohbwsuktgmnycsokqdja.supabase.co
- **Anon Key:** Configurada en `.env`
- **Variables de entorno:** Listas en `.env`

### ✅ 3. Base de Datos SQL
- **Script SQL creado:** `supabase_schema.sql`
- **14 tablas definidas:** stations, employees, inventory_items, etc.
- **Datos de prueba incluidos:** 2 estaciones, 2 empleados, 3 items de inventario
- **Triggers y funciones:** updated_at automático
- **RLS configurado:** Seguridad a nivel de filas

### ✅ 4. Servicios de Backend
- `authService.js` - Autenticación con Supabase Auth
- `employeeService.js` - CRUD de empleados
- `inventoryService.js` - CRUD de inventario
- `dashboardService.js` - KPIs en tiempo real

### ✅ 5. Páginas Actualizadas
- **Dashboard:** Conectado a Supabase (KPIs reales)
- **Empleados:** Lista y gestión desde BD real
- **Inventario SST:** Control de EPPs desde BD real
- **Login:** Autenticación con Supabase Auth

---

## 🚀 PRÓXIMOS PASOS (Antes de usar):

### Paso 1: Configurar Base de Datos en Supabase (5 minutos)

1. Ve a https://supabase.com/dashboard
2. Proyecto: **ohbwsuktgmnycsokqdja**
3. Ve a **SQL Editor**
4. Abre el archivo `supabase_schema.sql`
5. Copia TODO el contenido
6. Pega en el SQL Editor
7. Haz clic en **RUN** (o Ctrl+Enter)
8. Espera a que termine (verás mensaje de éxito)

### Paso 2: Crear Usuario de Prueba (2 minutos)

1. En Supabase, ve a **Authentication** → **Users**
2. Haz clic en **Add user** → **Create new user**
3. Completa:
   - Email: `admin@gestor360.com`
   - Password: `admin123`
   - ✅ Marca: **Auto Confirm User**
4. Haz clic en **Create user**

### Paso 3: Vincular Usuario (IMPORTANTE)

Después de crear el usuario en Auth, necesitas vincularlo con `system_users`:

```sql
-- 1. Obtener el UUID del usuario creado
SELECT id, email FROM auth.users WHERE email = 'admin@gestor360.com';

-- 2. Copiar el UUID que aparece
-- 3. Eliminar el registro de prueba
DELETE FROM system_users WHERE email = 'admin@gestor360.com';

-- 4. Insertar con el UUID correcto (reemplaza 'UUID_AQUI')
INSERT INTO system_users (id, email, username, password_hash, role, station_id, is_active)
VALUES (
  'UUID_AQUI',  -- ← Pega aquí el UUID del paso 1
  'admin@gestor360.com',
  'admin',
  'no_usado',
  'ADMIN',
  NULL,
  TRUE
);
```

### Paso 4: Iniciar la Aplicación

```bash
npm run dev
```

### Paso 5: Abrir en el Navegador

Abre: **http://localhost:3000**

**Credenciales:**
- Email: `admin@gestor360.com`
- Password: `admin123`

---

## 🎯 ¿Qué verás después de iniciar sesión?

### Dashboard
- KPIs de empleados (total, activos, cesados)
- KPIs de SST (inventario, stock bajo, entregas)
- KPIs de alimentación
- Alertas y actividad reciente

### Módulo RRHH → Empleados
- Lista de 2 empleados de prueba (Juan Pérez, María García)
- Búsqueda y filtros
- Ver detalle, editar, marcar como cesado

### Módulo SST → Inventario
- Lista de 3 items de EPPs (Casco, Guantes, Chaleco)
- Semáforo de stock (verde/amarillo/rojo)
- Alertas de stock bajo

---

## 📊 Datos de Prueba Incluidos

El script SQL incluye automáticamente:

### Estaciones:
- **Estación Jauja** (código: JAU)
- **Estación Pisco** (código: PIS)

### Empleados (en Jauja):
- **Juan Carlos Pérez García** - Operario (DNI: 12345678)
- **María Isabel García López** - Supervisor (DNI: 23456789)

### Inventario (en Jauja):
- **Casco de Seguridad** - 45 unidades (stock normal)
- **Guantes de Seguridad** - 5 pares (stock bajo ⚠️)
- **Chaleco Reflectivo** - 30 unidades (stock normal)

---

## 🔧 Comandos Útiles

```bash
# Iniciar desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Linting
npm run lint
```

---

## 📁 Archivos Clave

| Archivo | Descripción |
|---------|-------------|
| `.env` | Variables de entorno (Supabase URL y Key) |
| `supabase_schema.sql` | Script SQL completo |
| `src/services/supabase.js` | Cliente de Supabase |
| `src/services/authService.js` | Autenticación |
| `src/services/employeeService.js` | Servicio de empleados |
| `src/services/inventoryService.js` | Servicio de inventario |
| `src/services/dashboardService.js` | Servicio de dashboard |

---

## 🆘 Troubleshooting Rápido

### ❌ Error: "Missing Supabase environment variables"

**Solución:** Verifica que el archivo `.env` existe y contiene:
```
VITE_SUPABASE_URL=https://ohbwsuktgmnycsokqdja.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

### ❌ Error: "Login failed"

**Solución:**
1. Verifica que creaste el usuario en Supabase Auth
2. Verifica que marcaste "Auto Confirm User"
3. Verifica que vinculaste el UUID correctamente (Paso 3)

### ❌ Error: "Error al cargar empleados"

**Solución:**
1. Ejecutaste el script SQL completo?
2. Verifica en SQL Editor: `SELECT * FROM employees;`
3. Si está vacío, ejecuta nuevamente `supabase_schema.sql`

### ❌ No hay datos en el Dashboard

**Solución:** Los datos dependen de la base de datos. Verifica que:
- Las tablas existan
- Haya datos de prueba insertados
- El usuario tenga `station_id` correcto (o NULL para Admin)

---

## 📚 Documentación Adicional

- **[INSTRUCCIONES_INICIO.md](INSTRUCCIONES_INICIO.md)** - Guía rápida de inicio
- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** - Guía detallada de Supabase
- **[README.md](README.md)** - Documentación técnica completa
- **[PROYECTO_COMPLETO.md](PROYECTO_COMPLETO.md)** - Resumen del proyecto

---

## ✨ Funcionalidades Implementadas

- ✅ Autenticación JWT con Supabase Auth
- ✅ Multi-Tenancy (filtrado automático por estación)
- ✅ RBAC (control de acceso por roles)
- ✅ Dashboard con KPIs reales
- ✅ Módulo RRHH completo (empleados)
- ✅ Módulo SST - Inventario con semáforo
- ✅ Sidebar dinámico según roles
- ✅ Layout responsive

---

## 🎊 ¡Todo Listo!

Una vez completados los 5 pasos, tu aplicación estará funcionando completamente en **localhost:3000** con:

✅ Base de datos configurada
✅ Usuario administrador creado
✅ Datos de prueba cargados
✅ Frontend conectado a Supabase
✅ Autenticación funcionando
✅ CRUD de empleados e inventario

**Desarrollado por:** Wilber Saico
**Web:** [wsaico.com](https://wsaico.com)
**Versión:** 2.0.0

---

**¿Dudas?** Revisa [SUPABASE_SETUP.md](SUPABASE_SETUP.md) para más detalles.
