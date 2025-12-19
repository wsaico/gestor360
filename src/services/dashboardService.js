import supabase from './supabase'

/**
 * Servicio para obtener datos del dashboard
 */
class DashboardService {
  /**
   * Obtiene los KPIs del dashboard
   * @param {string} stationId - ID de la estación (opcional para Admin Global)
   * @returns {Promise<Object>}
   */
  async getKPIs(stationId = null) {
    try {
      // KPIs de empleados
      const employeesKPIs = await this.getEmployeesKPIs(stationId)

      // KPIs de SST
      const sstKPIs = await this.getSSTKPIs(stationId)

      // KPIs de alimentación
      const alimentacionKPIs = await this.getAlimentacionKPIs(stationId)

      return {
        employees: employeesKPIs,
        sst: sstKPIs,
        alimentacion: alimentacionKPIs
      }
    } catch (error) {
      console.error('Error fetching dashboard KPIs:', error)
      throw error
    }
  }

  /**
   * Obtiene KPIs de empleados
   */
  async getEmployeesKPIs(stationId = null) {
    try {
      let query = supabase
        .from('employees')
        .select('status', { count: 'exact' })

      if (stationId) {
        query = query.eq('station_id', stationId)
      }

      const { count: total } = await query

      const { count: active } = await query.eq('status', 'ACTIVO')

      const { count: inactive } = await query.eq('status', 'CESADO')

      return {
        total: total || 0,
        active: active || 0,
        inactive: inactive || 0,
        trend: 0 // Calcular basado en mes anterior
      }
    } catch (error) {
      console.error('Error fetching employees KPIs:', error)
      return { total: 0, active: 0, inactive: 0, trend: 0 }
    }
  }

  /**
   * Obtiene KPIs de SST
   */
  async getSSTKPIs(stationId = null) {
    try {
      let inventoryQuery = supabase
        .from('inventory_items')
        .select('*', { count: 'exact' })

      if (stationId) {
        inventoryQuery = inventoryQuery.eq('station_id', stationId)
      }

      const { data: inventory, count: inventoryCount } = await inventoryQuery

      // Contar items con stock bajo
      const lowStock = inventory?.filter(item => item.stock_current < item.stock_min).length || 0

      // Contar entregas del mes
      const { count: deliveries } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact' })
        .gte('delivery_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

      // Contar incidentes
      const { count: incidents } = await supabase
        .from('incidents')
        .select('*', { count: 'exact' })
        .eq('status', 'OPEN')

      return {
        inventory: inventoryCount || 0,
        lowStock,
        deliveries: deliveries || 0,
        incidents: incidents || 0,
        expiredEPPs: 0 // Requiere lógica adicional
      }
    } catch (error) {
      console.error('Error fetching SST KPIs:', error)
      return { inventory: 0, lowStock: 0, deliveries: 0, incidents: 0, expiredEPPs: 0 }
    }
  }

  /**
   * Obtiene KPIs de alimentación
   */
  async getAlimentacionKPIs(stationId = null) {
    try {
      const today = new Date().toISOString().split('T')[0]

      let todayQuery = supabase
        .from('food_orders')
        .select('*', { count: 'exact' })
        .eq('menu_date', today)

      if (stationId) {
        todayQuery = todayQuery.eq('station_id', stationId)
      }

      const { count: todayOrders } = await todayQuery

      const { count: pendingOrders } = await todayQuery.eq('status', 'PENDING')

      // Pedidos del mes
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
      const { count: monthlyOrders } = await supabase
        .from('food_orders')
        .select('*', { count: 'exact' })
        .gte('menu_date', firstDayOfMonth)

      return {
        todayOrders: todayOrders || 0,
        pendingOrders: pendingOrders || 0,
        monthlyOrders: monthlyOrders || 0,
        avgCost: 12.50 // Calcular promedio real
      }
    } catch (error) {
      console.error('Error fetching alimentacion KPIs:', error)
      return { todayOrders: 0, pendingOrders: 0, monthlyOrders: 0, avgCost: 0 }
    }
  }
}

export default new DashboardService()
