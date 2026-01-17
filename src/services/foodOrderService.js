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
   * @param {string} employeeId - ID del empleado
   * @param {Object} options - Opciones de filtrado
   * @param {string} options.startDate - Fecha inicio (YYYY-MM-DD)
   * @param {string} options.endDate - Fecha fin (YYYY-MM-DD)
   * @param {boolean} options.currentPayrollPeriod - Si true, filtra por período de planilla actual (16 al 15)
   * @returns {Promise<Array>}
   */
  async getPublicHistory(employeeId, options = {}) {
    try {
      let query = supabase
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
          order_type,
          created_at
        `)
        .eq('employee_id', employeeId)
        .order('menu_date', { ascending: false })

      // Si se solicita período de planilla actual (16 al 15)
      if (options.currentPayrollPeriod) {
        const today = new Date()
        const currentDay = today.getDate()

        let startDate, endDate

        if (currentDay >= 16) {
          // Estamos en la segunda quincena: del 16 de este mes al 15 del próximo
          startDate = new Date(today.getFullYear(), today.getMonth(), 16)
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 15)
        } else {
          // Estamos en la primera quincena: del 16 del mes pasado al 15 de este mes
          startDate = new Date(today.getFullYear(), today.getMonth() - 1, 16)
          endDate = new Date(today.getFullYear(), today.getMonth(), 15)
        }

        query = query
          .gte('menu_date', startDate.toISOString().split('T')[0])
          .lte('menu_date', endDate.toISOString().split('T')[0])
      }
      // Si se proporcionan fechas personalizadas
      else if (options.startDate || options.endDate) {
        if (options.startDate) {
          query = query.gte('menu_date', options.startDate)
        }
        if (options.endDate) {
          query = query.lte('menu_date', options.endDate)
        }
      }
      // Si no hay filtros, limitar a últimos 50
      else {
        query = query.limit(50)
      }

      const { data, error } = await query

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
          employee:employees(id, full_name, dni, role_name, status),
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
      const { count, error } = await supabase
        .from('food_orders')
        .delete({ count: 'exact' })
        .eq('id', id)

      if (error) {
        throw new Error(error.message || 'Error al eliminar el pedido')
      }

      if (count === 0) {
        throw new Error('No se pudo eliminar el pedido. Verifique permisos o si ya fue eliminado.')
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

  /**
   * Cuenta cuántos pedidos en un rango de fechas no tienen costo asignado (0)
   */
  async countUnpricedOrders(stationId, startDate, endDate) {
    try {
      const { count, error } = await supabase
        .from('food_orders')
        .select('*', { count: 'exact', head: true })
        .eq('station_id', stationId)
        .gte('menu_date', startDate)
        .lte('menu_date', endDate)
        .or('cost_applied.eq.0,employee_cost_snapshot.eq.0,company_subsidy_snapshot.eq.0')

      if (error) throw error
      return count || 0
    } catch (error) {
      console.error('Error counting unpriced orders:', error)
      throw error
    }
  }

  /**
   * Recalcula los costos para pedidos que tienen costo 0 o faltante
   * @param {string} stationId - ID de la estación
   * @param {string} startDate - Fecha inicio
   * @param {string} endDate - Fecha fin
   */
  async recalculateMissingCosts(stationId, startDate, endDate) {
    try {
      // 1. Obtener todos los pedidos del periodo
      const { data: orders, error: ordersError } = await supabase
        .from('food_orders')
        .select(`
          id,
          employee_id,
          employee:employees(role_name, is_visitor),
          order_type,
          cost_applied,
          employee_cost_snapshot,
          company_subsidy_snapshot
        `)
        .eq('station_id', stationId)
        .gte('menu_date', startDate)
        .lte('menu_date', endDate)

      if (ordersError) throw ordersError
      if (!orders || orders.length === 0) return { updated: 0, total: 0 }

      // 2. Obtener todas las tarifas de la estación
      const { data: pricings, error: pricingError } = await supabase
        .from('role_pricing_config')
        .select('*')
        .eq('station_id', stationId)

      if (pricingError) throw pricingError
      const pricingMap = {}
        ; (pricings || []).forEach(p => {
          pricingMap[p.role_name] = p
        })

      // 3. Procesar actualizaciones
      let updatedCount = 0
      const updates = orders.map(async (order) => {
        const isVisitor = order.employee?.is_visitor || order.order_type === 'VISITOR'
        const role = order.employee?.role_name
        const pricing = pricingMap[role]

        let empCost = 0
        let compSubsidy = 0

        // Si es visitante, siempre es CORTESIA (0 costo, 0 subsidio)
        if (isVisitor) {
          empCost = 0
          compSubsidy = 0
        } else if (pricing) {
          empCost = Number(pricing.employee_cost)
          compSubsidy = Number(pricing.company_subsidy)
        } else {
          // Si no hay tarifa configurada ni es visitante, mantenemos 0 por seguridad
          empCost = 0
          compSubsidy = 0
        }

        // Solo actualizar si hay cambios reales para evitar ruido
        if (
          Number(order.cost_applied) !== empCost ||
          Number(order.employee_cost_snapshot) !== empCost ||
          Number(order.company_subsidy_snapshot) !== compSubsidy
        ) {
          const { error: updateError } = await supabase
            .from('food_orders')
            .update({
              cost_applied: empCost,
              employee_cost_snapshot: empCost,
              company_subsidy_snapshot: compSubsidy
            })
            .eq('id', order.id)

          if (!updateError) updatedCount++
        }
      })

      await Promise.all(updates)
      return { updated: updatedCount, total: orders.length }
    } catch (error) {
      console.error('Error recalculating costs:', error)
      throw error
    }
  }
}

export default new FoodOrderService()
