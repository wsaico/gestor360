# Sistema de Alertas - Gestor360°

## Descripción General

El sistema de alertas implementa la funcionalidad de **notificaciones de cumpleaños** y **vencimientos de documentos** (FOTOCHECK, LICENCIA, EMO) según las especificaciones del documento técnico.

---

## Componentes Implementados

### 1. **Migración SQL: `migration_add_birthdate.sql`**

Agrega el campo `birth_date` a la tabla `employees` para el seguimiento de cumpleaños.

```sql
ALTER TABLE employees ADD COLUMN birth_date DATE;
CREATE INDEX idx_employees_birth_date ON employees(birth_date);
```

**Ejecutar en Supabase SQL Editor:**
```bash
1. Abre Supabase Dashboard
2. Ve a SQL Editor
3. Ejecuta el contenido de: migration_add_birthdate.sql
4. Verifica que se creó el campo correctamente
```

---

### 2. **Servicio: `src/services/alertsService.js`**

Servicio centralizado para el cálculo de alertas en **tiempo real** (no almacenadas en BD).

#### Métodos Principales:

**`calculateDaysRemaining(targetDate)`**
- Calcula días restantes hasta una fecha objetivo
- Retorna número positivo (días futuros) o negativo (días pasados)

**`calculateDaysUntilBirthday(birthDate)`**
- Calcula días hasta el próximo cumpleaños
- Considera el año actual o siguiente si ya pasó
- Retorna valor entre 0-365

**`getAlertStatus(daysRemaining)`**
- Implementa la lógica de semáforo según documentación:
  - `días < 0` → **ROJO** (VENCIDO)
  - `días <= 30` → **AMARILLO** (POR VENCER) → Enviar alerta
  - `días > 30` → **VERDE** (VIGENTE)

**`getUpcomingBirthdays(stationId, daysAhead = 30)`**
- Obtiene cumpleaños próximos dentro de X días
- Filtra empleados activos
- Ordena por proximidad

**`getExpiringDocuments(stationId, daysAhead = 30)`**
- Obtiene documentos que vencen dentro de X días
- Filtra empleados activos
- Incluye documentos ya vencidos
- Calcula estado en tiempo real

**`getAllAlerts(stationId)`**
- Consolida cumpleaños y documentos
- Retorna estadísticas resumidas:
  - `totalAlerts`: Total de alertas
  - `expiredDocs`: Documentos vencidos
  - `warningDocs`: Documentos por vencer (30 días)
  - `todayBirthdays`: Cumpleaños hoy
  - `thisWeekBirthdays`: Cumpleaños esta semana

---

### 3. **Componente: `src/components/AlertsWidget.jsx`**

Widget visual para mostrar alertas en el Dashboard.

#### Características:

- **Tabs de Navegación:**
  - Todas (cumpleaños + documentos)
  - Solo cumpleaños
  - Solo documentos

- **Tarjetas Estadísticas:**
  - Cumpleaños hoy (azul)
  - Cumpleaños esta semana (cyan)
  - Documentos vencidos (rojo)
  - Documentos por vencer (amarillo)

- **Lista de Alertas:**
  - Cumpleaños con ícono de torta 🎂
  - Documentos con color según gravedad
  - Links clickeables a detalle del empleado
  - Muestra días restantes/vencidos

- **Actualización Automática:**
  - Refresca cada 5 minutos
  - Botón manual de actualización

#### Uso:

```jsx
import AlertsWidget from '@components/AlertsWidget'

<AlertsWidget />
```

---

### 4. **Formulario de Empleado: `EmployeeFormPage.jsx`**

Actualizado para incluir el campo **Fecha de Nacimiento**.

**Ubicación:** Entre "Cargo" y "Estado"

```jsx
<input
  type="date"
  name="birth_date"
  value={formData.birth_date || ''}
  onChange={handleChange}
  className="input"
/>
<p className="text-xs text-gray-500">Para alertas de cumpleaños</p>
```

---

### 5. **Página de Detalle: `EmployeeDetailPage.jsx`**

Muestra la fecha de nacimiento si está disponible.

```jsx
{employee.birth_date && (
  <div>
    <label>Fecha de Nacimiento</label>
    <p>{formatDate(employee.birth_date)}</p>
  </div>
)}
```

---

### 6. **Dashboard: `DashboardPage.jsx`**

Integra el widget de alertas como sección principal.

```jsx
import AlertsWidget from '@components/AlertsWidget'

<AlertsWidget />
```

Reemplaza el panel de "Alertas Recientes" estático por el widget dinámico.

---

## Lógica de Negocio (Según Documentación)

### Algoritmo de Renovación/Vencimiento

El sistema **NO guarda el estado** del documento en la BD, lo **calcula en tiempo real**:

```javascript
// 1. Obtener fecha de vencimiento
const expiryDate = doc.expiry_date

// 2. Calcular días restantes
const daysRemaining = calculateDaysRemaining(expiryDate)

// 3. Determinar estado
if (daysRemaining < 0) {
  status = 'ROJO - VENCIDO'
  action = 'Habilitar botón Renovar'
} else if (daysRemaining <= 30) {
  status = 'AMARILLO - POR VENCER'
  action = 'Enviar alerta'
} else {
  status = 'VERDE - VIGENTE'
  action = 'Sin acción'
}
```

### Cumpleaños

```javascript
// 1. Obtener fecha de nacimiento
const birthDate = employee.birth_date

// 2. Calcular próximo cumpleaños
const daysUntilBirthday = calculateDaysUntilBirthday(birthDate)

// 3. Filtrar alertas (Slot Estricto)
if (isTodaySlot) {
  // 6 AM - 11 AM: Solo Hoy
  if (isToday) showAlert = true;
} else if (isTomorrowSlot) {
  // 6 PM - 11 PM: Solo Mañana
  if (isTomorrow) showAlert = true;
}

// 4. Asunto y Formato
if (isToday) {
  subject = '🎂 Hoy celebramos el cumpleaños de...'
  label = '¡Es HOY! 🎂'
} else {
  subject = '🎈 Mañana celebramos cumpleaños en el equipo'
  label = 'Mañana 🎈'
}
```

---

## Tipos de Documentos Soportados

Según `src/utils/constants.js`:

```javascript
export const DOCUMENT_TYPES = {
  FOTOCHECK: 'FOTOCHECK',
  LICENSE: 'LICENCIA',
  EMO: 'EMO'
}
```

Todos siguen la misma lógica de semáforo (0-30-vencido).

---

## Filtrado Multi-Tenant

Las consultas se filtran automáticamente por `station_id`:

```javascript
// Usuario de estación específica
const stationId = user.station_id
const alerts = await alertsService.getAllAlerts(stationId)

// Admin Global (ve todas las estaciones)
const alerts = await alertsService.getAllAlerts(null)
```

---

## Pasos para Probar el Sistema

### 1. Ejecutar Migración SQL

```bash
1. Abre Supabase Dashboard
2. Ve a SQL Editor
3. Ejecuta: migration_add_birthdate.sql
4. Verifica: SELECT * FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'birth_date';
```

### 2. Agregar Fechas de Nacimiento

```bash
1. Ve a http://localhost:3000/rrhh/empleados
2. Edita un empleado existente
3. Completa el campo "Fecha de Nacimiento"
4. Guarda
```

**Tip:** Para probar alertas de cumpleaños hoy/esta semana, usa fechas de nacimiento con día/mes cercano a hoy.

### 3. Agregar Documentos con Vencimiento

```bash
1. Ve a http://localhost:3000/rrhh/empleados/{id}
2. Haz clic en "Agregar Documento"
3. Selecciona tipo (FOTOCHECK, LICENCIA, EMO)
4. Establece fecha de vencimiento:
   - Próximos 30 días → alerta AMARILLA
   - Fecha pasada → alerta ROJA
5. Guarda
```

### 4. Ver Alertas en Dashboard

```bash
1. Ve a http://localhost:3000/dashboard
2. Verás el widget "Alertas y Notificaciones"
3. Usa los tabs para filtrar:
   - Todas
   - Solo cumpleaños
   - Solo documentos
4. Haz clic en cualquier alerta para ir al detalle del empleado
```

### 5. Verificar Actualización Automática

El widget se actualiza:
- Automáticamente cada 5 minutos
- Manualmente con el botón "Actualizar"

---

## Ejemplos de Datos de Prueba

### Empleado con cumpleaños próximo:

```json
{
  "full_name": "Juan Pérez",
  "birth_date": "1990-12-20", // Ajustar día/mes a fecha cercana
  "dni": "12345678",
  "station_id": "uuid-estacion",
  "role_name": "Supervisor de Estación",
  "status": "ACTIVO"
}
```

### Documento vencido (ROJO):

```json
{
  "employee_id": "uuid-empleado",
  "doc_type": "FOTOCHECK",
  "expiry_date": "2024-11-01" // Fecha pasada
}
```

### Documento por vencer (AMARILLO):

```json
{
  "employee_id": "uuid-empleado",
  "doc_type": "EMO",
  "expiry_date": "2025-01-15" // Próximos 30 días
}
```

### Documento vigente (VERDE - no muestra alerta):

```json
{
  "employee_id": "uuid-empleado",
  "doc_type": "LICENCIA",
  "expiry_date": "2025-06-30" // Más de 30 días
}
```

---

## Esquema Visual del Widget

```
┌─────────────────────────────────────────────────────────┐
│  🔔 Alertas y Notificaciones                            │
│  5 alertas activas                          [Actualizar]│
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │    2    │ │    5    │ │    1    │ │    3    │      │
│  │Cumpleaños│ │Esta     │ │Docs     │ │Por      │      │
│  │   hoy   │ │semana   │ │vencidos │ │vencer   │      │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
├─────────────────────────────────────────────────────────┤
│  [Todas (8)] [Cumpleaños (7)] [Documentos (1)]         │
├─────────────────────────────────────────────────────────┤
│  🎂 Juan Pérez                                      >   │
│     Supervisor • LIM                                    │
│     ¡Cumpleaños hoy! 🎉                                │
├─────────────────────────────────────────────────────────┤
│  📄 María García                        [VENCIDO]   >   │
│     FOTOCHECK • CUZ                                     │
│     VENCIDO hace 15 días                                │
├─────────────────────────────────────────────────────────┤
│  📄 Carlos López                      [POR VENCER]  >   │
│     EMO • JAU                                           │
│     Vence en 20 días (2025-01-07)                      │
└─────────────────────────────────────────────────────────┘
```

---

## Colores y Estados

| Estado | Color | Condición | Acción |
|--------|-------|-----------|--------|
| **VIGENTE** | Verde | días > 30 | No mostrar en alertas |
| **POR VENCER** | Amarillo | 0 <= días <= 30 | Mostrar en alertas |
| **VENCIDO** | Rojo | días < 0 | Mostrar en alertas + Prioridad alta |
| **Cumpleaños hoy** | Azul intenso | días = 0 | Destacar con emoji 🎉 |
| **Cumpleaños próximo** | Azul claro | días <= 30 | Mostrar en alertas |

---

## Integración con Módulos Futuros

### SST (Entrega de EPPs)
El sistema de alertas puede extenderse para EPPs:

```javascript
// Calcular vencimiento de EPP
const deliveryDate = delivery.delivery_date
const lifespan = item.lifespan_months
const renewalDate = addMonths(deliveryDate, lifespan)
const daysRemaining = calculateDaysRemaining(renewalDate)
const status = getAlertStatus(daysRemaining)
```

### Notificaciones por Email
Futuro: Enviar correos cuando `daysRemaining <= 30`:

```javascript
if (daysRemaining <= 30 && daysRemaining > 0) {
  await sendEmail({
    to: employee.email,
    subject: `Documento ${doc.doc_type} próximo a vencer`,
    body: `Su ${doc.doc_type} vence en ${daysRemaining} días`
  })
}
```

---

## Notas Importantes

1. **Cálculo en tiempo real:** Los estados NO se guardan en BD, se calculan cada vez que se consulta.

2. **Empleados cesados:** Solo se muestran alertas de empleados con `status = 'ACTIVO'`.

3. **Multi-tenant:** Las alertas se filtran automáticamente por estación del usuario.

4. **Rendimiento:** Se usan índices en `birth_date` y `expiry_date` para optimizar consultas.

5. **Timezone:** Todas las comparaciones usan fecha local a medianoche (00:00:00).

---

## Próximos Pasos Sugeridos

1. ✅ Ejecutar migración SQL
2. ✅ Agregar fechas de nacimiento a empleados existentes
3. ✅ Crear documentos de prueba con diferentes fechas de vencimiento
4. ✅ Verificar widget en Dashboard
5. 🔲 Implementar notificaciones por email (futuro)
6. 🔲 Agregar alertas para EPPs (módulo SST)
7. 🔲 Dashboard de reportes de vencimientos históricos

---

## Soporte Técnico

- **Documentación base:** `doc.md` (líneas 39, 58-66, 120)
- **Servicios relacionados:** `employeeService.js`, `dashboardService.js`
- **Componentes relacionados:** `EmployeeDetailPage.jsx`, `EmployeeFormPage.jsx`
- **Constantes:** `src/utils/constants.js` (DOCUMENT_TYPES)
- **Helpers:** `src/utils/helpers.js` (formatDate, calculateDocumentStatus)
