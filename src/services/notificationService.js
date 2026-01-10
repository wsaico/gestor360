import supabase from './supabase'

export const notificationService = {
    /**
     * Obtiene las notificaciones del header (cumpleaños, documentos, epps)
     * @param {string} stationId - ID de la estación
     * @returns {Promise<Object>} - { birthdays: [], docs: [], epps: [] }
     */
    async getNotifications(stationId) {
        try {
            if (!stationId) return { birthdays: [], docs: [], epps: [] }

            const { data, error } = await supabase.rpc('get_header_notifications', {
                p_station_id: stationId
            })

            if (error) throw error
            return data
        } catch (error) {
            console.error('Error fetching header notifications:', error)
            return { birthdays: [], docs: [], epps: [] }
        }
    },

    /**
     * Verifica si se deben enviar notificaciones de renovaciones y otros eventos por correo.
     * Se ejecuta una vez al día, triggered por el login de un Admin/Supervisor.
     * Respeta los toggles de configuración definidos en el backend (Edge Function).
     */
    async checkAndNotifyRenewals(user, station) {
        if (!user || !station) return

        // Solo Admins o Supervisores disparan el chequeo para evitar sobrecarga
        const allowedRoles = ['ADMIN', 'SUPERVISOR', 'GERENTE']
        // Check both role (string) and role_name (if exists)
        const userRole = user.role_name || user.role
        if (!allowedRoles.includes(userRole)) return

        const KEY = `gestor360_last_email_check_${station.id}`
        const lastCheck = localStorage.getItem(KEY)
        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

        // Si ya se revisó hoy, no hacer nada
        if (lastCheck === today) return

        try {
            console.log('Running daily email notification check...')

            // Invocar Edge Function (que internamente revisa los Toggles de App Settings)
            const { data, error } = await supabase.functions.invoke('send-email-alerts', {
                body: {
                    action: 'scheduled_run',
                    station_id: station.id,
                    user_email: user.email // Para log o referencia
                }
            })

            if (error) throw error

            console.log('Email check result:', data)

            // Marcar como revisado hoy
            localStorage.setItem(KEY, today)

        } catch (error) {
            console.error('Error running daily email check:', error)
            // No guardamos el flag para reintentar luego si falló
        }
    }
}

export default notificationService
