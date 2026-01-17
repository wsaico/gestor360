import supabase from './supabase'

/**
 * Service for Mobility/Transport Module
 * Manages Routes, Schedules, and Execution Tracking
 */
class TransportService {
    // ==========================================
    // ROUTES (Tarifario)
    // ==========================================

    /**
     * Get all transport routes visible to the current user
     */
    async getRoutes() {
        try {
            // Using RPC to bypass RLS for reading as well
            const { data, error } = await supabase.rpc('get_transport_routes')

            if (error) throw error
            return data
        } catch (error) {
            console.error('Error fetching routes:', error)
            throw error
        }
    }

    async createRoute(route) {
        try {
            // Ensure new coordinate fields are included
            const { data, error } = await supabase
                .from('transport_routes')
                .insert([{
                    name: route.name,
                    station_id: route.station_id,
                    organization_id: route.organization_id,
                    billing_type: route.billing_type,
                    base_price: route.base_price,
                    active: route.active,
                    // New Fields
                    destination_lat: route.destination_lat,
                    destination_lng: route.destination_lng,
                    destination_address: route.destination_address,
                    origin_lat: route.origin_lat,
                    origin_lng: route.origin_lng,
                    origin_address: route.origin_address
                }])
                .select('*')
                .single()

            if (error) throw error
            return data
        } catch (error) {
            console.error('Error creating route:', error)
            throw error
        }
    }

    async updateRoute(id, updates) {
        try {
            const { data, error } = await supabase
                .from('transport_routes')
                .update({
                    name: updates.name,
                    organization_id: updates.organization_id,
                    billing_type: updates.billing_type,
                    base_price: updates.base_price,
                    active: updates.active,
                    // New Fields
                    destination_lat: updates.destination_lat,
                    destination_lng: updates.destination_lng,
                    destination_address: updates.destination_address,
                    origin_lat: updates.origin_lat,
                    origin_lng: updates.origin_lng,
                    origin_address: updates.origin_address
                })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        } catch (error) {
            console.error('Error updating route:', error)
            throw error
        }
    }

    async deleteRoute(id) {
        try {
            const { error } = await supabase
                .from('transport_routes')
                .delete()
                .eq('id', id)

            if (error) throw error
            return true
        } catch (error) {
            console.error('Error deleting route:', error)
            throw error
        }
    }

    // ==========================================
    // SCHEDULES (Programación)
    // ==========================================

    /**
     * Get schedules filtered by date range or specific user
     * @param {Object} filters { dateFrom, dateTo, providerId, stationId }
     */
    async getSchedules({ dateFrom, dateTo, providerId, stationId } = {}) {
        try {

            // Using RPC to bypass RLS for reading schedules
            const { data, error } = await supabase.rpc('get_transport_schedules', {
                p_date_from: dateFrom || null,
                p_date_to: dateTo || null,
                p_provider_id: providerId || null,
                p_station_id: stationId || null
            })

            if (error) throw error
            return data
        } catch (error) {
            console.error('Error fetching schedules:', error)
            throw error
        }
    }

    async createSchedule(scheduleData) {
        try {
            const { data, error } = await supabase.rpc('create_transport_schedule', {
                p_route_id: scheduleData.route_id,
                p_provider_id: scheduleData.provider_id,
                p_scheduled_date: scheduleData.scheduled_date,
                p_departure_time: scheduleData.departure_time,
                p_vehicle_plate: scheduleData.vehicle_plate || null, // Optional for now
                p_passengers_manifest: scheduleData.passengers_manifest || [],
                p_station_id: scheduleData.station_id
            })

            if (error) throw error
            return data
        } catch (error) {
            console.error('Error creating schedule:', error)
            throw error
        }
    }

    /**
     * Duplicates a schedule as a return trip:
     * 1. Swaps Origin/Destination logic (finds reverse route)
     * 2. Copies passengers
     * 3. Sets new date/time
     */
    async duplicateScheduleAsReturn({ originalScheduleId, targetDate, targetTime }) {
        try {
            // 1. Get Original Schedule
            const { data: original, error: fetchError } = await supabase
                .from('transport_schedules')
                .select(`
                    *,
                    route:transport_routes(*)
                `)
                .eq('id', originalScheduleId)
                .single()

            if (fetchError) throw fetchError;

            // 2. Find Reverse Route
            // Strategy: Look for route where Origin~=Dest AND Dest~=Origin
            // Since we don't have perfect geocoding, we rely on fuzzy match or exact coordinate match if available.
            // Simplified MVP: Look for route with same Org that is NOT the current one, 
            // and maybe has specific name pattern? 
            // BETTER: Let's assume the user has created "Jauja - Aeropuerto" and "Aeropuerto - Jauja".
            // We search for a route belonging to same Organization that is != currentRoute.

            // Try to find exact reverse based on stored addresses if possible, or just pick the "Other" route for this org if only 2 exist.
            const { data: allRoutes } = await supabase
                .from('transport_routes')
                .select('*')
                .eq('active', true)
                .eq('organization_id', original.route.organization_id)

            // Logic: Find route distinct from current one. 
            // If strictly 2 routes exist for this org (A and B), and current is A, pick B.
            let targetRoute = null;
            if (allRoutes && allRoutes.length === 2) {
                targetRoute = allRoutes.find(r => r.id !== original.route_id);
            } else if (allRoutes && allRoutes.length > 2) {
                // Try fuzzy name match? "Jauja - Aero" vs "Aero - Jauja"
                // This is risky. Fallback to: Same Route (so user edits it) OR first distinct one?
                // Safe bet: If no obvious pair, re-use SAME route but user must verify. 
                // OR: Create a "Reverse" property in DB later.
                // For now: First distinct route found.
                targetRoute = allRoutes.find(r => r.id !== original.route_id);
            }

            // Fallback: Use same route if nothing else found (user must manually edit cost/route if needed)
            const routeToUse = targetRoute || original.route;

            // 3. Create New Schedule
            const { data: newSchedule, error: createError } = await supabase.rpc('create_transport_schedule', {
                p_route_id: routeToUse.id,
                p_provider_id: original.provider_id, // Keep same provider? Yes typically.
                p_scheduled_date: targetDate,
                p_departure_time: targetTime,
                p_vehicle_plate: null, // Reset vehicle to be safe or keep original? Reset preferred.
                p_passengers_manifest: original.passengers_manifest,
                p_station_id: original.station_id
            })

            if (createError) throw createError;
            return newSchedule;

        } catch (error) {
            console.error('Error duplicating schedule:', error)
            throw error
        }
    }

    async updateScheduleStatus(id, status) {
        try {
            const { data, error } = await supabase
                .from('transport_schedules')
                .update({ status })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        } catch (error) {
            console.error('Error updating schedule status:', error)
            throw error
        }
    }

    // ==========================================
    // EXECUTION & TRACKING
    // ==========================================

    async updateSchedule(id, updates) {
        try {
            const { data, error } = await supabase
                .from('transport_schedules')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        } catch (error) {
            console.error('Error updating schedule:', error)
            throw error
        }
    }

    /**
     * Start execution for a schedule. Creates the execution record if not exists.
     */
    async startExecution(scheduleId, initialLocation = null) {
        try {
            const { data, error } = await supabase.rpc('start_transport_execution', {
                p_schedule_id: scheduleId,
                p_initial_location: initialLocation
            })

            if (error) throw error
            return data
        } catch (error) {
            console.error('Error starting execution:', error)
            throw error
        }
    }

    /**
     * Finish execution securely via RPC
     */
    async finishExecution(scheduleId, checkIns) {
        try {
            const { data, error } = await supabase.rpc('finish_transport_execution', {
                p_schedule_id: scheduleId,
                p_check_ins: checkIns
            })

            if (error) throw error
            return data
        } catch (error) {
            console.error('Error finishing execution:', error)
            throw error
        }
    }

    /**
     * Update GPS location for active execution
     * @param {string} executionId 
     * @param {Object} location { lat, lng, timestamp }
     */
    async updateLocation(executionId, location) {
        try {
            const { error } = await supabase.rpc('append_transport_location', {
                p_execution_id: executionId,
                p_location: location
            })

            if (error) throw error
            return true
        } catch (error) {
            console.error('Error updating location:', error)
            throw error
        }
    }

    /**
     * Subscribe to realtime updates for a specific execution (for Admin Map)
     */
    subscribeToExecution(scheduleId, onUpdate) {
        return supabase
            .channel(`execution-${scheduleId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'transport_execution',
                    filter: `schedule_id=eq.${scheduleId}`
                },
                (payload) => {
                    onUpdate(payload.new)
                }
            )
            .subscribe()
    }

    // ==========================================
    // FLEET MANAGEMENT (Conductores & Vehículos)
    // ==========================================

    async validateDriverDni(dni) {
        try {
            const { data, error } = await supabase.rpc('validate_driver_dni', { p_dni: dni })
            if (error) throw error
            return data
        } catch (error) {
            console.error('Error validating driver DNI:', error)
            throw error
        }
    }

    async getDrivers({ providerId } = {}) {
        try {
            let q = supabase
                .from('transport_drivers')
                .select('*')
                .order('created_at', { ascending: false })

            if (providerId) q = q.eq('provider_id', providerId)
            // Note: station_id column doesn't exist in transport_drivers table
            // Drivers are associated with providers, not directly with stations

            const { data, error } = await q
            if (error) throw error
            return data
        } catch (error) {
            console.error('Error fetching drivers:', error)
            throw error
        }
    }

    async getProviders() {
        try {
            const { data, error } = await supabase
                .from('system_users')
                .select('id, username, role')
                .eq('role', 'TRANSPORT_PROVIDER')

            if (error) throw error
            return data
        } catch (error) {
            console.error('Error fetching providers:', error)
            throw error
        }
    }

    async getDriverSchedules(driverId) {
        try {
            const { data, error } = await supabase.rpc('get_driver_schedules', { p_driver_id: driverId })
            if (error) throw error
            return data
        } catch (error) {
            console.error('Error fetching driver schedules:', error)
            throw error
        }
    }

    async createDriver(driverData) {
        try {
            const { data, error } = await supabase
                .from('transport_drivers')
                .insert([driverData])
                .select()
                .single()
            if (error) throw error
            return data
        } catch (error) {
            console.error('Error creating driver:', error)
            throw error
        }
    }

    async updateDriver(id, updates) {
        try {
            const { data, error } = await supabase
                .from('transport_drivers')
                .update(updates)
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return data
        } catch (error) {
            console.error('Error updating driver:', error)
            throw error
        }
    }

    async getPassengersForSchedule(scheduleId) {
        try {
            const { data, error } = await supabase.rpc('get_passengers_for_schedule', {
                p_schedule_id: scheduleId
            })
            if (error) throw error
            return data || []
        } catch (error) {
            console.error('Error fetching passengers for schedule:', error)
            throw error
        }
    }

    async deleteDriver(id) {
        try {
            const { error } = await supabase.from('transport_drivers').delete().eq('id', id)
            if (error) throw error
            return true
        } catch (error) {
            console.error('Error deleting driver:', error)
            throw error
        }
    }

    async getVehicles({ providerId } = {}) {
        try {
            let q = supabase
                .from('transport_vehicles')
                .select('*')
                .order('created_at', { ascending: false })

            if (providerId) q = q.eq('provider_id', providerId)
            // Note: station_id column doesn't exist in transport_vehicles table
            // Vehicles are associated with providers, not directly with stations

            const { data, error } = await q
            if (error) throw error
            return data
        } catch (error) {
            console.error('Error fetching vehicles:', error)
            throw error
        }
    }

    async createVehicle(vehicleData) {
        try {
            const { data, error } = await supabase
                .from('transport_vehicles')
                .insert([vehicleData])
                .select()
                .single()
            if (error) throw error
            return data
        } catch (error) {
            console.error('Error creating vehicle:', error)
            throw error
        }
    }

    async updateVehicle(id, updates) {
        try {
            const { data, error } = await supabase
                .from('transport_vehicles')
                .update(updates)
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return data
        } catch (error) {
            console.error('Error updating vehicle:', error)
            throw error
        }
    }

    async deleteVehicle(id) {
        try {
            const { error } = await supabase.from('transport_vehicles').delete().eq('id', id)
            if (error) throw error
            return true
        } catch (error) {
            console.error('Error deleting vehicle:', error)
            throw error
        }
    }

    // ==========================================
    // BILLING / SETTLEMENTS (Cierres)
    // ==========================================

    async getSettlements(filters = {}) {
        let q = supabase
            .from('transport_settlements')
            .select(`
                *,
                provider:system_users(id, username),
                organization:organizations(id, name)
            `)
            .order('created_at', { ascending: false })

        if (filters.providerId) q = q.eq('provider_id', filters.providerId)

        const { data, error } = await q
        if (error) throw error
        return data
    }

    async getSettlementDetails(settlementId) {
        // Get Trips for this settlement
        const { data, error } = await supabase
            .from('transport_schedules')
            .select(`
                *,
                route:transport_routes(name, organization:organizations(name)),
                provider:system_users(username),
                driver:transport_drivers(first_name, last_name, dni),
                vehicle:transport_vehicles(plate_number)
            `)
            .eq('settlement_id', settlementId)
            .order('scheduled_date', { ascending: true })
            .order('departure_time', { ascending: true })

        if (error) throw error
        return data
    }

    // --- RECONCILIATION METHODS ---

    async getUnbilledTrips(filters = {}) {
        try {
            const { data, error } = await supabase.rpc('get_unbilled_trips_unified', {
                p_provider_id: filters.providerId || null,
                p_date_from: filters.dateFrom || null,
                p_date_to: filters.dateTo || null,
                p_station_id: filters.stationId || null
            })

            if (error) throw error

            // Map flat RPC result to nested structure expected by UI
            return data.map(trip => ({
                ...trip,
                route: {
                    name: trip.route_name,
                    organization: { name: trip.organization_name }
                },
                provider: { username: trip.provider_username },
                driver: {
                    first_name: trip.driver_first_name,
                    last_name: trip.driver_last_name
                },
                vehicle: { plate_number: trip.vehicle_plate }
            }))
        } catch (error) {
            console.error('Error fetching unbilled trips:', error)
            throw error
        }
    }

    async updateScheduleCost(id, newCost, notes) {
        // Only allow if not settled
        const { error } = await supabase
            .from('transport_schedules')
            .update({ cost: newCost }) // Notes logic would require a column, skipping for MVP or using metadata
            .eq('id', id)
            .is('settlement_id', null)

        if (error) throw error
        return true
    }

    /**
     * Generates a new settlement for a provider within a date range
     */
    async generateSettlement(providerId, dateFrom, dateTo) {
        try {
            // 1. Find eligible schedules (Completed, no settlement yet)
            const { data: trips, error: tripError } = await supabase
                .from('transport_schedules')
                .select('*')
                .eq('provider_id', providerId)
                .eq('status', 'COMPLETED')
                .is('settlement_id', null)
                .gte('scheduled_date', dateFrom)
                .lte('scheduled_date', dateTo)

            if (tripError) throw tripError
            if (!trips || trips.length === 0) return { count: 0, total: 0 }

            // 2. Calculate Total
            const totalAmount = trips.reduce((sum, t) => sum + (Number(t.cost) || 0), 0)

            // 3. Create Settlement
            const { data: settlement, error: settlingError } = await supabase
                .from('transport_settlements')
                .insert([{
                    provider_id: providerId,
                    period_start: dateFrom,
                    period_end: dateTo,
                    total_amount: totalAmount,
                    total_trips: trips.length,
                    status: 'GENERATED'
                }])
                .select()
                .single()

            if (settlingError) throw settlingError

            // 4. Link Trips to Settlement (Batch Update)
            const tripIds = trips.map(t => t.id)
            const { error: updateError } = await supabase
                .from('transport_schedules')
                .update({ settlement_id: settlement.id })
                .in('id', tripIds)

            if (updateError) throw updateError

            return settlement
        } catch (error) {
            console.error("Error generating settlement:", error)
            throw error
        }
    }

    /**
     * Attempts to finish execution, but saves to LocalStorage queue if offline/error.
     * Returns { success: boolean, offline: boolean }
     */
    async finishExecutionOfflineSafe(scheduleId, checkIns) {
        try {
            await this.finishExecution(scheduleId, checkIns)
            return { success: true, offline: false }
        } catch (error) {
            console.warn("Network error finishing trip. Saving to offline queue.", error)

            // Add to Queue
            const queue = JSON.parse(localStorage.getItem('pending_finished_trips') || '[]')
            queue.push({
                scheduleId,
                checkIns,
                timestamp: new Date().toISOString()
            })
            localStorage.setItem('pending_finished_trips', JSON.stringify(queue))

            return { success: true, offline: true }
        }
    }

    /**
     * Process pending offline items
     */
    async processOfflineQueue() {
        const queue = JSON.parse(localStorage.getItem('pending_finished_trips') || '[]')
        if (queue.length === 0) return { count: 0, errors: 0 }

        let successCount = 0
        let errorCount = 0
        const newQueue = []

        for (const item of queue) {
            try {
                await this.finishExecution(item.scheduleId, item.checkIns)
                successCount++
            } catch (err) {
                console.error("Failed to sync item", item, err)
                errorCount++
                newQueue.push(item) // Keep in queue to retry later
            }
        }

        localStorage.setItem('pending_finished_trips', JSON.stringify(newQueue))
        return { count: successCount, errors: errorCount }
    }
}

export default new TransportService()
