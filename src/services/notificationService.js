import supabase from './supabase'

const CHECK_INTERVAL = 24 * 60 * 60 * 1000 // 24 horas en milisegundos

class NotificationService {
    /**
     * Verifica si es necesario enviar notificaciones de resumen diario
     * Se ejecuta una vez al día por estación/usuario
     */
    async checkAndNotifyRenewals(stationId, userId) {
        if (!stationId || !userId) return

        const lastCheckKey = `last_notification_check_${stationId}_${userId}`
        const lastCheck = localStorage.getItem(lastCheckKey)
        const now = new Date().getTime()

        // Si ya chequeamos hoy, no hacer nada (Debounce diario)
        if (lastCheck && (now - parseInt(lastCheck)) < CHECK_INTERVAL) {
            
            return
        }

        try {
            

            // Invocar a la Edge Function
            // Esta función se encarga de TODO: leer config, filtrar, agrupar y enviar correos.
            const { data, error } = await supabase.functions.invoke('send-email-alerts', {
                body: { station_id: stationId, triggered_by: userId }
            })

            if (error) {
                // Si la función no existe o falla la red, manejamos el error con elegancia
                console.warn('⚠️ Servicio de alertas no disponible (Edge Function no responde). Se omitirá la verificación.')
                console.debug('Detalles del error:', error)
                return
            }

            

            // Guardar marca de tiempo para no repetir hoy
            localStorage.setItem(lastCheckKey, now.toString())

        } catch (error) {
            console.error('Error en servicio de notificaciones:', error)
        }
    }
}

export default new NotificationService()
