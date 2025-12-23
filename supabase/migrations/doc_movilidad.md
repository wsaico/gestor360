# Documentación Técnica: Módulo de Movilidad Integrado - Gestor 360

## 1. Visión General
Este módulo extiende la plataforma **Gestor 360** para gestionar el transporte de personal por sucursal (`stations`) y por cliente (`organizations`). Permite la programación de rutas, seguimiento GPS en tiempo real (estilo Cabify), escaneo de fotochecks para asistencia y auditoría de costos automatizada.

## 2. Stack Tecnológico (Consistente con Core 360)
- **Frontend:** React 18 + Vite 5 + Tailwind CSS.
- **Backend/DB:** Supabase (PostgreSQL + RLS + Realtime).
- **Librerías UI:** Lucide React (Iconos), Framer Motion (Animaciones).
- **Utilidades:** Date-fns (Fechas), jsPDF (Reportes).
- **Geolocalización:** Geolocation API (Navegador).

---

## 3. Estructura de Datos (Extensiones SQL)

El sistema debe reutilizar las tablas `stations`, `organizations`, `employees` y `system_users`. Se deben crear las siguientes tablas:

### A. Tarifario de Rutas (`transport_routes`)
Define el precio y la regla de cobro.
- `id`: uuid (PK)
- `station_id`: uuid (FK -> stations)
- `organization_id`: uuid (FK -> organizations)
- `name`: text (Ej: "Jauja - Aeropuerto")
- `billing_type`: enum ('FIXED_ROUTE', 'PER_PASSENGER')
- `base_price`: numeric (Costo de la ruta o costo por persona)

### B. Programación de Despacho (`transport_schedules`)
La orden de servicio creada por el encargado.
- `id`: uuid (PK)
- `route_id`: uuid (FK -> transport_routes)
- `provider_id`: uuid (FK -> system_users con rol PROVIDER)
- `scheduled_date`: date
- `departure_time`: time
- `passengers_manifest`: uuid[] (Array de IDs de `employees`)
- `status`: enum ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
- `vehicle_plate`: text (Added via migration)

### C. Ejecución y Auditoría (`transport_execution`)
Registro real del trayecto y costos.
- `id`: uuid (PK)
- `schedule_id`: uuid (FK -> transport_schedules)
- `gps_track`: jsonb (Historial de coordenadas `{lat, lng, t}`)
- `check_ins`: jsonb (Lista de DNIs escaneados con timestamp y GPS)
- `final_cost`: numeric (Calculado al finalizar según el tipo de ruta)

---

## 4. Lógicas de Negocio Críticas

### 4.1. Cálculo de Liquidación Automática
Al marcar el servicio como `COMPLETED`, el sistema calcula el `final_cost`:
- **FIXED_ROUTE:** `final_cost = transport_routes.base_price`.
- **PER_PASSENGER:** `final_cost = transport_routes.base_price * count(check_ins)`.

### 4.2. Flujo del Conductor (PWA en Navegador)
1. **Inicio:** El conductor ve sus rutas del día filtradas por su `station_id`.
2. **GPS:** Al iniciar, se activa `navigator.geolocation.watchPosition` enviando datos a Supabase Realtime cada 30 segundos.
3. **Tolerancia:** Al estar a < 100m del punto de recojo, inicia un **cronómetro de 3 minutos**. Al expirar, habilita el botón "No Show" con registro GPS de evidencia.
4. **Escaneo:** Lector de cámara para capturar QR/Fotocheck. Valida que el empleado pertenezca a la organización asignada a la ruta.

### 4.3. Auditoría Multi-sucursal (RLS)
Se deben aplicar políticas de Row Level Security para que:
- Los encargados de una **Sucursal** solo vean sus proveedores y rutas.
- Las **Organizaciones** (ej: LATAM) solo aparezcan en los reportes de su propio personal.

---

## 5. Requerimientos de Interfaz (UI/UX)

- **Consistencia Visual:** Heredar los colores del sistema 360, modo claro/oscuro y componentes Tailwind existentes.
- **Mapa de Auditoría:** Vista para el Admin que muestra la ruta teórica vs. la ruta real (`gps_track`) con marcadores donde se realizaron los escaneos.
- **Reportes:** Exportación a PDF de la liquidación diaria por proveedor, detallando:
    - Nombre de la Ruta.
    - Organización beneficiaria.
    - Cantidad de pasajeros (si aplica).
    - Costo final auditado.