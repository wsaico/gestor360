import supabase from './supabase'

/**
 * Servicio para gestión de menús diarios
 */
class MenuService {
  /**
   * Obtiene todos los menús de una estación
   * @param {string} stationId - ID de la estación
   * @param {Object} filters - Filtros opcionales { startDate, endDate, providerId }
   * @returns {Promise<Array>}
   */
  async getAll(stationId, filters = {}) {
    try {
      let query = supabase
        .from('menus')
        .select(`
          *,
          provider:system_users!provider_id(id, username, email)
        `)
        .eq('station_id', stationId)
        .eq('is_active', true)
        .order('serve_date', { ascending: false })

      // Filtros opcionales
      if (filters.startDate) {
        query = query.gte('serve_date', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('serve_date', filters.endDate)
      }
      if (filters.providerId) {
        query = query.eq('provider_id', filters.providerId)
      }
      if (filters.meal_type) {
        query = query.eq('meal_type', filters.meal_type)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error fetching menus:', error)
      throw error
    }
  }

  /**
   * Obtiene un menú por ID
   * @param {string} id - ID del menú
   * @returns {Promise<Object>}
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('menus')
        .select(`
          *,
          provider:system_users!provider_id(id, username, email),
          station:stations(id, code, name)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching menu:', error)
      throw error
    }
  }

  /**
   * Obtiene el menú de una fecha específica
   * @param {string} stationId - ID de la estación
   * @param {string} date - Fecha en formato YYYY-MM-DD
   * @returns {Promise<Object|null>}
   */
  async getByDate(stationId, date) {
    try {
      const { data, error } = await supabase
        .from('menus')
        .select(`
          *,
          provider:system_users!provider_id(id, username, email),
          station:stations(id, code, name)
        `)
        .eq('station_id', stationId)
        .eq('serve_date', date)
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null
        }
        throw error
      }
      return data
    } catch (error) {
      console.error('Error fetching menu by date:', error)
      throw error
    }
  }

  /**
   * Crea un nuevo menú
   * @param {Object} menuData - Datos del menú
   * @returns {Promise<Object>}
   */
  async create(menuData) {
    try {
      // Validar que options sea un array con al menos 1 elemento
      if (!Array.isArray(menuData.options) || menuData.options.length === 0) {
        throw new Error('El menú debe tener al menos una opción')
      }

      // Preparar datos solo con campos que existen en la tabla
      const dataToInsert = {
        station_id: menuData.station_id,
        provider_id: menuData.provider_id,
        serve_date: menuData.serve_date,
        options: menuData.options,
        meal_type: menuData.meal_type || 'ALMUERZO',
        is_active: menuData.is_active !== undefined ? menuData.is_active : true
      }

      // Agregar descripción solo si tiene valor
      if (menuData.description && menuData.description.trim() !== '') {
        dataToInsert.description = menuData.description
      }

      const { data, error } = await supabase
        .from('menus')
        .insert([dataToInsert])
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya existe un menú para esta fecha en esta estación')
        }
        throw new Error(error.message || 'Error al crear el menú')
      }
      return data
    } catch (error) {
      console.error('Error creating menu:', error)
      throw error
    }
  }

  /**
   * Actualiza un menú
   * @param {string} id - ID del menú
   * @param {Object} menuData - Datos a actualizar
   * @returns {Promise<Object>}
   */
  async update(id, menuData) {
    try {
      // Validar que options sea un array con al menos 1 elemento si se proporciona
      if (menuData.options && (!Array.isArray(menuData.options) || menuData.options.length === 0)) {
        throw new Error('El menú debe tener al menos una opción')
      }

      // Preparar datos solo con campos que existen en la tabla
      const dataToUpdate = {}

      if (menuData.serve_date) dataToUpdate.serve_date = menuData.serve_date
      if (menuData.options) dataToUpdate.options = menuData.options
      if (menuData.is_active !== undefined) dataToUpdate.is_active = menuData.is_active

      // Campos opcionales
      if (menuData.meal_type) dataToUpdate.meal_type = menuData.meal_type
      if (menuData.description !== undefined) dataToUpdate.description = menuData.description

      const { data, error } = await supabase
        .from('menus')
        .update(dataToUpdate)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message || 'Error al actualizar el menú')
      }
      return data
    } catch (error) {
      console.error('Error updating menu:', error)
      throw error
    }
  }

  /**
   * Elimina un menú (soft delete)
   * @param {string} id - ID del menú
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    try {
      // Verificar si hay pedidos asociados
      const { data: orders } = await supabase
        .from('food_orders')
        .select('id')
        .eq('menu_id', id)
        .limit(1)

      if (orders && orders.length > 0) {
        throw new Error('No se puede eliminar el menú porque tiene pedidos asociados. Use desactivar en su lugar.')
      }

      const { error } = await supabase
        .from('menus')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(error.message || 'Error al eliminar el menú')
      }
      return true
    } catch (error) {
      console.error('Error deleting menu:', error)
      throw error
    }
  }

  /**
   * Desactiva un menú (soft delete)
   * @param {string} id - ID del menú
   * @returns {Promise<Object>}
   */
  async deactivate(id) {
    try {
      const { data, error } = await supabase
        .from('menus')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message || 'Error al desactivar el menú')
      }
      return data
    } catch (error) {
      console.error('Error deactivating menu:', error)
      throw error
    }
  }

  /**
   * Obtiene menús disponibles para pedidos (fecha actual o futura)
   * @param {string} stationId - ID de la estación
   * @param {number} daysAhead - Días adelante para buscar (default: 7)
   * @returns {Promise<Array>}
   */
  async getAvailableMenus(stationId, daysAhead = 7) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + daysAhead)
      const endDate = futureDate.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('menus')
        .select(`
          *,
          provider:system_users!provider_id(id, username, email)
        `)
        .eq('station_id', stationId)
        .eq('is_active', true)
        .gte('serve_date', today)
        .lte('serve_date', endDate)
        .order('serve_date', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching available menus:', error)
      throw error
    }
  }

  /**
   * Obtiene estadísticas de menús
   * @param {string} stationId - ID de la estación
   * @param {string} startDate - Fecha inicio (YYYY-MM-DD)
   * @param {string} endDate - Fecha fin (YYYY-MM-DD)
   * @returns {Promise<Object>}
   */
  async getStats(stationId, startDate, endDate) {
    try {
      const { data: menus, error: menusError } = await supabase
        .from('menus')
        .select('id, serve_date')
        .eq('station_id', stationId)
        .gte('serve_date', startDate)
        .lte('serve_date', endDate)

      if (menusError) throw menusError

      const { data: orders, error: ordersError } = await supabase
        .from('food_orders')
        .select('id, menu_id, cost_applied, status')
        .eq('station_id', stationId)
        .gte('menu_date', startDate)
        .lte('menu_date', endDate)

      if (ordersError) throw ordersError

      return {
        totalMenus: menus?.length || 0,
        totalOrders: orders?.length || 0,
        totalRevenue: orders?.reduce((sum, o) => sum + Number(o.cost_applied), 0) || 0,
        pendingOrders: orders?.filter(o => o.status === 'PENDING').length || 0,
        consumedOrders: orders?.filter(o => o.status === 'CONSUMED').length || 0
      }
    } catch (error) {
      console.error('Error fetching menu stats:', error)
      throw error
    }
  }
}

export default new MenuService()
