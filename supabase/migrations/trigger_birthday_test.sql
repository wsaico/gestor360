-- =================================================================
-- SCRIPT: TRIGGER BIRTHDAY TEST
-- PURPOSE: Create/Update an employee with TODAY's date as birthday
--          and the user's email to verify receipt.
-- =================================================================

DO $$
DECLARE
    target_station_id uuid;
BEGIN
    -- 1. Get a valid station
    SELECT id INTO target_station_id FROM public.stations LIMIT 1;
    
    -- 2. Upsert a Test Employee
    -- We use a dummy DNI 'TEST9999' to reuse the record
    INSERT INTO public.employees (
        full_name, 
        dni, 
        code,           -- Some schemas might require this
        station_id, 
        birth_date, 
        email, 
        status
    )
    VALUES (
        '🎉 EMPLEADO DE PRUEBA CUMPLEAÑOS 🎉', 
        'TEST9999', 
        'TEST-BDAY',
        target_station_id, 
        CURRENT_DATE, -- Force birthday to TODAY
        'willysaico@gmail.com', -- Ensure it has an email (for individual test if enabled)
        'ACTIVE'
    )
    ON CONFLICT (dni) DO UPDATE SET
        birth_date = CURRENT_DATE,
        full_name = '🎉 EMPLEADO DE PRUEBA CUMPLEAÑOS (ACTUALIZADO) 🎉',
        status = 'ACTIVE';

    RAISE NOTICE '✅ Test Employee Created/Updated with Birthday = TODAY';
END $$;
