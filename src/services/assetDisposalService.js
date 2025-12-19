import { supabase } from './supabase'

/**
 * Servicio de Gestión de Bajas de Activos
 * Sistema inteligente con workflow de aprobaciones
 */
class AssetDisposalService {
  /**
   * Obtiene todas las bajas de una estación
   * @param {string} stationId - ID de la estación
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Array>} - Lista de bajas
   */
  async getAll(stationId, filters = {}) {
    try {
      let query = supabase
        .from('asset_disposals')
        .select(`
          *,
          asset:assets(id, asset_code, asset_name, asset_category, current_value),
          requested_by_user:system_users!requested_by(username, email),
          approved_by_user:system_users!approved_by(username)
        `)
        .eq('station_id', stationId)
        .order('created_at', { ascending: false })

      if (filters.disposal_type) {
        query = query.eq('disposal_type', filters.disposal_type)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.start_date) {
        query = query.gte('disposal_date', filters.start_date)
      }

      if (filters.end_date) {
        query = query.lte('disposal_date', filters.end_date)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching disposals:', error)
      throw new Error(error.message || 'Error al cargar bajas de activos')
    }
  }

  /**
   * Crea una solicitud de baja de activo
   * @param {Object} disposalData - Datos de la baja
   * @param {string} userId - ID del usuario que solicita
   * @returns {Promise<Object>} - Baja creada
   */
  async create(disposalData, userId) {
    try {
      const { data, error } = await supabase
        .from('asset_disposals')
        .insert([{
          ...disposalData,
          status: 'PENDIENTE',
          requested_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      // Actualizar estado del activo a BAJA (en revisión)
      await supabase
        .from('assets')
        .update({
          status: 'BAJA',
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', disposalData.asset_id)

      return data
    } catch (error) {
      console.error('Error creating disposal:', error)
      throw new Error(error.message || 'Error al crear solicitud de baja')
    }
  }

  /**
   * Aprueba una solicitud de baja
   * @param {string} id - ID de la baja
   * @param {string} userId - ID del usuario que aprueba
   * @param {string} approvalDocument - Documento de aprobación
   * @returns {Promise<Object>} - Baja aprobada
   */
  async approve(id, userId, approvalDocument) {
    try {
      const { data, error } = await supabase
        .from('asset_disposals')
        .update({
          status: 'APROBADO',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          approval_document: approvalDocument,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error approving disposal:', error)
      throw new Error(error.message || 'Error al aprobar baja')
    }
  }

  /**
   * Rechaza una solicitud de baja
   * @param {string} id - ID de la baja
   * @param {string} userId - ID del usuario que rechaza
   * @param {string} reason - Razón del rechazo
   * @returns {Promise<Object>} - Baja rechazada
   */
  async reject(id, userId, reason) {
    try {
      // Obtener la baja para acceder al asset_id
      const { data: disposal } = await supabase
        .from('asset_disposals')
        .select('asset_id')
        .eq('id', id)
        .single()

      // Actualizar la baja
      const { data, error } = await supabase
        .from('asset_disposals')
        .update({
          status: 'RECHAZADO',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          notes: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Restaurar el estado del activo a DISPONIBLE
      await supabase
        .from('assets')
        .update({
          status: 'DISPONIBLE',
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', disposal.asset_id)

      return data
    } catch (error) {
      console.error('Error rejecting disposal:', error)
      throw new Error(error.message || 'Error al rechazar baja')
    }
  }

  /**
   * Completa el proceso de baja (marca como completado)
   * @param {string} id - ID de la baja
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} - Baja completada
   */
  async complete(id, userId) {
    try {
      // Obtener la baja
      const { data: disposal } = await supabase
        .from('asset_disposals')
        .select('asset_id, status')
        .eq('id', id)
        .single()

      if (disposal.status !== 'APROBADO') {
        throw new Error('Solo se pueden completar bajas aprobadas')
      }

      // Actualizar la baja
      const { data, error } = await supabase
        .from('asset_disposals')
        .update({
          status: 'COMPLETADO',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Marcar el activo como inactivo (soft delete)
      await supabase
        .from('assets')
        .update({
          is_active: false,
          status: 'BAJA',
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', disposal.asset_id)

      return data
    } catch (error) {
      console.error('Error completing disposal:', error)
      throw new Error(error.message || 'Error al completar baja')
    }
  }

  /**
   * Cancela una solicitud de baja
   * @param {string} id - ID de la baja
   * @param {string} userId - ID del usuario
   * @returns {Promise<boolean>} - Éxito de la operación
   */
  async cancel(id, userId) {
    try {
      // Obtener la baja
      const { data: disposal } = await supabase
        .from('asset_disposals')
        .select('asset_id, status')
        .eq('id', id)
        .single()

      if (disposal.status === 'COMPLETADO') {
        throw new Error('No se puede cancelar una baja ya completada')
      }

      // Eliminar la baja
      await supabase
        .from('asset_disposals')
        .delete()
        .eq('id', id)

      // Restaurar el estado del activo
      await supabase
        .from('assets')
        .update({
          status: 'DISPONIBLE',
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', disposal.asset_id)

      return true
    } catch (error) {
      console.error('Error canceling disposal:', error)
      throw new Error(error.message || 'Error al cancelar baja')
    }
  }

  /**
   * Obtiene bajas pendientes de aprobación
   * @param {string} stationId - ID de la estación
   * @returns {Promise<Array>} - Bajas pendientes
   */
  async getPendingApprovals(stationId) {
    try {
      const { data, error } = await supabase
        .from('asset_disposals')
        .select(`
          *,
          asset:assets(asset_code, asset_name, current_value),
          requested_by_user:system_users!requested_by(username, email)
        `)
        .eq('station_id', stationId)
        .eq('status', 'PENDIENTE')
        .order('created_at', { ascending: true })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching pending disposals:', error)
      throw new Error(error.message || 'Error al cargar bajas pendientes')
    }
  }

  /**
   * Obtiene estadísticas de bajas
   * @param {string} stationId - ID de la estación
   * @param {string} startDate - Fecha inicial
   * @param {string} endDate - Fecha final
   * @returns {Promise<Object>} - Estadísticas
   */
  async getStats(stationId, startDate, endDate) {
    try {
      let query = supabase
        .from('asset_disposals')
        .select('disposal_type, status, book_value, disposal_value, loss_gain')
        .eq('station_id', stationId)

      if (startDate) {
        query = query.gte('disposal_date', startDate)
      }

      if (endDate) {
        query = query.lte('disposal_date', endDate)
      }

      const { data, error } = await query

      if (error) throw error

      const stats = {
        total: data.length,
        by_type: {},
        by_status: {},
        total_book_value: data.reduce((sum, d) => sum + (d.book_value || 0), 0),
        total_disposal_value: data.reduce((sum, d) => sum + (d.disposal_value || 0), 0),
        total_loss_gain: data.reduce((sum, d) => sum + (d.loss_gain || 0), 0)
      }

      data.forEach(disposal => {
        const type = disposal.disposal_type
        const status = disposal.status

        if (!stats.by_type[type]) stats.by_type[type] = 0
        if (!stats.by_status[status]) stats.by_status[status] = 0

        stats.by_type[type]++
        stats.by_status[status]++
      })

      return stats
    } catch (error) {
      console.error('Error getting disposal stats:', error)
      throw new Error(error.message || 'Error al obtener estadísticas de bajas')
    }
  }
}

export default new AssetDisposalService()
