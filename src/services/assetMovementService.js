import { supabase } from './supabase'

/**
 * Servicio de Gestión de Movimientos de Activos
 * Trackea todos los movimientos: asignaciones, transferencias, mantenimientos, etc.
 */
class AssetMovementService {
  /**
   * Obtiene todos los movimientos de una estación
   * @param {string} stationId - ID de la estación
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Array>} - Lista de movimientos
   */
  async getAll(stationId, filters = {}) {
    try {
      let query = supabase
        .from('asset_movements')
        .select(`
          *,
          asset:assets(asset_code, asset_name),
          from_station:stations!from_station_id(name, code),
          to_station:stations!to_station_id(name, code),
          from_area:areas!from_area_id(name),
          to_area:areas!to_area_id(name),
          from_organization:organizations!from_organization_id(name, code),
          to_organization:organizations!to_organization_id(name, code),
          from_employee:employees!from_employee_id(full_name, dni),
          to_employee:employees!to_employee_id(full_name, dni),
          performed_by_user:system_users!performed_by(username, email)
        `)
        .eq('station_id', stationId)
        .order('created_at', { ascending: false })

      if (filters.asset_id) {
        query = query.eq('asset_id', filters.asset_id)
      }

      if (filters.movement_type) {
        query = query.eq('movement_type', filters.movement_type)
      }

      if (filters.start_date) {
        query = query.gte('movement_date', filters.start_date)
      }

      if (filters.end_date) {
        query = query.lte('movement_date', filters.end_date)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching asset movements:', error)
      throw new Error(error.message || 'Error al cargar movimientos de activos')
    }
  }

  /**
   * Registra un nuevo movimiento de activo
   * @param {Object} movementData - Datos del movimiento
   * @param {string} userId - ID del usuario que realiza el movimiento
   * @returns {Promise<Object>} - Movimiento creado
   */
  async create(movementData, userId) {
    try {
      const { data, error } = await supabase
        .from('asset_movements')
        .insert([{
          ...movementData,
          performed_by: userId,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error creating asset movement:', error)
      throw new Error(error.message || 'Error al registrar movimiento')
    }
  }

  /**
   * Registra una asignación de activo a empleado
   * @param {string} assetId - ID del activo
   * @param {string} stationId - ID de la estación
   * @param {string} employeeId - ID del empleado
   * @param {string} reason - Razón de la asignación
   * @param {string} userId - ID del usuario que asigna
   * @returns {Promise<Object>} - Movimiento creado
   */
  async registerAssignment(assetId, stationId, employeeId, reason, userId) {
    try {
      // Obtener datos del activo actual
      const { data: asset } = await supabase
        .from('assets')
        .select('station_id, area_id, organization_id, status, condition, assigned_to_employee_id')
        .eq('id', assetId)
        .single()

      const movementData = {
        asset_id: assetId,
        station_id: stationId,
        movement_type: 'ASIGNACION',
        from_station_id: asset.station_id,
        to_station_id: asset.station_id,
        from_area_id: asset.area_id,
        to_area_id: asset.area_id,
        from_organization_id: asset.organization_id,
        to_organization_id: asset.organization_id,
        from_employee_id: asset.assigned_to_employee_id,
        to_employee_id: employeeId,
        movement_date: new Date().toISOString().split('T')[0],
        movement_time: new Date().toTimeString().split(' ')[0],
        reason,
        status_before: asset.status,
        status_after: 'EN_USO',
        condition_before: asset.condition,
        condition_after: asset.condition,
        approved: true
      }

      return await this.create(movementData, userId)
    } catch (error) {
      console.error('Error registering assignment:', error)
      throw new Error(error.message || 'Error al registrar asignación')
    }
  }

  /**
   * Registra una devolución de activo
   * @param {string} assetId - ID del activo
   * @param {string} stationId - ID de la estación
   * @param {string} reason - Razón de la devolución
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} - Movimiento creado
   */
  async registerReturn(assetId, stationId, reason, userId) {
    try {
      const { data: asset } = await supabase
        .from('assets')
        .select('station_id, area_id, organization_id, status, condition, assigned_to_employee_id')
        .eq('id', assetId)
        .single()

      const movementData = {
        asset_id: assetId,
        station_id: stationId,
        movement_type: 'DEVOLUCION',
        from_station_id: asset.station_id,
        to_station_id: asset.station_id,
        from_area_id: asset.area_id,
        to_area_id: asset.area_id,
        from_organization_id: asset.organization_id,
        to_organization_id: asset.organization_id,
        from_employee_id: asset.assigned_to_employee_id,
        to_employee_id: null,
        movement_date: new Date().toISOString().split('T')[0],
        movement_time: new Date().toTimeString().split(' ')[0],
        reason,
        status_before: asset.status,
        status_after: 'DISPONIBLE',
        condition_before: asset.condition,
        condition_after: asset.condition,
        approved: true
      }

      return await this.create(movementData, userId)
    } catch (error) {
      console.error('Error registering return:', error)
      throw new Error(error.message || 'Error al registrar devolución')
    }
  }

  /**
   * Registra una transferencia entre estaciones/áreas/aerolíneas
   * @param {string} assetId - ID del activo
   * @param {Object} transferData - Datos de la transferencia
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} - Movimiento creado
   */
  async registerTransfer(assetId, transferData, userId) {
    try {
      const { data: asset } = await supabase
        .from('assets')
        .select('station_id, area_id, organization_id, status, condition')
        .eq('id', assetId)
        .single()

      let movementType = 'TRANSFERENCIA_AREA'
      if (transferData.to_station_id && transferData.to_station_id !== asset.station_id) {
        movementType = 'TRANSFERENCIA_ESTACION'
      } else if (transferData.to_organization_id && transferData.to_organization_id !== asset.organization_id) {
        movementType = 'TRANSFERENCIA_ORGANIZACION'
      }

      const movementData = {
        asset_id: assetId,
        station_id: asset.station_id,
        movement_type: movementType,
        from_station_id: asset.station_id,
        to_station_id: transferData.to_station_id || asset.station_id,
        from_area_id: asset.area_id,
        to_area_id: transferData.to_area_id !== undefined ? transferData.to_area_id : asset.area_id,
        from_organization_id: asset.organization_id,
        to_organization_id: transferData.to_organization_id !== undefined ? transferData.to_organization_id : asset.organization_id,
        movement_date: new Date().toISOString().split('T')[0],
        movement_time: new Date().toTimeString().split(' ')[0],
        reason: transferData.reason || 'Transferencia de activo',
        notes: transferData.notes,
        status_before: asset.status,
        status_after: transferData.to_station_id ? 'TRANSFERENCIA' : asset.status,
        condition_before: asset.condition,
        condition_after: asset.condition,
        requires_approval: transferData.requires_approval || false,
        approved: transferData.approved !== undefined ? transferData.approved : true
      }

      return await this.create(movementData, userId)
    } catch (error) {
      console.error('Error registering transfer:', error)
      throw new Error(error.message || 'Error al registrar transferencia')
    }
  }

  /**
   * Aprueba un movimiento pendiente
   * @param {string} movementId - ID del movimiento
   * @param {string} userId - ID del usuario que aprueba
   * @param {string} notes - Notas de aprobación
   * @returns {Promise<Object>} - Movimiento actualizado
   */
  async approve(movementId, userId, notes) {
    try {
      const { data, error } = await supabase
        .from('asset_movements')
        .update({
          approved: true,
          approved_by: userId,
          approved_at: new Date().toISOString(),
          approval_notes: notes
        })
        .eq('id', movementId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error approving movement:', error)
      throw new Error(error.message || 'Error al aprobar movimiento')
    }
  }

  /**
   * Rechaza un movimiento pendiente
   * @param {string} movementId - ID del movimiento
   * @param {string} userId - ID del usuario que rechaza
   * @param {string} notes - Notas de rechazo
   * @returns {Promise<boolean>} - Éxito de la operación
   */
  async reject(movementId, userId, notes) {
    try {
      const { error } = await supabase
        .from('asset_movements')
        .update({
          approved: false,
          approved_by: userId,
          approved_at: new Date().toISOString(),
          approval_notes: notes
        })
        .eq('id', movementId)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error rejecting movement:', error)
      throw new Error(error.message || 'Error al rechazar movimiento')
    }
  }

  /**
   * Obtiene movimientos pendientes de aprobación
   * @param {string} stationId - ID de la estación
   * @returns {Promise<Array>} - Movimientos pendientes
   */
  async getPendingApprovals(stationId) {
    try {
      const { data, error } = await supabase
        .from('asset_movements')
        .select(`
          *,
          asset:assets(asset_code, asset_name),
          from_station:stations!from_station_id(name),
          to_station:stations!to_station_id(name),
          performed_by_user:system_users!performed_by(username)
        `)
        .eq('station_id', stationId)
        .eq('requires_approval', true)
        .is('approved_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching pending approvals:', error)
      throw new Error(error.message || 'Error al cargar movimientos pendientes')
    }
  }

  /**
   * Obtiene estadísticas de movimientos
   * @param {string} stationId - ID de la estación
   * @param {string} startDate - Fecha inicial
   * @param {string} endDate - Fecha final
   * @returns {Promise<Object>} - Estadísticas
   */
  async getStats(stationId, startDate, endDate) {
    try {
      let query = supabase
        .from('asset_movements')
        .select('movement_type')
        .eq('station_id', stationId)

      if (startDate) {
        query = query.gte('movement_date', startDate)
      }

      if (endDate) {
        query = query.lte('movement_date', endDate)
      }

      const { data, error } = await query

      if (error) throw error

      const stats = {
        total: data.length,
        by_type: {}
      }

      data.forEach(movement => {
        const type = movement.movement_type
        if (!stats.by_type[type]) {
          stats.by_type[type] = 0
        }
        stats.by_type[type]++
      })

      return stats
    } catch (error) {
      console.error('Error getting movement stats:', error)
      throw new Error(error.message || 'Error al obtener estadísticas de movimientos')
    }
  }
}

export default new AssetMovementService()
