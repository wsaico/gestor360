# 📋 Instrucciones para Migración: Cargos y Contratos

## Actualización del Sistema Gestor360° - v2.1.0

Esta migración agrega funcionalidad de **Cargos Configurables** y **Tipos de Contrato** al módulo de empleados.

---

## 🎯 ¿Qué se ha actualizado?

### 1. **Nueva tabla: job_roles**
   - Permite gestionar los cargos de forma dinámica
   - Los cargos se pueden agregar, editar y desactivar
   - 9 cargos predeterminados ya incluidos

### 2. **Nuevos campos en employees:**
   - `contract_type` - Tipo de contrato (Indeterminado, Incremento de Actividad)
   - `work_schedule` - Jornada laboral (Full 8hrs, Full 6hrs, Part Time)

### 3. **Interfaz actualizada:**
   - Select dinámico de cargos en el formulario
   - Campos de contrato y jornada en formulario y vista de detalle
   - Columnas adicionales en la tabla de empleados

---

## 🚀 Pasos para Ejecutar la Migración

### **Paso 1: Ejecutar el Script SQL**

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto: **ohbwsuktgmnycsokqdja**
3. En el menú lateral, haz clic en **SQL Editor**
4. Abre el archivo: `supabase_migration_job_roles.sql`
5. Copia todo el contenido
6. Pégalo en el SQL Editor
7. Haz clic en **RUN** (o presiona Ctrl+Enter)

### **Paso 2: Verificar la Migración**

Ejecuta este query en el SQL Editor para verificar:

```sql
-- 1. Ver los cargos creados
SELECT * FROM job_roles ORDER BY name;

-- 2. Verificar estructura de employees
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'employees'
  AND column_name IN ('contract_type', 'work_schedule', 'role_name')
ORDER BY ordinal_position;

-- 3. Ver empleados con nuevos campos
SELECT full_name, role_name, contract_type, work_schedule
FROM employees
LIMIT 5;
```

Deberías ver:
- ✅ 9 cargos en la tabla `job_roles`
- ✅ Columnas `contract_type` y `work_schedule` en `employees`
- ✅ Empleados existentes con valores por defecto

### **Paso 3: Reiniciar la Aplicación**

```bash
# Detener el servidor (Ctrl+C)
# Luego reiniciar:
npm run dev
```

---

## 📊 Cargos Predeterminados

Los siguientes cargos se crean automáticamente:

1. Supervisor de Estación
2. Auxiliar de Rampa
3. Operador 1
4. Operador 2
5. Operador 3
6. Supervisor de Tráfico
7. Agente de Tráfico
8. Técnico de Mantenimiento OMA
9. Técnico Senior 1

---

## 🔧 Tipos de Contrato

- **Indeterminado** - Contrato indefinido
- **Incremento de Actividad** - Contrato temporal por aumento de actividad

---

## ⏰ Jornadas Laborales

- **Full Time 8 horas** - Jornada completa de 8 horas
- **Full Time 6 horas** - Jornada completa de 6 horas
- **Part Time** - Jornada parcial

---

## ✅ Verificación Post-Migración

Después de ejecutar la migración, verifica que:

1. **Crear nuevo empleado:**
   - Ve a RRHH → Empleados
   - Click en "Nuevo Empleado"
   - Verifica que el campo "Cargo" sea un select con los 9 cargos
   - Verifica que aparezcan "Tipo de Contrato" y "Jornada Laboral"
   - Crea un empleado de prueba

2. **Ver lista de empleados:**
   - La tabla debe mostrar las columnas "Contrato" y "Jornada"
   - Los empleados existentes deben mostrar "Indeterminado" y "Full Time 8 horas"

3. **Ver detalle de empleado:**
   - Click en el ojo de un empleado
   - Verifica que aparezcan "Tipo de Contrato" y "Jornada Laboral"

---

## 🆘 Troubleshooting

### Error: "relation job_roles does not exist"

**Causa:** La tabla no se creó correctamente.

**Solución:**
1. Verifica que ejecutaste el script completo
2. Ejecuta manualmente:
   ```sql
   CREATE TABLE IF NOT EXISTS job_roles (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name VARCHAR(100) NOT NULL UNIQUE,
     description TEXT,
     is_active BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

### Error: "column contract_type does not exist"

**Causa:** Las columnas no se agregaron a `employees`.

**Solución:**
```sql
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_type VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_schedule VARCHAR(20);
```

### Los selects de cargo aparecen vacíos

**Causa:** No se insertaron los datos de cargos.

**Solución:**
Ejecuta la sección de "INSERTAR CARGOS PREDETERMINADOS" del script `supabase_migration_job_roles.sql`.

### Los empleados existentes no tienen contrato ni jornada

**Solución:**
```sql
UPDATE employees
SET
  contract_type = 'INDETERMINADO',
  work_schedule = 'FULL_8HRS'
WHERE contract_type IS NULL;
```

---

## 📝 Notas Importantes

1. **Empleados existentes:** Se les asigna automáticamente "Indeterminado" y "Full 8hrs"
2. **Cargos antiguos:** Los empleados con `role_name` que no coincida con los cargos predeterminados seguirán mostrando su cargo antiguo hasta que los edites
3. **Agregar más cargos:** Puedes agregar más cargos desde el SQL Editor:
   ```sql
   INSERT INTO job_roles (name, description)
   VALUES ('Nuevo Cargo', 'Descripción del cargo');
   ```

---

## 🎉 ¡Migración Completada!

Si todo salió bien, ahora tienes:
- ✅ Sistema de cargos configurable
- ✅ Tipos de contrato y jornadas
- ✅ Formularios actualizados
- ✅ Tabla de empleados con nuevas columnas

---

**Desarrollado por Wilber Saico** | Gestor360° v2.1.0
