import { supabase } from './supabase'

/**
 * Servicio de Gestión de Mantenimientos de Activos
 */
class AssetMaintenanceService {
  /**
   * Obtiene todos los mantenimientos de una estación
   * @param {string} stationId - ID de la estación
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Array>} - Lista de mantenimientos
   */
  async getAll(stationId, filters = {}) {
    try {
      let query = supabase
        .from('asset_maintenances')
        .select(`
          *,
          asset:assets(id, asset_code, asset_name, asset_category),
          performed_by:employees!performed_by_employee_id(full_name),
          created_by_user:system_users!created_by(username)
        `)
        .eq('station_id', stationId)
        .order('maintenance_date', { ascending: false })

      if (filters.asset_id) {
        query = query.eq('asset_id', filters.asset_id)
      }

      if (filters.maintenance_type) {
        query = query.eq('maintenance_type', filters.maintenance_type)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.start_date) {
        query = query.gte('maintenance_date', filters.start_date)
      }

      if (filters.end_date) {
        query = query.lte('maintenance_date', filters.end_date)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching maintenances:', error)
      throw new Error(error.message || 'Error al cargar mantenimientos')
    }
  }

  /**
   * Crea un nuevo registro de mantenimiento
   * @param {Object} maintenanceData - Datos del mantenimiento
   * @param {string} userId - ID del usuario que crea
   * @returns {Promise<Object>} - Mantenimiento creado
   */
  async create(maintenanceData, userId) {
    try {
      const { data, error } = await supabase
        .from('asset_maintenances')
        .insert([{
          ...maintenanceData,
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error creating maintenance:', error)
      throw new Error(error.message || 'Error al crear mantenimiento')
    }
  }

  /**
   * Actualiza un mantenimiento
   * @param {string} id - ID del mantenimiento
   * @param {Object} maintenanceData - Datos a actualizar
   * @returns {Promise<Object>} - Mantenimiento actualizado
   */
  async update(id, maintenanceData) {
    try {
      const { data, error } = await supabase
        .from('asset_maintenances')
        .update({
          ...maintenanceData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error updating maintenance:', error)
      throw new Error(error.message || 'Error al actualizar mantenimiento')
    }
  }

  /**
   * Completa un mantenimiento y actualiza el activo
   * @param {string} id - ID del mantenimiento
   * @param {Object} completionData - Datos de finalización
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} - Mantenimiento completado
   */
  async complete(id, completionData, userId) {
    try {
      // Actualizar el mantenimiento
      const { data: maintenance, error: maintenanceError } = await supabase
        .from('asset_maintenances')
        .update({
          status: 'COMPLETADO',
          completed_date: completionData.completed_date || new Date().toISOString().split('T')[0],
          actions_taken: completionData.actions_taken,
          parts_replaced: completionData.parts_replaced,
          labor_cost: completionData.labor_cost || 0,
          parts_cost: completionData.parts_cost || 0,
          next_maintenance_date: completionData.next_maintenance_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (maintenanceError) throw maintenanceError

      // Actualizar el activo con la fecha del próximo mantenimiento
      if (completionData.next_maintenance_date) {
        const { error: assetError } = await supabase
          .from('assets')
          .update({
            last_maintenance_date: completionData.completed_date || new Date().toISOString().split('T')[0],
            next_maintenance_date: completionData.next_maintenance_date,
            status: 'DISPONIBLE', // Retornar a disponible después del mantenimiento
            updated_by: userId,
            updated_at: new Date().toISOString()
          })
          .eq('id', maintenance.asset_id)

        if (assetError) throw assetError
      }

      return maintenance
    } catch (error) {
      console.error('Error completing maintenance:', error)
      throw new Error(error.message || 'Error al completar mantenimiento')
    }
  }

  /**
   * Cancela un mantenimiento programado
   * @param {string} id - ID del mantenimiento
   * @param {string} reason - Razón de cancelación
   * @returns {Promise<boolean>} - Éxito de la operación
   */
  async cancel(id, reason) {
    try {
      const { error } = await supabase
        .from('asset_maintenances')
        .update({
          status: 'CANCELADO',
          notes: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error canceling maintenance:', error)
      throw new Error(error.message || 'Error al cancelar mantenimiento')
    }
  }

  /**
   * Elimina un registro de mantenimiento
   * @param {string} id - ID del mantenimiento
   * @returns {Promise<boolean>} - Éxito de la operación
   */
  async delete(id) {
    try {
      const { error } = await supabase
        .from('asset_maintenances')
        .delete()
        .eq('id', id)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error deleting maintenance:', error)
      throw new Error(error.message || 'Error al eliminar mantenimiento')
    }
  }

  /**
   * Obtiene mantenimientos pendientes/programados
   * @param {string} stationId - ID de la estación
   * @param {number} daysAhead - Días hacia adelante (default 30)
   * @returns {Promise<Array>} - Mantenimientos pendientes
   */
  async getUpcoming(stationId, daysAhead = 30) {
    try {
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + daysAhead)

      const { data, error } = await supabase
        .from('asset_maintenances')
        .select(`
          *,
          asset:assets(id, asset_code, asset_name, asset_category)
        `)
        .eq('station_id', stationId)
        .in('status', ['PROGRAMADO', 'EN_PROCESO'])
        .lte('maintenance_date', endDate.toISOString().split('T')[0])
        .order('maintenance_date', { ascending: true })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching upcoming maintenances:', error)
      throw new Error(error.message || 'Error al cargar mantenimientos próximos')
    }
  }

  /**
   * Obtiene estadísticas de mantenimientos
   * @param {string} stationId - ID de la estación
   * @param {string} startDate - Fecha inicial
   * @param {string} endDate - Fecha final
   * @returns {Promise<Object>} - Estadísticas
   */
  async getStats(stationId, startDate, endDate) {
    try {
      let query = supabase
        .from('asset_maintenances')
        .select('maintenance_type, status, labor_cost, parts_cost')
        .eq('station_id', stationId)

      if (startDate) {
        query = query.gte('maintenance_date', startDate)
      }

      if (endDate) {
        query = query.lte('maintenance_date', endDate)
      }

      const { data, error } = await query

      if (error) throw error

      const stats = {
        total: data.length,
        by_type: {},
        by_status: {},
        total_cost: data.reduce((sum, m) => sum + (m.labor_cost || 0) + (m.parts_cost || 0), 0),
        labor_cost: data.reduce((sum, m) => sum + (m.labor_cost || 0), 0),
        parts_cost: data.reduce((sum, m) => sum + (m.parts_cost || 0), 0)
      }

      data.forEach(maintenance => {
        const type = maintenance.maintenance_type
        const status = maintenance.status

        if (!stats.by_type[type]) stats.by_type[type] = 0
        if (!stats.by_status[status]) stats.by_status[status] = 0

        stats.by_type[type]++
        stats.by_status[status]++
      })

      return stats
    } catch (error) {
      console.error('Error getting maintenance stats:', error)
      throw new Error(error.message || 'Error al obtener estadísticas de mantenimientos')
    }
  }
}

export default new AssetMaintenanceService()
