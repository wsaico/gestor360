import supabase from './supabase'

/**
 * Servicio para gestión de Áreas
 */
class AreaService {
    /**
     * Obtiene todas las áreas de una estación
     * @param {string} stationId - ID de la estación
     * @param {boolean} activeOnly - Si es true, solo devuelve áreas activas
     * @returns {Promise<Array>}
     */
    async getAll(stationId, activeOnly = false) {
        try {
            let query = supabase
                .from('areas')
                .select('*')
                .eq('station_id', stationId)
                .order('name', { ascending: true })

            if (activeOnly) {
                query = query.eq('is_active', true)
            }

            const { data, error } = await query

            if (error) throw error
            return data || []
        } catch (error) {
            console.error('Error fetching areas:', error)
            throw error
        }
    }

    /**
     * Crea una nueva área
     * @param {Object} areaData - Datos del área { station_id, name }
     * @returns {Promise<Object>}
     */
    async create(areaData) {
        try {
            const { data, error } = await supabase
                .from('areas')
                .insert([{
                    ...areaData,
                    is_active: true
                }])
                .select()
                .single()

            if (error) {
                if (error.code === '23505') { // Unique constraint violation
                    throw new Error('Ya existe un área con ese nombre en esta estación')
                }
                throw error
            }
            return data
        } catch (error) {
            console.error('Error creating area:', error)
            throw error
        }
    }

    /**
     * Actualiza el estado de un área (Activar/Desactivar)
     * @param {string} id - ID del área
     * @param {boolean} isActive - Nuevo estado
     * @returns {Promise<Object>}
     */
    async toggleActive(id, isActive) {
        try {
            const { data, error } = await supabase
                .from('areas')
                .update({ is_active: isActive })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        } catch (error) {
            console.error('Error toggling area status:', error)
            throw error
        }
    }

    /**
     * Elimina un área (físicamente)
     * @param {string} id - ID del área
     * @returns {Promise<void>}
     */
    async delete(id) {
        try {
            const { error } = await supabase
                .from('areas')
                .delete()
                .eq('id', id)

            if (error) throw error
        } catch (error) {
            console.error('Error deleting area:', error)
            throw error
        }
    }
}

export default new AreaService()
