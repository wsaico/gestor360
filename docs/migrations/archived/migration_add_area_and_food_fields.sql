-- =====================================================
-- Migración: Agregar campos faltantes para módulo de alimentación
-- =====================================================
-- 1. Campo AREA en employees
-- 2. Campos meal_type, order_type, discount_applied en food_orders y menus

-- =====================================================
-- 1. Agregar campo AREA a employees
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'area'
  ) THEN
    ALTER TABLE employees ADD COLUMN area VARCHAR(100);
    COMMENT ON COLUMN employees.area IS 'Área de trabajo del empleado (PAX, RAMPA, etc)';
  END IF;
END $$;

-- Crear índice para búsquedas por área
CREATE INDEX IF NOT EXISTS idx_employees_area ON employees(area);

-- =====================================================
-- 2. Agregar campos a menus para tipo de comida
-- =====================================================

DO $$
BEGIN
  -- meal_type: DESAYUNO, ALMUERZO, CENA
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menus' AND column_name = 'meal_type'
  ) THEN
    ALTER TABLE menus ADD COLUMN meal_type VARCHAR(50) DEFAULT 'ALMUERZO';
    COMMENT ON COLUMN menus.meal_type IS 'Tipo de comida: DESAYUNO, ALMUERZO, CENA';
  END IF;
END $$;

-- =====================================================
-- 3. Actualizar food_orders con campos adicionales
-- =====================================================

DO $$
BEGIN
  -- order_type: NORMAL, ESPECIAL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'food_orders' AND column_name = 'order_type'
  ) THEN
    ALTER TABLE food_orders ADD COLUMN order_type VARCHAR(50) DEFAULT 'NORMAL';
    COMMENT ON COLUMN food_orders.order_type IS 'Tipo de pedido: NORMAL, ESPECIAL';
  END IF;

  -- meal_type: DESAYUNO, ALMUERZO, CENA
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'food_orders' AND column_name = 'meal_type'
  ) THEN
    ALTER TABLE food_orders ADD COLUMN meal_type VARCHAR(50) DEFAULT 'ALMUERZO';
    COMMENT ON COLUMN food_orders.meal_type IS 'Tipo de comida: DESAYUNO, ALMUERZO, CENA';
  END IF;

  -- discount_applied: porcentaje de descuento si es pedido especial
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'food_orders' AND column_name = 'discount_applied'
  ) THEN
    ALTER TABLE food_orders ADD COLUMN discount_applied DECIMAL(5, 2) DEFAULT 0.00;
    COMMENT ON COLUMN food_orders.discount_applied IS 'Porcentaje de descuento aplicado (0-100)';
  END IF;

  -- employee_cost_snapshot: costo empleado al momento del pedido
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'food_orders' AND column_name = 'employee_cost_snapshot'
  ) THEN
    ALTER TABLE food_orders ADD COLUMN employee_cost_snapshot DECIMAL(10, 2) DEFAULT 0.00;
    COMMENT ON COLUMN food_orders.employee_cost_snapshot IS 'Aporte del empleado (snapshot)';
  END IF;

  -- company_subsidy_snapshot: subsidio empresa al momento del pedido
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'food_orders' AND column_name = 'company_subsidy_snapshot'
  ) THEN
    ALTER TABLE food_orders ADD COLUMN company_subsidy_snapshot DECIMAL(10, 2) DEFAULT 0.00;
    COMMENT ON COLUMN food_orders.company_subsidy_snapshot IS 'Subsidio de la empresa (snapshot)';
  END IF;
END $$;

-- Índices adicionales
CREATE INDEX IF NOT EXISTS idx_food_orders_order_type ON food_orders(order_type);
CREATE INDEX IF NOT EXISTS idx_food_orders_meal_type ON food_orders(meal_type);
CREATE INDEX IF NOT EXISTS idx_menus_meal_type ON menus(meal_type);

-- =====================================================
-- 4. Agregar constraints de validación
-- =====================================================

-- Validar meal_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'menus_meal_type_valid'
  ) THEN
    ALTER TABLE menus ADD CONSTRAINT menus_meal_type_valid
      CHECK (meal_type IN ('DESAYUNO', 'ALMUERZO', 'CENA'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'food_orders_meal_type_valid'
  ) THEN
    ALTER TABLE food_orders ADD CONSTRAINT food_orders_meal_type_valid
      CHECK (meal_type IN ('DESAYUNO', 'ALMUERZO', 'CENA'));
  END IF;
END $$;

-- Validar order_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'food_orders_order_type_valid'
  ) THEN
    ALTER TABLE food_orders ADD CONSTRAINT food_orders_order_type_valid
      CHECK (order_type IN ('NORMAL', 'ESPECIAL'));
  END IF;
END $$;

-- Validar discount_applied
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'food_orders_discount_valid'
  ) THEN
    ALTER TABLE food_orders ADD CONSTRAINT food_orders_discount_valid
      CHECK (discount_applied >= 0 AND discount_applied <= 100);
  END IF;
END $$;

-- =====================================================
-- 5. Verificación
-- =====================================================

-- Verificar columnas de employees
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'employees' AND column_name IN ('area', 'role_name', 'dni')
ORDER BY ordinal_position;

-- Verificar columnas de menus
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'menus' AND column_name IN ('meal_type', 'serve_date', 'options')
ORDER BY ordinal_position;

-- Verificar columnas de food_orders
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'food_orders' AND column_name IN ('order_type', 'meal_type', 'discount_applied', 'employee_cost_snapshot', 'company_subsidy_snapshot')
ORDER BY ordinal_position;
