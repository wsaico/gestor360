-- MIGRATION: 20241223_phase2_billing_fleet.sql
-- OBJECTIVE: Implement Fleet Management (Drivers/Vehicles) and Billing (Settlements)
-- DATE: 2024-12-23

BEGIN;

-- 1. Create Vehicles Table (Flota)
CREATE TABLE IF NOT EXISTS public.transport_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.system_users(id), -- The Transport Company
    plate_number TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    year TEXT,
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, MAINTENANCE, INACTIVE
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider_id, plate_number)
);

-- 2. Create Drivers Table (Choferes)
CREATE TABLE IF NOT EXISTS public.transport_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.system_users(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    dni TEXT NOT NULL,
    license_number TEXT,
    phone TEXT,
    pin_code TEXT, -- For simplified Login in app
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider_id, dni)
);

-- 3. Create Settlements Table (Liquidaciones/Cierres)
CREATE TABLE IF NOT EXISTS public.transport_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id), -- Client (LATAM, SKY, etc.)
    provider_id UUID REFERENCES public.system_users(id), -- Transport Company
    station_id UUID REFERENCES public.stations(id), -- billing usually per station context
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_amount NUMERIC(10,2) DEFAULT 0,
    total_trips INTEGER DEFAULT 0,
    status TEXT DEFAULT 'DRAFT', -- DRAFT, GENERATED, APPROVED, PAID
    generated_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    pdf_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Update Schedules to link Driver/Vehicle and Settlement
ALTER TABLE public.transport_schedules
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.transport_drivers(id),
ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.transport_vehicles(id),
ADD COLUMN IF NOT EXISTS settlement_id UUID REFERENCES public.transport_settlements(id);

-- 5. RLS POLICIES
-- Enable RLS
ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_settlements ENABLE ROW LEVEL SECURITY;

-- Vehicles Policies
CREATE POLICY "Vehicles visibility" ON public.transport_vehicles
FOR ALL USING (
    -- Admin sees all
    (auth.jwt() ->> 'role' = 'ADMIN' OR EXISTS (SELECT 1 FROM public.system_users WHERE id = auth.uid() AND role = 'ADMIN'))
    OR
    -- Provider sees own
    (provider_id = auth.uid())
);

-- Drivers Policies
CREATE POLICY "Drivers visibility" ON public.transport_drivers
FOR ALL USING (
    -- Admin sees all
    (auth.jwt() ->> 'role' = 'ADMIN' OR EXISTS (SELECT 1 FROM public.system_users WHERE id = auth.uid() AND role = 'ADMIN'))
    OR
    -- Provider sees own
    (provider_id = auth.uid())
);

-- Settlements Policies
CREATE POLICY "Settlements visibility" ON public.transport_settlements
FOR ALL USING (
    -- Admin sees all
    (auth.jwt() ->> 'role' = 'ADMIN' OR EXISTS (SELECT 1 FROM public.system_users WHERE id = auth.uid() AND role = 'ADMIN'))
    OR
    -- Provider sees own
    (provider_id = auth.uid())
);

-- 6. Grant Access
GRANT ALL ON public.transport_vehicles TO authenticated;
GRANT ALL ON public.transport_drivers TO authenticated;
GRANT ALL ON public.transport_settlements TO authenticated;

COMMIT;
