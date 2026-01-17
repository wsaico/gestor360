import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@contexts/AuthContext'
import dashboardService from '@services/dashboardService'
import AlertsWidget from '@components/AlertsWidget'
import {
  Users,
  Shield,
  UtensilsCrossed,
  AlertTriangle,
  TrendingUp,
  Package,
  ClipboardList,
  Clock,
  Plus,
  FileText,
  Settings,
  ChefHat,
  Truck,
  Smartphone,
  Copy,
  ExternalLink,
  Bus,
  ChevronRight
} from 'lucide-react'
import { ROLES } from '@utils/constants'

/**
 * Dashboard 2.0 - Centro de Comando Dinámico
 */
const DashboardPage = () => {
  const { user, station, hasRole } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    kpis: {
      employees: { total: 0, active: 0, inactive: 0, trend: 0 },
      sst: { inventory: 0, lowStock: 0, deliveries: 0 },
      alimentacion: { todayOrders: 0, pendingOrders: 0, monthlyOrders: 0, avgCost: 0 },
      transport: { activeDrivers: 0, operationalVehicles: 0, activeTrips: 0 }
    },
    activity: []
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const stationId = station?.id || null
      const [kpis, activity] = await Promise.all([
        dashboardService.getKPIs(stationId),
        dashboardService.getRecentActivity(stationId)
      ])

      setData({ kpis, activity })
    } catch (error) {
      console.error('Error dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // --- Role Based Logic ---
  const isGlobalAdmin = hasRole(ROLES.ADMIN) && !station
  const isStationAdmin = hasRole(ROLES.ADMIN) && station
  const isProvider = hasRole(ROLES.PROVIDER)
  const isTransportScheduler = hasRole(ROLES.TRANSPORT_SCHEDULER)
  const isEmployee = !hasRole(ROLES.ADMIN) && !hasRole(ROLES.PROVIDER) && !hasRole(ROLES.TRANSPORT_SCHEDULER)

  if (loading) return <DashboardSkeleton />

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Clock className="w-4 h-4" />
            {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Hola, {user?.username?.split(' ')[0]}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isGlobalAdmin ? 'Vista Global Corporativa' :
              isStationAdmin ? `Administrando: ${station.name}` :
                isProvider ? 'Panel de Concesionario' :
                  isTransportScheduler ? 'Programación de Transporte' : 'Mi Portal del Colaborador'}
          </p>
        </div>

        {/* Context Badge */}
        {station && (
          <span className="px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-xs font-bold border border-primary-200 dark:border-primary-800 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
            {station.name}
          </span>
        )}
      </div>

      {/* 2. Stats Projector (Dynamic Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Card: RRHH (Admin Only) */}
        {!isProvider && !isEmployee && !isTransportScheduler && (
          <StatsCard
            title="Total Colaboradores"
            value={data.kpis.employees.active}
            subtitle="En planilla activa"
            icon={Users}
            color="blue"
            trend="+2% vs mes ant."
            onClick={() => navigate('/rrhh/empleados')}
          />
        )}

        {/* Card: Alimentación (All Roles EXCEPT Scheduler) */}
        {!isTransportScheduler && (
          <StatsCard
            title={isProvider ? "Platos a Servir Hoy" : "Pedidos de Hoy"}
            value={data.kpis.alimentacion.todayOrders}
            subtitle={isProvider ? "Pendientes de atención" : "En toda la estación"}
            icon={UtensilsCrossed}
            color="orange"
            onClick={() => navigate(isProvider ? '/alimentacion/menus' : '/alimentacion/pedidos')}
          />
        )}

        {/* Card: SST Inventory (Admin Only) */}
        {!isProvider && !isEmployee && !isTransportScheduler && (
          <StatsCard
            title="Stock Crítico EPP"
            value={data.kpis.sst.lowStock}
            subtitle="Items por agotarse"
            icon={Package}
            color="red"
            alert={data.kpis.sst.lowStock > 0}
            onClick={() => navigate('/sst/inventario')}
          />
        )}

        {/* Card: Transporte (All Roles except Employee/Provider... Scheduler SEES THIS) */}
        {(!isProvider && !isEmployee) || isTransportScheduler ? (
          <StatsCard
            title="Transporte Activo"
            value={data.kpis.transport.activeTrips}
            subtitle={`${data.kpis.transport.operationalVehicles} Vehículos / ${data.kpis.transport.activeDrivers} Conductores`}
            icon={Bus}
            color="indigo"
            onClick={() => navigate('/transport/schedules')}
          />
        ) : null}

        {/* Card: Costos/Revenue (Differs by role) - HIDE for Scheduler */}
        {!isEmployee && !isTransportScheduler && (
          <StatsCard
            title={isProvider ? "Ingresos del Mes" : "Gasto Alimentación"}
            value={data.kpis.alimentacion.monthlyOrders} // Placeholder for Real Cost
            subtitle="Pedidos acumulados mes"
            icon={TrendingUp}
            color="green"
          />
        )}

        {/* Card for Employee */}
        {isEmployee && (
          <StatsCard
            title="Mis Pedidos"
            value="Ver"
            subtitle="Historial y Ahorro"
            icon={UtensilsCrossed}
            color="green"
            onClick={() => navigate('/alimentacion/pedidos')}
          />
        )}
      </div>

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Col: Quick Actions & Alerts (2/3 width) */}
        <div className="lg:col-span-2 space-y-8">

          {/* Quick Actions */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary-600" /> Accesos Rápidos
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
              {/* Admin Actions */}
              {!isProvider && !isEmployee && !isTransportScheduler && (
                <>
                  <QuickAction
                    title="Nuevo Empleado"
                    icon={Plus}
                    color="blue"
                    onClick={() => navigate('/rrhh/empleados/nuevo')}
                  />
                  <QuickAction
                    title="Entregar EPP"
                    icon={Shield}
                    color="indigo"
                    onClick={() => navigate('/sst/entregas')}
                  />
                </>
              )}

              {/* Common Actions - HIDE for Scheduler */}
              {!isTransportScheduler && (
                <QuickAction
                  title="Realizar Pedido"
                  icon={UtensilsCrossed}
                  color="orange"
                  onClick={() => navigate('/alimentacion/pedidos')}
                />
              )}

              {/* Scheduler Specific Actions */}
              {isTransportScheduler && (
                <>
                  <QuickAction
                    title="Nueva Salida"
                    icon={Bus}
                    color="indigo"
                    onClick={() => navigate('/transport/schedules')}
                  />
                </>
              )}

              {/* Provider Actions */}
              {isProvider && (
                <QuickAction
                  title="Planificar Menú"
                  icon={ChefHat}
                  color="red"
                  onClick={() => navigate('/alimentacion/menus')}
                />
              )}

              <QuickAction
                title="Reportes"
                icon={FileText}
                color="gray"
                onClick={() => navigate('/reportes')}
              />

              {(isGlobalAdmin || isStationAdmin || isProvider) && (
                <div className="col-span-2 group">
                  <div className="flex bg-slate-100 dark:bg-slate-700/50 rounded-xl p-2 gap-2 border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => window.open('/transport/driver-login', '_blank')}
                      className="flex-1 flex items-center gap-3 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-bold transition-all shadow-sm"
                    >
                      <Smartphone className="w-5 h-5 text-white/80" />
                      <span>Kiosko Conductor</span>
                      <ExternalLink className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/transport/driver-login`
                        navigator.clipboard.writeText(url)
                        Swal.fire({
                          title: 'Link Copiado',
                          text: 'Puedes pegarlo en WhatsApp para enviarlo a los conductores',
                          icon: 'success',
                          timer: 2000,
                          showConfirmButton: false,
                          toast: true,
                          position: 'top-end'
                        })
                      }}
                      className="p-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary-600 rounded-lg border border-slate-200 dark:border-slate-600 transition-all shadow-sm hover:shadow-md"
                      title="Copiar Link para Conductores"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Alerts Widget */}
          {!isProvider && (
            <section>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Atención Requerida
              </h3>
              <AlertsWidget />
            </section>
          )}
        </div>

        {/* Right Col: Recent Activity Feed (1/3 width) */}
        <div className="space-y-6">
          <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center justify-between">
              <span>Actividad Reciente</span>
              <span className="text-xs font-normal text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">En tiempo real</span>
            </h3>

            <div className="space-y-6 relative overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
              {/* Timeline Line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100 dark:bg-gray-700 z-0 hidden md:block" />
              {data.activity.length > 0 ? (
                data.activity.map((item, idx) => (
                  <div key={item.id || idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group select-none">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-gray-50 dark:bg-gray-700 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <ActivityIcon type={item.type} />
                    </div>

                    {/* Content */}
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/50 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-gray-900 dark:text-white text-sm">{item.title}</div>
                        <time className="font-mono text-[10px] text-gray-500">{new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item.description}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-gray-400 text-sm">
                  Sin actividad reciente registrada.
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 text-center">
              <button
                onClick={fetchDashboardData}
                className="text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors"
              >
                Actualizar Feed
              </button>
            </div>
          </section>
        </div>

      </div>
    </div>
  )
}

// --- Subcomponents ---

const DashboardSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl w-full"></div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>)}
    </div>
    <div className="grid grid-cols-3 gap-8">
      <div className="col-span-2 h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
    </div>
  </div>
)

const StatsCard = ({ title, value, subtitle, icon: Icon, color, trend, alert, onClick }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
  }
  const activeColor = colors[color] || colors.blue

  return (
    <div
      onClick={onClick}
      className={`
         bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 
         hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden
         ${alert ? 'ring-2 ring-red-500 ring-offset-2' : ''}
       `}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg ${activeColor} group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">{trend}</span>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</h3>
        <p className="font-medium text-gray-700 dark:text-gray-300 text-sm">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
      </div>
      {/* Decorative Blob */}
      <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-5 ${activeColor.split(' ')[0]}`}></div>
    </div>
  )
}

const QuickAction = ({ title, icon: Icon, color, onClick }) => {
  const gradients = {
    blue: 'from-blue-500 to-blue-600',
    indigo: 'from-indigo-500 to-indigo-600',
    orange: 'from-orange-500 to-orange-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    gray: 'from-gray-500 to-gray-600'
  }

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-transparent hover:shadow-lg transition-all group w-full"
    >
      <div className={`
         w-12 h-12 md:w-14 md:h-14 rounded-full mb-3 flex items-center justify-center text-white shadow-md
         bg-gradient-to-br ${gradients[color] || gradients.blue}
         group-hover:scale-110 transition-transform
       `}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary-600 transition-colors text-center">
        {title}
      </span>
    </button>
  )
}

const ActivityIcon = ({ type }) => {
  switch (type) {
    case 'ORDER': return <UtensilsCrossed className="w-4 h-4 text-orange-500" />
    case 'DELIVERY': return <Truck className="w-4 h-4 text-blue-500" />
    case 'EMPLOYEE': return <Users className="w-4 h-4 text-purple-500" />
    default: return <Clock className="w-4 h-4 text-gray-500" />
  }
}

export default DashboardPage
