-- Script para arreglar el Regex incorrecto de asset_code
-- El error 'invalid regular expression: invalid character range' ocurre porque '-' se interpreta como rango.
-- Solución: Escapar el guión (\-) o moverlo al final.

DO $$
BEGIN
    -- Intentar eliminar la restricción anterior si existe
    BEGIN
        ALTER TABLE assets DROP CONSTRAINT IF EXISTS asset_code_format;
    EXCEPTION
        WHEN OTHERS THEN RAISE NOTICE 'No se pudo eliminar constraint, quizás no existe';
    END;
END $$;

-- Volver a crearla con el regex corregido (Guión al final [A-Z0-9_-])
ALTER TABLE assets
ADD CONSTRAINT asset_code_format 
CHECK (asset_code ~ '^[A-Z0-9_-]+$');

-- Verificar
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname = 'asset_code_format';
