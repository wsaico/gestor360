import { supabase } from './supabase'

export const announcementService = {
    /**
     * Obtiene todos los anuncios (para admin)
     */
    async getAll() {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error
        return data
    },

    /**
     * Obtiene solo los anuncios activos y vigentes para hoy 
     * Filtrados por estación (o globales)
     */
    async getActive(stationId = null) {
        // Use local date to avoid timezone issues
        const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]

        let query = supabase
            .from('announcements')
            .select('*')
            .eq('is_active', true)
            .lte('start_date', today)
            .gte('end_date', today)

        if (stationId) {
            // Logic: Show Global (null) OR Specific Station
            // Supabase 'or' syntax: .or(`station_id.is.null,station_id.eq.${stationId}`)
            query = query.or(`station_id.is.null,station_id.eq.${stationId}`)
        } else {
            // If no station provided (e.g. public page before login?), maybe just show Global?
            // Actually, PublicMenuPage should call this AFTER login with stationId.
            // If called without stationId, show only Global.
            query = query.is('station_id', null)
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) throw error
        return data
    },

    /**
     * Crea un nuevo anuncio
     */
    async create(announcement) {
        const { data, error } = await supabase
            .from('announcements')
            .insert([announcement])
            .select()
            .single()

        if (error) throw error
        return data
    },

    /**
     * Actualiza un anuncio existente
     */
    async update(id, updates) {
        const { data, error } = await supabase
            .from('announcements')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    /**
     * Elimina un anuncio
     */
    async delete(id) {
        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', id)

        if (error) throw error
        return true
    }
}
