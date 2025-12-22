import { supabase } from './supabase'

export const announcementService = {
    /**
     * List announcements (Admin View)
     * Fetches all announcements (active or not) for management.
      */
    async getAllAnnouncements() {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error
        return data
    },

    /**
     * Get Public Announcements (Kiosk View)
     * Fetches only ACTIVE and DATE-VALID announcements for a specific station (or global).
     */
    async getPublicAnnouncements(stationId) {
        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

        let query = supabase
            .from('announcements')
            .select('*')
            .eq('is_active', true)
            .lte('start_date', today)
            .gte('end_date', today)
            .order('priority', { ascending: false }) // High priority first? Or created_at?
            .order('created_at', { ascending: false })

        // Logic: Show Global (null station_id) OR Station Specific
        // Supabase OR syntax: or=(station_id.is.null,station_id.eq.XYZ)
        if (stationId) {
            query = query.or(`station_id.is.null,station_id.eq.${stationId}`)
        } else {
            query = query.is('station_id', null)
        }

        const { data, error } = await query
        if (error) throw error
        return data
    },

    /**
     * Create a new announcement
     */
    async createAnnouncement(announcement) {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()

        const payload = {
            ...announcement,
            created_by: user?.id
        }

        const { data, error } = await supabase
            .from('announcements')
            .insert([payload])
            .select()

        if (error) throw error
        return data[0]
    },

    /**
     * Update an announcement
     */
    async updateAnnouncement(id, updates) {
        const { data, error } = await supabase
            .from('announcements')
            .update(updates)
            .eq('id', id)
            .select()

        if (error) throw error
        return data[0]
    },

    /**
     * Delete an announcement
     */
    async deleteAnnouncement(id) {
        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', id)

        if (error) throw error
        return true
    },

    /**
     * Upload Media (Image/Video) to Storage
     */
    async uploadMedia(file) {
        // 1. Validate file type/size if needed
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('announcements')
            .upload(filePath, file)

        if (uploadError) throw uploadError

        // 2. Get Public URL
        const { data } = supabase.storage
            .from('announcements')
            .getPublicUrl(filePath)

        return data.publicUrl
    }
}
