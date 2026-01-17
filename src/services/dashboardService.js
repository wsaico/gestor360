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

      // KPIs de transporte
      const transportKPIs = await this.getTransportKPIs(stationId)

      return {
        employees: employeesKPIs,
        sst: sstKPIs,
        alimentacion: alimentacionKPIs,
        transport: transportKPIs
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
        .from('epp_items')
        .select('*', { count: 'exact' })
        .eq('is_active', true)

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

  /**
   * Obtiene KPIs de transporte
   */
  async getTransportKPIs(stationId = null) {
    try {
      const today = new Date().toISOString().split('T')[0]

      // 1. Conductores Activos
      let driversQuery = supabase
        .from('transport_drivers')
        .select('*', { count: 'exact' })
        .eq('status', 'ACTIVE')

      // if (stationId) driversQuery = driversQuery.eq('station_id', stationId) // Column does not exist
      const { count: drivers } = await driversQuery

      // 2. Vehículos Operativos
      let vehiclesQuery = supabase
        .from('transport_vehicles')
        .select('*', { count: 'exact' })
        .eq('status', 'OPERATIONAL')

      // if (stationId) vehiclesQuery = vehiclesQuery.eq('station_id', stationId) // Column does not exist
      const { count: vehicles } = await vehiclesQuery

      // 3. Viajes de Hoy
      let tripsQuery = supabase
        .from('transport_schedules')
        .select('*', { count: 'exact' })
        .eq('scheduled_date', today)
        .in('status', ['PENDING', 'IN_PROGRESS'])

      // Note: Trips might link to route -> station_id or have direct station_id. 
      // Assuming direct station_id for simplicity or strictly global for now if not.
      // If transport_trips has station_id:
      if (stationId) tripsQuery = tripsQuery.eq('station_id', stationId)

      const { count: activeTrips } = await tripsQuery

      return {
        activeDrivers: drivers || 0,
        operationalVehicles: vehicles || 0,
        activeTrips: activeTrips || 0
      }
    } catch (error) {
      console.error('Error fetching transport KPIs:', error)
      return { activeDrivers: 0, operationalVehicles: 0, activeTrips: 0 }
    }
  }


  /**
   * Obtiene actividad reciente del sistema (Feed Unificado)
   */
  async getRecentActivity(stationId = null) {
    try {
      const limit = 5
      const activities = []

      // 1. Últimos pedidos de alimentación
      let ordersQuery = supabase
        .from('food_orders')
        .select(`
          id, 
          menu_date, 
          created_at, 
          employee:employees(full_name),
          status
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (stationId) ordersQuery = ordersQuery.eq('station_id', stationId)
      const { data: orders } = await ordersQuery

      if (orders) {
        orders.forEach(o => {
          activities.push({
            id: `order-${o.id}`,
            type: 'ORDER',
            title: 'Nuevo pedido de alimentación',
            description: `${o.employee?.full_name || 'Empleado'} para el ${o.menu_date}`,
            time: o.created_at,
            icon: 'UtensilsCrossed',
            color: 'green'
          })
        })
      }

      // 2. Últimas entregas SST (Simulado si no hay tabla poblada, pero usaremos la real)
      let deliveriesQuery = supabase
        .from('deliveries')
        .select(`
          id, 
          delivery_date, 
          created_at,
          employee:employees(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (stationId) {
        // Assuming deliveries has station_id inferred or we skip filter for now if not present
        // deliveriesQuery = deliveriesQuery.eq('station_id', stationId) 
      }
      const { data: deliveries } = await deliveriesQuery

      if (deliveries) {
        deliveries.forEach(d => {
          activities.push({
            id: `del-${d.id}`,
            type: 'DELIVERY',
            title: 'Entrega de EPP realizada',
            description: `A cargo de ${d.employee?.full_name}`,
            time: d.created_at || d.delivery_date,
            icon: 'ClipboardList',
            color: 'blue'
          })
        })
      }

      // 3. Nuevos empleados
      let empQuery = supabase
        .from('employees')
        .select('id, full_name, created_at, role_name')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (stationId) empQuery = empQuery.eq('station_id', stationId)
      const { data: newEmployees } = await empQuery

      if (newEmployees) {
        newEmployees.forEach(e => {
          activities.push({
            id: `emp-${e.id}`,
            type: 'EMPLOYEE',
            title: 'Nuevo empleado registrado',
            description: `${e.full_name} (${e.role_name})`,
            time: e.created_at,
            icon: 'Users',
            color: 'purple'
          })
        })
      }

      // Ordenar todo por fecha y devolver los top 10
      return activities
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 10)

    } catch (error) {
      console.error('Error fetching recent activity:', error)
      return []
    }
  }
}

export default new DashboardService()
