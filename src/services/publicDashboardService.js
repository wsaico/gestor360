import { supabase } from './supabase'

export const publicDashboardService = {
    /**
     * Fetch Public Alerts (Birthdays, Documents) via Secure RPC
     * @param {string} stationId - UUID of the station
     */
    async getStationAlerts(stationId) {
        if (!stationId) return { birthdays: [], docs: [] }

        const { data, error } = await supabase
            .rpc('get_station_public_alerts', { p_station_id: stationId })

        if (error) {
            console.error("Error fetching public alerts:", error)
            // Fail gracefully for kiosk
            return { birthdays: [], docs: [] }
        }

        // Return structure: { birthdays: [], docs: [] }
        return data
    }
}
