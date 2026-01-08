# Manual de Ingeniería y Operaciones: Gestor360° Enterprise v2.1

Este documento constituye la especificación técnica profunda y el manual operativo del ecosistema Gestor360°. Está diseñado para personal de ingeniería, auditores de sistemas y directores de operaciones que requieran comprender la mecánica interna del software.

---

## 1. Arquitectura del Núcleo (Core Engine)

### 1.1. Seguridad y Multi-Tenancy (RLS Deep Dive)
El sistema utiliza una arquitectura de **aislamiento de datos por software** en el motor PostgreSQL.
-   **Contexto de Conexión**: Cada usuario autenticado posee un `JWT` que contiene su `station_id` en los metadatos.
-   **RLS (Row Level Security)**: Las tablas críticas (`employees`, `food_orders`, `epp_items`, `assets`, `transport_schedules`) poseen políticas RLS que filtran cada `SELECT`, `UPDATE` y `DELETE` mediante la cláusula:
    ```sql
    (station_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'station_id'::text)::uuid)
    ```
-   **Seguridad de API**: El servicio `api.js` actúa como un interceptor global que inyecta el header `X-Station-Id` en peticiones `HTTP`, permitiendo que el middleware de Supabase valide la pertenencia del recurso.

---

## 2. Módulo de Capital Humano (RRHH)

### 2.1. Gestión de Identidad y Acceso
El registro de un colaborador es un proceso atómico orquestado por `EmployeeService.js`:
1.  **Auth SignUp**: Se crea la identidad en el esquema `auth.users` de Supabase, asignando el DNI como `password` por defecto.
2.  **Data Linkage**: Se inserta un registro en `public.employees` utilizando el `UUID` generado en el paso anterior (`id: authData.user.id`). Esto vincula la sesión del usuario con sus datos operativos (cargo, área, estación).
3.  **Status Handling**: Los estados (`ACTIVO`, `CESADO`, `VACACIONES`) controlan la visibilidad en listas desplegables y la capacidad de realizar pedidos de alimentación.

### 2.2. Inteligencia de Alertas (Edge Functions)
Ubicada en `supabase/functions/send-email-alerts`, esta lógica automatizada funciona como un cronjob interno:
-   **Documentación Crítica**: Escanea las tablas `employees` y `employee_docs`.
-   **Birthday Logic**: 
    -   Utiliza el campo `birth_date`. 
    -   **Slot 1 (Preventivo)**: Filtra por `CURRENT_DATE + 1` a las 18:00h locales para avisar al Supervisor.
    -   **Slot 2 (Celebración)**: Filtra por `CURRENT_DATE` a las 06:00h para felicitar vía mailing dinámico.
-   **Vencimientos**: Calcula la delta de días entre `EMO_vencimiento` / `Pase_SST_vencimiento` y la fecha actual, disparando alertas en cascada (60d, 30d, Vencido).

---

## 3. Módulo SST - Inventario y Logística de EPP

### 3.1. Control de Existencias Valorizadas
-   **Table Architecture**: La tabla `epp_items` mantiene el estado actual del inventario.
-   **Reglas de Reposición**: Cada ítem tiene un `stock_min`. Cuando `stock_current <= stock_min`, el sistema marca el ítem con flag de alerta roja en el dashboard y envía un correo electrónico de alerta de reposición.
-   **Valorización**: Los reportes multiplican `stock_current` * `cost_unit`, permitiendo cierres de inventario valorizados mensuales.

### 3.2. Kardex y Trazabilidad de Movimientos
Toda alteración del inventario debe pasar por `EppInventoryService.adjustStock`, el cual realiza una transacción doble:
1.  Actualiza `epp_items.stock_current`.
2.  Inserta en `epp_stock_movements` el registro histórico con `movement_type` (`ENTRADA`, `SALIDA`, `AJUSTE`), `stock_before`, `stock_after`, y el `UUID` del usuario que realizó el movimiento.

---

## 4. Módulo de Alimentación y Concesionarios

### 4.1. Reglas de Negocio y Finanzas
El motor de costos (`pricingService.js`) se basa en una matriz de subsidios:
-   **Pricing Config**: En `role_pricing_config` se definen los montos fijos: `employee_cost` (lo que descuenta planilla) y `company_subsidy` (lo que asume la empresa).
-   **Integridad Histórica (Snapshot Pattern)**: Al momento de confirmar un pedido en `food_orders`, el sistema **no referencia** el precio actual, sino que **copia** los valores a las columnas `employee_cost_snapshot` y `company_subsidy_snapshot`. Esto garantiza que si los precios suben el próximo mes, los reportes de meses pasados mantengan sus valores originales.

### 4.2. Sistema de Reportes Operativos
Generados en `reportService.js` utilizando `XLSX-js-Style`:
-   **Reporte de Descuento**: Cruza pedidos `CONSUMED` / `CONFIRMED` por DNI para exportación a sistemas de nómina.
-   **Auditoría de Faltantes**: Realiza un `LEFT JOIN` entre el universo de empleados activos y los pedidos del día, identificando ausencias de registro.

---

## 5. Módulo de Movilidad y Transporte (Logística de Personal)

### 5.1. Ejecución y Rastreo GPS
-   **Real-Time Data**: La tabla `transport_execution` almacena el estado dinámico del viaje.
-   **GPS Breadcrumbs**: El campo `locations` es un Array JSONB que recibe pings de geolocalización desde la App móvil del conductor cada N segundos mediante la RPC `append_transport_location`.
-   **Modo Offline Resiliente**: Si el conductor entra en zona de sombra (sin señal), la App encola las coordenadas en el `LocalStorage` del navegador y sincroniza masivamente al detectar conectividad mediante `processOfflineQueue()`.

### 5.2. Conciliación y Liquidación (Settlements)
Los viajes completados se agrupan en la tabla `transport_settlements`. 
-   **Inmutabilidad**: Una vez que un viaje se vincula a un `settlement_id`, queda bloqueado para cualquier edición de costo o fecha, asegurando auditorías financieras limpias.

---

## 6. Gestión de Activos Fijos y Patrimonio

### 6.1. Especificaciones Técnicas Flexibles
-   **No-Schema Specs**: Los activos tecnológicos (laptops, radio-comunicadores) utilizan el campo `specifications` (JSONB) para guardar datos heterogéneos (RAM, CPU, IMEI, Licencias) sin necesidad de columnas dedicadas, permitiendo que un mismo sistema gestione desde una laptop hasta una camioneta.
-   **Ciclo de Mantenimiento**: El servicio `AssetService.getMaintenanceAlerts` evalúa proactivamente el campo `next_maintenance_date`, notificando a TI/Mantenimiento 30 días antes de que el activo pierda operatividad.

### 6.2. Trazabilidad de Transferencias
Cada vez que un activo cambia de `station_id` (Estación) o de `assigned_to_employee_id` (Responsable), el sistema genera un log en `asset_movements`, permitiendo reconstruir la cadena de custodia legal del patrimonio de la empresa.

---

## 7. Inteligencia de Datos y Generación de Reportes

El sistema consolida la información de todos los módulos mediante un motor de reportes avanzado (`reportService.js`) que procesa datos en tiempo real para generar activos exportables de alta fidelidad.

### 7.1. Reportes Financieros y de Planilla
- **Consolidado de Descuentos (Comedor)**: Agrupa por DNI y fecha, procesando exclusivamente pedidos en estado `CONSUMED` o `CONFIRMED`. Este reporte es la base para la carga masiva en el sistema de planillas.
- **Facturación con IGV**: El sistema calcula automáticamente la liquidación de proveedores aplicando la tasa impositiva vigente (18% IGV) sobre el Subtotal de pedidos facturables, separando el costo subsidiado por la empresa del costo asumido por el personal.

### 7.2. Auditoría de Cumplimiento (Compliance)
- **Reporte de Asistencia al Comedor**: Algoritmo de identificación de "Faltas" que cruza el universo de empleados `ACTIVOS` vs la tabla `food_orders`. Esencial para detectar personal en estación que no está cumpliendo con sus horarios de alimentación o registro.
- **Reporte de Necesidad de Reposición (SST)**: Uno de los más complejos. Realiza una proyección de vencimientos de EPP cruzando:
  1.  `Ultima_Entrega` + `Ciclo_Vida_Item`.
  2.  `Stock_Almacen_Actual` (lookup en `epp_items`).
  - **Resultado**: El sistema indica no solo qué empleado necesita renovación, sino si la empresa cuenta con stock suficiente en almacén para cubrir esa necesidad inmediata o si debe disparar una orden de compra.

---

## 8. Mantenimiento del Sistema (DevOps)

### 7.1. Edge Runtime
Todas las tareas programadas y de integración externa (Brevo, Reportes Programados) se ejecutan en **Deno Edge Runtime**, garantizando latencia mínima y ejecución aislada de la lógica de UI.

### 7.2. Backup e Integridad
Supabase realiza backups diarios automáticos con Point-in-Time Recovery (PITR), asegurando que ante cualquier error humano, el sistema pueda restaurarse a minutos antes del incidente.

---
**Elaborado**: Auditoría de Ingeniería Gestor360 v2.1
**Fecha**: 08 de Enero, 2026
**Responsable**: Wilbur Saico - Director de Proyecto
