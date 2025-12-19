# Módulo de Alimentación - Instrucciones de Instalación

## ⚠️ IMPORTANTE: Ejecutar Migraciones SQL Primero

Antes de usar el módulo de alimentación, **DEBES ejecutar las migraciones SQL** en tu base de datos PostgreSQL.

## Paso 1: Ejecutar Migraciones

### Opción A: Desde pgAdmin o tu cliente SQL preferido

1. Abre tu cliente de PostgreSQL (pgAdmin, DBeaver, etc.)
2. Conéctate a tu base de datos de Gestor360
3. Ejecuta los siguientes archivos EN ORDEN:

#### 1. `migration_food_module.sql`
```sql
-- Este archivo crea las tablas principales:
-- - role_pricing_config (tarifas por cargo)
-- - menus (menús diarios)
-- - food_orders (pedidos de alimentación)
```

#### 2. `migration_add_area_and_food_fields.sql`
```sql
-- Este archivo agrega campos adicionales:
-- - Campo AREA en employees
-- - meal_type en menus y food_orders
-- - order_type, discount_applied, snapshots en food_orders
```

### Opción B: Desde la línea de comandos

```bash
# Conéctate a PostgreSQL y ejecuta:
psql -U tu_usuario -d gestor360 -f migration_food_module.sql
psql -U tu_usuario -d gestor360 -f migration_add_area_and_food_fields.sql
```

### Opción C: Desde Supabase Dashboard

1. Ve a tu proyecto en Supabase
2. Ve a SQL Editor
3. Copia y pega el contenido de `migration_food_module.sql`
4. Ejecuta (RUN)
5. Repite con `migration_add_area_and_food_fields.sql`

## Paso 2: Verificar Instalación

Después de ejecutar las migraciones, verifica que las tablas se crearon correctamente:

```sql
-- Verificar tablas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('role_pricing_config', 'menus', 'food_orders');

-- Debe devolver 3 filas
```

## Paso 3: Configuración Inicial

### 3.1 Configurar Tarifas por Cargo

1. Ingresa a la aplicación como ADMIN o SUPERVISOR
2. Ve a **Alimentación > Tarifas**
3. Agrega las tarifas para cada cargo:
   - Ejemplo: Supervisor paga S/ 5.00, empresa subsidia S/ 10.00
   - Ejemplo: Operador paga S/ 3.00, empresa subsidia S/ 12.00

### 3.2 Agregar Área a Empleados Existentes

1. Ve a **Recursos Humanos > Empleados**
2. Edita cada empleado y asigna su AREA:
   - PAX
   - RAMPA
   - OMA
   - TRÁFICO
   - ADMINISTRATIVO

## Paso 4: Uso del Módulo

### Para Proveedores

1. Ve a **Alimentación > Menús**
2. Haz clic en "Nuevo Menú"
3. Selecciona la fecha (Hoy, Mañana, o fecha programada)
4. Selecciona el tipo de comida (Desayuno, Almuerzo, Cena)
5. Agrega las opciones del menú
6. Guarda

### Para Empleados

1. Ve a **Alimentación > Mis Pedidos**
2. Navega por los menús disponibles
3. Haz clic en "Realizar Pedido"
4. Selecciona la opción del menú que deseas
5. Elige el tipo de pedido (Normal o Especial con descuento)
6. Confirma tu pedido

### Para Administradores/Supervisores

**Generar Reportes:**

1. Ve a **Alimentación > Reportes**
2. Selecciona el rango de fechas
3. Descarga el reporte que necesites:
   - **Reporte de Descuento Comedor**: Consolidado de descuentos por empleado
   - **Reporte de Facturación**: 3 pestañas (25% Empleado, 75% Empresa, Resumen con IGV)

## Estructura del Módulo

### Páginas Implementadas

1. **MenusPage** (`/alimentacion/menus`)
   - Roles: ADMIN, SUPERVISOR, PROVIDER
   - Cargar menús diarios con múltiples opciones

2. **FoodOrdersPage** (`/alimentacion/pedidos`)
   - Roles: TODOS (sin restricción)
   - Realizar pedidos de forma moderna y fácil

3. **RolePricingPage** (`/alimentacion/tarifas`)
   - Roles: ADMIN, SUPERVISOR
   - Configurar tarifas por cargo

4. **ReportsPage** (`/alimentacion/reportes`)
   - Roles: ADMIN, SUPERVISOR
   - Generar reportes Excel consolidados

### Servicios Creados

- `pricingService.js` - Gestión de tarifas
- `menuService.js` - Gestión de menús
- `foodOrderService.js` - Gestión de pedidos
- `reportService.js` - Generación de reportes Excel

## Características Implementadas

✅ Tipos de comida: Desayuno, Almuerzo, Cena
✅ Tipos de pedido: Normal, Especial (con descuento configurable)
✅ Snapshot de precios al momento del pedido
✅ Campo AREA en empleados (PAX, RAMPA, OMA, TRÁFICO, ADMINISTRATIVO)
✅ Tarifas configurables por cargo (25% empleado, 75% empresa)
✅ Reportes Excel con formato profesional:
  - Descuento Comedor (consolidado por empleado)
  - Facturación (3 pestañas con IGV 18%)
✅ Interfaz moderna tipo app para pedidos
✅ Validaciones completas
✅ Multi-tenant (filtrado por estación)

## Problemas Comunes

### "Las páginas se quedan cargando"
**Solución:** Ejecuta las migraciones SQL primero.

### "Error: relation 'menus' does not exist"
**Solución:** Ejecuta `migration_food_module.sql`.

### "No puedo hacer pedidos"
**Solución:**
1. Verifica que existan menús cargados para la fecha
2. Verifica que tengas una tarifa configurada para tu cargo

### "No aparecen datos en los reportes"
**Solución:**
1. Asegúrate de que hay pedidos confirmados o servidos
2. Verifica el rango de fechas seleccionado

## Soporte

Si tienes problemas, verifica:
1. ✅ Las migraciones SQL se ejecutaron correctamente
2. ✅ Las tarifas están configuradas
3. ✅ Los empleados tienen AREA asignada
4. ✅ El usuario tiene el rol apropiado para la acción

---

**Módulo desarrollado para Gestor360° v2.0.0**
