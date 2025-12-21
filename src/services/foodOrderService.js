import supabase from './supabase'

/**
 * Servicio para gestión de pedidos de alimentación
 */
class FoodOrderService {
  /**
   * Obtiene todos los pedidos de una estación
   * @param {string} stationId - ID de la estación
   * @param {Object} filters - Filtros opcionales { startDate, endDate, employeeId, status }
   * @returns {Promise<Array>}
   */
  async getAll(stationId, filters = {}) {
    try {
      let query = supabase
        .from('food_orders')
        .select(`
          *,
          employee:employees(id, full_name, dni, role_name, status),
          menu:menus(
            id,
            serve_date,
            options,
            provider:system_users!provider_id(id, username, email)
          )
        `)
        .order('menu_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (stationId) {
        query = query.eq('station_id', stationId)
      }
      // Filtros opcionales
      if (filters.startDate) {
        query = query.gte('menu_date', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('menu_date', filters.endDate)
      }
      if (filters.employeeId) {
        query = query.eq('employee_id', filters.employeeId)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching food orders:', error)
      throw error
    }
  }

  /**
   * Obtiene un pedido por ID
   * @param {string} id - ID del pedido
   * @returns {Promise<Object>}
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('food_orders')
        .select(`
          *,
          employee:employees(id, full_name, dni, role_name, status),
          menu:menus(
            id,
            serve_date,
            options,
            provider:system_users!provider_id(id, username, email)
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching food order:', error)
      throw error
    }
  }

  /**
   * Obtiene los pedidos de un empleado (Versión ligera para web pública)
   * Evita joins complexes que pueden fallar por RLS
   */
  async getPublicOrders(employeeId, startDate, endDate) {
    try {
      let query = supabase
        .from('food_orders')
        .select('id, menu_date, meal_type, selected_option, status, notes, cost_applied')
        .eq('employee_id', employeeId)
        .in('status', ['PENDING', 'CONFIRMED', 'CONSUMED']) // Solo activos

      if (startDate) query = query.gte('menu_date', startDate)
      if (endDate) query = query.lte('menu_date', endDate)

      const { data, error } = await query
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching public orders:', error)
      return [] // Fail safe
    }
  }

  /**
   * Obtiene el historial de pedidos de un empleado (Público)
   * Limitado a los últimos 50 pedidos
   */
  async getPublicHistory(employeeId) {
    try {
      const { data, error } = await supabase
        .from('food_orders')
        .select(`
          id, 
          menu_date, 
          meal_type, 
          selected_option, 
          status, 
          notes, 
          cost_applied, 
          company_subsidy_snapshot, 
          created_at
        `)
        .eq('employee_id', employeeId)
        .order('menu_date', { ascending: false })
        .limit(50)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching history:', error)
      throw error
    }
  }

  /**
   * Obtiene los pedidos de un empleado

   * @param {string} employeeId - ID del empleado
   * @param {Object} filters - Filtros opcionales { startDate, endDate }
   * @returns {Promise<Array>}
   */
  async getByEmployee(employeeId, filters = {}) {
    try {
      let query = supabase
        .from('food_orders')
        .select(`
          *,
          menu:menus(
            id,
            serve_date,
            options,
            provider:system_users!provider_id(id, username, email)
          )
        `)
        .eq('employee_id', employeeId)
        .order('menu_date', { ascending: false })

      if (filters.startDate) {
        query = query.gte('menu_date', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('menu_date', filters.endDate)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching employee orders:', error)
      throw error
    }
  }

  /**
   * Obtiene pedidos de una fecha específica
   * @param {string} stationId - ID de la estación
   * @param {string} date - Fecha en formato YYYY-MM-DD
   * @returns {Promise<Array>}
   */
  async getByDate(stationId, date) {
    try {
      const { data, error } = await supabase
        .from('food_orders')
        .select(`
          *,
          employee:employees(id, full_name, dni, role_name),
          menu:menus(id, serve_date, options)
        `)
        .eq('station_id', stationId)
        .eq('menu_date', date)
        .order('employee.full_name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching orders by date:', error)
      throw error
    }
  }

  /**
   * Crea un nuevo pedido
   * @param {Object} orderData - Datos del pedido
   * @returns {Promise<Object>}
   */
  async create(orderData) {
    try {
      const { data, error } = await supabase
        .from('food_orders')
        .insert([orderData])
        .select()
        .single()

      if (error) {
        if (error.code === '23505' || error.message.includes('unique')) {
          // Check if we can give more detail
          throw new Error(`Ya existe un pedido ${orderData.order_type || 'NORMAL'} para esta fecha.`)
        }
        throw new Error(error.message || 'Error al crear el pedido')
      }
      return data
    } catch (error) {
      console.error('Error creating food order:', error)
      throw error
    }
  }

  /**
   * Actualiza un pedido
   * @param {string} id - ID del pedido
   * @param {Object} orderData - Datos a actualizar
   * @returns {Promise<Object>}
   */
  async update(id, orderData) {
    try {
      const { data, error } = await supabase
        .from('food_orders')
        .update(orderData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message || 'Error al actualizar el pedido')
      }
      return data
    } catch (error) {
      console.error('Error updating food order:', error)
      throw error
    }
  }

  /**
   * Cancela un pedido
   * @param {string} id - ID del pedido
   * @returns {Promise<Object>}
   */
  async cancel(id) {
    try {
      return await this.update(id, {
        status: 'CANCELLED',
        notes: (await this.getById(id)).notes + '\n[Cancelado]'
      })
    } catch (error) {
      console.error('Error cancelling order:', error)
      throw error
    }
  }

  /**
   * Marca un pedido como consumido
   * @param {string} id - ID del pedido
   * @returns {Promise<Object>}
   */
  async markAsConsumed(id) {
    try {
      return await this.update(id, { status: 'CONSUMED' })
    } catch (error) {
      console.error('Error marking order as consumed:', error)
      throw error
    }
  }

  /**
   * Confirma un pedido
   * @param {string} id - ID del pedido
   * @returns {Promise<Object>}
   */
  async confirm(id) {
    try {
      return await this.update(id, { status: 'CONFIRMED' })
    } catch (error) {
      console.error('Error confirming order:', error)
      throw error
    }
  }

  /**
   * Elimina un pedido
   * @param {string} id - ID del pedido
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    try {
      const { error } = await supabase
        .from('food_orders')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(error.message || 'Error al eliminar el pedido')
      }
      return true
    } catch (error) {
      console.error('Error deleting food order:', error)
      throw error
    }
  }

  /**
   * Verifica si un empleado ya tiene un pedido para una fecha
   * @param {string} employeeId - ID del empleado
   * @param {string} date - Fecha en formato YYYY-MM-DD
   * @returns {Promise<boolean>}
   */
  async hasOrderForDate(employeeId, date) {
    try {
      const { data, error } = await supabase
        .from('food_orders')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('menu_date', date)
        .limit(1)

      if (error) throw error
      return (data && data.length > 0)
    } catch (error) {
      console.error('Error checking order existence:', error)
      throw error
    }
  }

  /**
   * Obtiene estadísticas de pedidos
   * @param {string} stationId - ID de la estación
   * @param {string} startDate - Fecha inicio (YYYY-MM-DD)
   * @param {string} endDate - Fecha fin (YYYY-MM-DD)
   * @returns {Promise<Object>}
   */
  async getStats(stationId, startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('food_orders')
        .select('id, cost_applied, status')
        .eq('station_id', stationId)
        .gte('menu_date', startDate)
        .lte('menu_date', endDate)

      if (error) throw error

      const orders = data || []

      return {
        total: orders.length,
        pending: orders.filter(o => o.status === 'PENDING').length,
        confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
        consumed: orders.filter(o => o.status === 'CONSUMED').length,
        cancelled: orders.filter(o => o.status === 'CANCELLED').length,
        totalRevenue: orders.reduce((sum, o) => sum + Number(o.cost_applied), 0)
      }
    } catch (error) {
      console.error('Error fetching order stats:', error)
      throw error
    }
  }

  /**
   * Obtiene reporte de consumo por empleado
   * @param {string} stationId - ID de la estación
   * @param {string} startDate - Fecha inicio (YYYY-MM-DD)
   * @param {string} endDate - Fecha fin (YYYY-MM-DD)
   * @returns {Promise<Array>}
   */
  async getConsumptionReport(stationId, startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('food_orders')
        .select(`
          id,
          cost_applied,
          status,
          employee:employees(id, full_name, dni, role_name)
        `)
        .eq('station_id', stationId)
        .gte('menu_date', startDate)
        .lte('menu_date', endDate)
        .in('status', ['CONFIRMED', 'CONSUMED'])

      if (error) throw error

      // Agrupar por empleado
      const report = {}
        ; (data || []).forEach(order => {
          const empId = order.employee.id
          if (!report[empId]) {
            report[empId] = {
              employee: order.employee,
              totalOrders: 0,
              totalCost: 0
            }
          }
          report[empId].totalOrders++
          report[empId].totalCost += Number(order.cost_applied)
        })

      return Object.values(report).sort((a, b) =>
        a.employee.full_name.localeCompare(b.employee.full_name)
      )
    } catch (error) {
      console.error('Error fetching consumption report:', error)
      throw error
    }
  }
}

export default new FoodOrderService()
