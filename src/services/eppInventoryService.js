import supabase from './supabase'

/**
 * Servicio para gestión de inventario de EPPs/Uniformes/Equipos de Emergencia
 */
class EppInventoryService {
  /**
   * Obtiene todos los items de una estación
   * @param {string} stationId - ID de la estación
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Array>}
   */
  async getAll(stationId, filters = {}) {
    try {
      let query = supabase
        .from('epp_items')
        .select('*, area:areas(name)') // Join with areas
        .eq('station_id', stationId)
        .eq('is_active', true)
        .order('name', { ascending: true })

      // Filtros opcionales
      if (filters.item_type) {
        query = query.eq('item_type', filters.item_type)
      }

      if (filters.area_id) {
        query = query.eq('area_id', filters.area_id)
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      if (filters.lowStock) {
        query = query.lt('stock_current', supabase.raw('stock_min'))
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching EPP items:', error)
      throw error
    }
  }

  /**
   * Obtiene un item por ID
   * @param {string} id - ID del item
   * @returns {Promise<Object>}
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('epp_items')
        .select('*, area:areas(name)')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching EPP item:', error)
      throw error
    }
  }

  /**
   * Crea un nuevo item (EPP/Uniforme/Equipo Emergencia)
   * @param {Object} itemData - Datos del item
   * @returns {Promise<Object>}
   */
  async create(itemData) {
    try {
      const { data, error } = await supabase
        .from('epp_items')
        .insert([itemData])
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya existe un elemento con ese nombre y talla en esta estación')
        }
        throw error
      }

      return data
    } catch (error) {
      console.error('Error creating EPP item:', error)
      throw error
    }
  }

  /**
   * Actualiza un item
   * @param {string} id - ID del item
   * @param {Object} itemData - Datos a actualizar
   * @returns {Promise<Object>}
   */
  async update(id, itemData) {
    try {
      const { data, error } = await supabase
        .from('epp_items')
        .update(itemData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating EPP item:', error)
      throw error
    }
  }

  /**
   * Elimina (desactiva) un item
   * @param {string} id - ID del item
   * @returns {Promise<Object>}
   */
  async delete(id) {
    try {
      const { data, error } = await supabase
        .from('epp_items')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error deleting EPP item:', error)
      throw error
    }
  }

  /**
   * Ajusta el stock de un item
   * @param {string} itemId - ID del item
   * @param {number} quantity - Cantidad a ajustar (+ o -)
   * @param {string} movementType - Tipo de movimiento
   * @param {string} reason - Razón del ajuste
   * @param {string} performedBy - ID del usuario
   * @param {string} referenceType - Tipo de referencia (DELIVERY, RENEWAL, etc.)
   * @param {string} referenceId - ID de referencia
   * @returns {Promise<Object>}
   */
  async adjustStock(itemId, quantity, movementType, reason, performedBy, referenceType = null, referenceId = null) {
    try {
      // Obtener item actual
      const item = await this.getById(itemId)

      const stockBefore = item.stock_current
      const stockAfter = stockBefore + quantity

      if (stockAfter < 0) {
        throw new Error('No hay suficiente stock para realizar esta operación')
      }

      // Actualizar stock
      await this.update(itemId, { stock_current: stockAfter })

      // Registrar movimiento
      const { data: movement, error: movementError } = await supabase
        .from('epp_stock_movements')
        .insert([{
          item_id: itemId,
          station_id: item.station_id,
          movement_type: movementType,
          quantity: Math.abs(quantity),
          stock_before: stockBefore,
          stock_after: stockAfter,
          reference_type: referenceType,
          reference_id: referenceId,
          reason: reason,
          performed_by: performedBy
        }])
        .select()
        .single()

      if (movementError) throw movementError

      return movement
    } catch (error) {
      console.error('Error adjusting stock:', error)
      throw error
    }
  }

  /**
   * Obtiene items con stock bajo
   * @param {string} stationId - ID de la estación
   * @returns {Promise<Array>}
   */
  async getLowStock(stationId) {
    try {
      const { data, error } = await supabase
        .from('epp_items')
        .select('*')
        .eq('station_id', stationId)
        .eq('is_active', true)
        .lt('stock_current', supabase.raw('stock_min'))
        .order('stock_current', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching low stock items:', error)
      throw error
    }
  }


  /**
   * Obtiene inventario paginado
   * @param {string} stationId
   * @param {Object} filters { page, limit, search, item_type, area_id }
   */
  async getPaginated(stationId, filters = {}) {
    try {
      const page = filters.page || 1
      const limit = filters.limit || 10
      const from = (page - 1) * limit
      const to = from + limit - 1

      let query = supabase
        .from('epp_items')
        .select(`
          *,
          area:areas!area_id(id, name)
        `, { count: 'exact' })
        .eq('station_id', stationId)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      if (filters.item_type && filters.item_type !== 'ALL') {
        query = query.eq('item_type', filters.item_type)
      }

      if (filters.area_id && filters.area_id !== 'ALL') {
        if (filters.area_id === 'NULL') {
          query = query.is('area_id', null)
        } else {
          query = query.eq('area_id', filters.area_id)
        }
      }

      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error
      return { data: data || [], count: count || 0 }
    } catch (error) {
      console.error('Error fetching paginated inventory:', error)
      throw error
    }
  }



  /**
   * Obtiene historial de movimientos de un item
   * @param {string} itemId - ID del item
   * @param {number} limit - Límite de resultados
   * @returns {Promise<Array>}
   */
  async getStockMovements(itemId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('epp_stock_movements')
        .select(`
          *,
          performed_by_user:system_users!performed_by(username, email)
        `)
        .eq('item_id', itemId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching stock movements:', error)
      throw error
    }
  }

  /**
   * Obtiene estadísticas de inventario
   * @param {string} stationId - ID de la estación
   * @returns {Promise<Object>}
   */
  async getStats(stationId) {
    try {
      const { data: items, error } = await supabase
        .from('epp_items')
        .select('*')
        .eq('station_id', stationId)
        .eq('is_active', true)

      if (error) throw error

      const total = items?.length || 0
      const lowStock = items?.filter(e => e.stock_current < e.stock_min).length || 0
      const outOfStock = items?.filter(e => e.stock_current <= 0).length || 0

      // Por tipo
      const epps = items?.filter(e => e.item_type === 'EPP').length || 0
      const uniformes = items?.filter(e => e.item_type === 'UNIFORME').length || 0
      const equiposEmergencia = items?.filter(e => e.item_type === 'EQUIPO_EMERGENCIA').length || 0

      return {
        total,
        lowStock,
        outOfStock,
        byType: {
          epps,
          uniformes,
          equiposEmergencia
        }
      }
    } catch (error) {
      console.error('Error fetching inventory stats:', error)
      throw error
    }
  }
}

export default new EppInventoryService()
