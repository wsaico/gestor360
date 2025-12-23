-- MIGRATION: 20241222_create_transport_module.sql
-- OBJECTIVE: Implement core tables for Transport/Mobility module
-- AUTHOR: Antigravity Agent
-- DATE: 2024-12-22

-- 1. ENUMS
CREATE TYPE transport_billing_type AS ENUM ('FIXED_ROUTE', 'PER_PASSENGER');
CREATE TYPE transport_schedule_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- 2. TABLES

-- A. Transport Routes (Tarifario)
CREATE TABLE IF NOT EXISTS public.transport_routes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    station_id UUID NOT NULL REFERENCES public.stations(id),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    billing_type transport_billing_type NOT NULL DEFAULT 'FIXED_ROUTE',
    base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- B. Transport Schedules (Programación)
CREATE TABLE IF NOT EXISTS public.transport_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    route_id UUID NOT NULL REFERENCES public.transport_routes(id),
    station_id UUID NOT NULL REFERENCES public.stations(id), -- Denormalized for RLS performance
    provider_id UUID NOT NULL REFERENCES public.system_users(id),
    scheduled_date DATE NOT NULL,
    departure_time TIME NOT NULL,
    passengers_manifest UUID[] DEFAULT '{}', -- Array of employee_ids
    status transport_schedule_status DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- C. Transport Execution (Ejecución y Auditoría)
CREATE TABLE IF NOT EXISTS public.transport_execution (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID NOT NULL REFERENCES public.transport_schedules(id) ON DELETE CASCADE,
    gps_track JSONB DEFAULT '[]'::jsonb, -- Array of {lat, lng, timestamp}
    check_ins JSONB DEFAULT '[]'::jsonb, -- Array of {employee_id, timestamp, lat, lng}
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    final_cost NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. INDEXES (for Performance)
CREATE INDEX idx_transport_routes_station ON public.transport_routes(station_id);
CREATE INDEX idx_transport_routes_org ON public.transport_routes(organization_id);
CREATE INDEX idx_transport_schedules_station ON public.transport_schedules(station_id);
CREATE INDEX idx_transport_schedules_provider ON public.transport_schedules(provider_id);
CREATE INDEX idx_transport_schedules_date ON public.transport_schedules(scheduled_date);
CREATE INDEX idx_transport_execution_schedule ON public.transport_execution(schedule_id);

-- 4. RLS POLICIES

ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_execution ENABLE ROW LEVEL SECURITY;

-- 4.1 Routes Policies
CREATE POLICY "Global Admin sees all routes" ON public.transport_routes
    FOR ALL TO authenticated USING (public.is_global_admin());

CREATE POLICY "Station Admin sees station routes" ON public.transport_routes
    FOR ALL TO authenticated USING (station_id = public.get_user_station());

CREATE POLICY "Providers see station routes" ON public.transport_routes
    FOR SELECT TO authenticated USING (station_id = public.get_user_station());

-- 4.2 Schedules Policies
CREATE POLICY "Global Admin sees all schedules" ON public.transport_schedules
    FOR ALL TO authenticated USING (public.is_global_admin());

CREATE POLICY "Station Admin sees station schedules" ON public.transport_schedules
    FOR ALL TO authenticated USING (station_id = public.get_user_station());

-- Provider can see their own schedules
CREATE POLICY "Provider sees own schedules" ON public.transport_schedules
    FOR SELECT TO authenticated USING (provider_id = auth.uid());

-- Provider can update statuses of their own schedules
CREATE POLICY "Provider updates own schedules" ON public.transport_schedules
    FOR UPDATE TO authenticated USING (provider_id = auth.uid());

-- 4.3 Execution Policies
-- Inherits visibility from schedule. 
-- Validating execution RLS is complex via joins, so we allow based on the linked schedule logic implicitly or denormalize.
-- For efficiency, we'll verify via EXISTS against schedules table since Execution is 1:1 with Schedule.

CREATE POLICY "Admin/Provider sees execution linked to visible schedule" ON public.transport_execution
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.transport_schedules s
            WHERE s.id = transport_execution.schedule_id
            AND (
                public.is_global_admin() 
                OR s.station_id = public.get_user_station()
                OR s.provider_id = auth.uid()
            )
        )
    );

-- 5. REALTIME
-- Enable Realtime for transport_execution to track GPS
ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_execution;

-- 6. AUTOMATED COST CALCULATION TRIGGER
CREATE OR REPLACE FUNCTION public.calculate_transport_cost()
RETURNS TRIGGER AS $$
DECLARE
    v_billing_type transport_billing_type;
    v_base_price NUMERIC;
    v_check_in_count INT;
BEGIN
    -- Only run when status changes to COMPLETED
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        -- Get Route Details
        SELECT r.billing_type, r.base_price 
        INTO v_billing_type, v_base_price
        FROM public.transport_routes r
        WHERE r.id = NEW.route_id;

        -- Calculate Cost
        IF v_billing_type = 'FIXED_ROUTE' THEN
             -- Update execution final cost (assuming 1 execution per schedule)
             UPDATE public.transport_execution 
             SET final_cost = v_base_price, end_time = NOW()
             WHERE schedule_id = NEW.id;
        ELSIF v_billing_type = 'PER_PASSENGER' THEN
             -- Count check-ins from execution
             -- This requires extracting the count from the JSONB in transport_execution
             -- Ideally logic should be in the execution update, but trigger is on schedule status change.
             -- Let's fetch the execution record.
             
             UPDATE public.transport_execution 
             SET final_cost = v_base_price * COALESCE(jsonb_array_length(check_ins), 0),
                 end_time = NOW()
             WHERE schedule_id = NEW.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_calculate_transport_cost
AFTER UPDATE OF status ON public.transport_schedules
FOR EACH ROW
EXECUTE FUNCTION public.calculate_transport_cost();

