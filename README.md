# Gestor360° Enterprise - Frontend

Sistema SaaS Multi-Sucursal para Gestión Operativa, RRHH y SST.

**Versión:** 2.0.0
**Autor:** Wilber Saico ([wsaico.com](https://wsaico.com))

## Tabla de Contenidos

- [Características](#características)
- [Tecnologías](#tecnologías)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Arquitectura](#arquitectura)
- [Módulos Implementados](#módulos-implementados)
- [Sistema de Seguridad](#sistema-de-seguridad)
- [Rutas y Navegación](#rutas-y-navegación)
- [Desarrollo](#desarrollo)
- [Build y Deploy](#build-y-deploy)

## Características

- **Multi-Tenancy**: Soporte para múltiples estaciones con aislamiento estricto de datos
- **Autenticación JWT**: Sistema seguro de autenticación con tokens de acceso y refresh
- **RBAC (Role-Based Access Control)**: Control de acceso basado en roles (Admin, Supervisor, Monitor, Proveedor)
- **Dashboard Inteligente**: KPIs en tiempo real filtrados por estación
- **Módulo RRHH**: Gestión completa de empleados con estados y alertas de documentos
- **Módulo SST**: Inventario de EPPs con semáforo de vencimientos y alertas
- **Responsive Design**: Interfaz adaptable a todos los dispositivos
- **UI Moderna**: Diseño limpio con TailwindCSS y componentes reutilizables

## Tecnologías

### Frontend
- **React 18.3** - Biblioteca de UI
- **Vite 5.4** - Build tool y dev server
- **React Router DOM 6** - Enrutamiento
- **TailwindCSS 3.4** - Framework CSS utility-first
- **Lucide React** - Iconos
- **date-fns 3.0** - Manipulación de fechas

### Backend
- **Supabase** - Backend as a Service (BaaS)
  - PostgreSQL Database
  - Authentication (JWT)
  - Row Level Security (RLS)
  - Real-time subscriptions
- **@supabase/supabase-js 2.39** - Cliente de Supabase

## Instalación

### Prerrequisitos

- Node.js >= 16.x
- npm >= 8.x o yarn >= 1.22

### Pasos

1. Instalar dependencias:
```bash
npm install
```

2. El archivo `.env` ya está configurado con las credenciales de Supabase:
```env
VITE_SUPABASE_URL=https://ohbwsuktgmnycsokqdja.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
VITE_APP_NAME=Gestor360°
VITE_APP_VERSION=2.0.0
```

3. Configurar la base de datos en Supabase:
   - Ve a [Supabase Dashboard](https://supabase.com/dashboard)
   - Abre el SQL Editor
   - Ejecuta el contenido de `supabase_schema.sql`
   - Ver guía completa en [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

4. Crear usuario de prueba en Supabase Auth:
   - Email: `admin@gestor360.com`
   - Password: `admin123`
   - Ver instrucciones detalladas en [INSTRUCCIONES_INICIO.md](INSTRUCCIONES_INICIO.md)

5. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

**📚 Documentación de configuración:**
- [INSTRUCCIONES_INICIO.md](INSTRUCCIONES_INICIO.md) - Guía rápida de inicio
- [SUPABASE_SETUP.md](SUPABASE_SETUP.md) - Configuración detallada de Supabase
- [CONFIGURACION_COMPLETA.md](CONFIGURACION_COMPLETA.md) - Resumen completo

## Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase | `https://ohbwsuktgmnycsokqdja.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima de Supabase | Ver archivo `.env` |
| `VITE_APP_NAME` | Nombre de la aplicación | `Gestor360°` |
| `VITE_APP_VERSION` | Versión de la aplicación | `2.0.0` |

### Configuración del Proxy (Vite)

El archivo `vite.config.js` incluye un proxy configurado para `/api`:

```javascript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true
    }
  }
}
```

## Estructura del Proyecto

```
Gestor360/
├── public/                 # Archivos públicos estáticos
├── src/
│   ├── components/        # Componentes reutilizables
│   │   ├── layout/       # Componentes de layout (Sidebar, Header)
│   │   └── ProtectedRoute.jsx
│   ├── contexts/         # Contextos de React (AuthContext)
│   ├── pages/            # Páginas de la aplicación
│   │   ├── auth/        # Login y autenticación
│   │   ├── dashboard/   # Dashboard principal
│   │   ├── rrhh/        # Módulo de Recursos Humanos
│   │   ├── sst/         # Módulo de SST
│   │   ├── alimentacion/# Módulo de Alimentación
│   │   ├── admin/       # Módulo de Administración
│   │   └── errors/      # Páginas de error (404, 403)
│   ├── routes/          # Configuración de rutas
│   ├── services/        # Servicios (API, Auth)
│   ├── utils/           # Utilidades y helpers
│   │   ├── constants.js # Constantes de la aplicación
│   │   └── helpers.js   # Funciones helper
│   ├── App.jsx          # Componente raíz
│   ├── main.jsx         # Punto de entrada
│   └── index.css        # Estilos globales
├── .env.example         # Ejemplo de variables de entorno
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.js   # Configuración de TailwindCSS
└── vite.config.js       # Configuración de Vite
```

## Arquitectura

### Flujo de Autenticación

1. El usuario ingresa credenciales en `/login`
2. `authService.login()` envía las credenciales a la API
3. La API devuelve `accessToken`, `refreshToken`, `user` y `station`
4. Los tokens se guardan en `localStorage`
5. `AuthContext` actualiza el estado global de autenticación
6. El usuario es redirigido al dashboard

### Interceptores de Axios

El cliente API incluye dos interceptores:

**Request Interceptor:**
- Inyecta el `Authorization` header con el token JWT
- Inyecta el `X-Station-Id` header para multi-tenancy (excepto para Admin global)

**Response Interceptor:**
- Detecta errores 401 (token expirado)
- Intenta refrescar el token automáticamente
- Si falla, limpia la sesión y redirige al login

### Multi-Tenancy

Todas las peticiones a la API incluyen automáticamente el `station_id` del usuario logueado en el header `X-Station-Id`. El backend debe usar este valor para filtrar los datos.

**Excepción:** Los usuarios con rol `ADMIN` sin `station_id` asignado (Admin Global) no envían este header y tienen acceso a todas las estaciones.

## Módulos Implementados

### 1. Dashboard
- **Ruta:** `/dashboard`
- **Roles:** Todos
- **Características:**
  - KPIs de RRHH (empleados activos/cesados)
  - KPIs de SST (inventario, entregas, incidentes)
  - KPIs de Alimentación (pedidos, costos)
  - Alertas recientes
  - Actividad reciente

### 2. Recursos Humanos
- **Ruta:** `/rrhh/empleados`
- **Roles:** Admin, Supervisor
- **Características:**
  - Lista de empleados con búsqueda y filtros
  - CRUD de empleados
  - Manejo de estados (Activo/Cesado)
  - Gestión de documentos con alertas de vencimiento
  - Vista de detalle de empleado

### 3. SST (Seguridad y Salud en el Trabajo)
- **Ruta:** `/sst/inventario`
- **Roles:** Admin, Supervisor, Monitor
- **Características:**
  - Inventario de EPPs
  - Semáforo de stock (verde/amarillo/rojo)
  - Alertas de stock bajo
  - Gestión de entregas de EPPs (en desarrollo)
  - Registro de incidentes (en desarrollo)

### 4. Alimentación
- **Rutas:** `/alimentacion/menus`, `/alimentacion/pedidos`, `/alimentacion/tarifas`
- **Roles:** Varía según submódulo
- **Características:** (en desarrollo)
  - Gestión de menús diarios
  - Registro de pedidos
  - Configuración de tarifas por cargo

### 5. Administración
- **Rutas:** `/admin/estaciones`, `/admin/usuarios`, `/admin/configuracion`
- **Roles:** Solo Admin
- **Características:** (en desarrollo)
  - Gestión de estaciones/sucursales
  - ABM de usuarios del sistema
  - Configuración de SMTP y sistema

## Sistema de Seguridad

### Roles Disponibles

| Rol | Código | Descripción |
|-----|--------|-------------|
| Administrador | `ADMIN` | Acceso completo al sistema |
| Supervisor | `SUPERVISOR` | Gestión de RRHH y SST |
| Monitor | `MONITOR` | Solo lectura en SST |
| Proveedor | `PROVIDER` | Gestión de menús de alimentación |

### Protección de Rutas

Las rutas están protegidas usando el componente `ProtectedRoute`:

```jsx
<Route
  path="rrhh/empleados"
  element={
    <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR]}>
      <EmployeesPage />
    </ProtectedRoute>
  }
/>
```

### Sidebar Dinámico

El sidebar muestra solo las opciones de menú permitidas según el rol del usuario:

```javascript
const menuItems = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.MONITOR, ROLES.PROVIDER]
  },
  {
    title: 'Recursos Humanos',
    roles: [ROLES.ADMIN, ROLES.SUPERVISOR],
    children: [...]
  }
]
```

## Rutas y Navegación

### Rutas Públicas
- `/login` - Página de inicio de sesión

### Rutas Protegidas

| Ruta | Roles | Descripción |
|------|-------|-------------|
| `/dashboard` | Todos | Dashboard principal |
| `/rrhh/empleados` | Admin, Supervisor | Lista de empleados |
| `/rrhh/empleados/:id` | Admin, Supervisor | Detalle de empleado |
| `/sst/inventario` | Admin, Supervisor, Monitor | Inventario de EPPs |
| `/sst/entregas` | Admin, Supervisor, Monitor | Entregas de EPPs |
| `/sst/incidentes` | Admin, Supervisor | Incidentes SST |
| `/alimentacion/menus` | Admin, Supervisor, Provider | Gestión de menús |
| `/alimentacion/pedidos` | Admin, Supervisor | Pedidos de alimentos |
| `/alimentacion/tarifas` | Admin, Supervisor | Tarifas por cargo |
| `/admin/estaciones` | Admin | Gestión de estaciones |
| `/admin/usuarios` | Admin | Gestión de usuarios |
| `/admin/configuracion` | Admin | Configuración del sistema |

### Rutas de Error
- `/unauthorized` - Error 403 (Acceso denegado)
- `*` - Error 404 (Página no encontrada)

## Desarrollo

### Comandos Disponibles

```bash
# Desarrollo
npm run dev          # Inicia el servidor de desarrollo

# Build
npm run build        # Genera el build de producción

# Preview
npm run preview      # Preview del build de producción

# Linting
npm run lint         # Ejecuta ESLint
```

### Convenciones de Código

- **Componentes:** PascalCase (`EmployeesPage.jsx`)
- **Hooks:** camelCase con prefijo `use` (`useAuth`)
- **Utilidades:** camelCase (`formatDate`, `validateDNI`)
- **Constantes:** UPPER_SNAKE_CASE (`EMPLOYEE_STATUS`, `ROLES`)
- **Estilos:** Utility classes de TailwindCSS

### Componentes Reutilizables

El proyecto incluye clases CSS utilitarias predefinidas:

```jsx
// Botones
<button className="btn btn-primary btn-md">Guardar</button>
<button className="btn btn-secondary btn-sm">Cancelar</button>

// Inputs
<input className="input" type="text" />

// Cards
<div className="card">Contenido</div>

// Badges
<span className="badge badge-success">Activo</span>
<span className="badge badge-warning">Pendiente</span>
<span className="badge badge-danger">Vencido</span>
```

## Build y Deploy

### Build de Producción

```bash
npm run build
```

Los archivos generados estarán en la carpeta `dist/`

### Deploy en Vercel

```bash
npm install -g vercel
vercel
```

### Deploy en Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Variables de Entorno en Producción

Asegúrate de configurar las siguientes variables en tu plataforma de hosting:

- `VITE_API_BASE_URL` - URL de la API en producción
- `VITE_APP_NAME` - Nombre de la aplicación
- `VITE_APP_VERSION` - Versión actual

## Próximas Implementaciones

### Backend (Node.js + PostgreSQL)

1. **Configuración inicial:**
   - Setup de Express/NestJS
   - Conexión a PostgreSQL
   - Migrations con las tablas del schema

2. **Autenticación:**
   - Endpoint `/auth/login`
   - Endpoint `/auth/refresh`
   - Middleware de validación JWT

3. **Endpoints Multi-Tenant:**
   - Middleware de inyección de `station_id`
   - CRUD de todas las entidades
   - Validaciones y reglas de negocio

4. **Funcionalidades Avanzadas:**
   - Generación de PDFs (Actas de entrega)
   - Envío de correos (alertas SMTP)
   - Logs de auditoría
   - Reportes y exportaciones

### Frontend Pendiente

- Módulos de Alimentación completos
- Módulos de Administración completos
- Generación de reportes en PDF
- Sistema de notificaciones en tiempo real
- Firma digital para entregas de EPPs
- Modo oscuro (dark mode)

## Soporte y Contacto

Para preguntas, sugerencias o reportar problemas:

**Autor:** Wilber Saico
**Web:** [wsaico.com](https://wsaico.com)
**Email:** [contacto en wsaico.com]

## Licencia

Todos los derechos reservados © 2025 Wilber Saico

---

**Gestor360° Enterprise** - Sistema de Gestión Operativa Multi-Sucursal
