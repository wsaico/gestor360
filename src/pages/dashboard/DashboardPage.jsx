import { useState, useEffect } from 'react'
import { useAuth } from '@contexts/AuthContext'
import dashboardService from '@services/dashboardService'
import AlertsWidget from '@components/AlertsWidget'
import {
  Users,
  Shield,
  UtensilsCrossed,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  ClipboardList
} from 'lucide-react'

/**
 * Dashboard principal con KPIs filtrados por estación
 */
import { ROLES } from '@utils/constants'
/**
 * Dashboard principal con KPIs filtrados por estación
 */
const DashboardPage = () => {
  const { user, station } = useAuth()
  const isProvider = user?.role === ROLES.PROVIDER
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState({
    employees: {
      total: 0,
      active: 0,
      inactive: 0,
      trend: 0
    },
    sst: {
      inventory: 0,
      lowStock: 0,
      deliveries: 0,
      incidents: 0,
      expiredEPPs: 0
    },
    alimentacion: {
      todayOrders: 0,
      pendingOrders: 0,
      monthlyOrders: 0,
      avgCost: 0
    }
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  /**
   * Obtiene los datos del dashboard desde Supabase
   */
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const stationId = station?.id || null
      const data = await dashboardService.getKPIs(stationId)
      setKpis(data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      alert('Error al cargar los datos del dashboard.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Bienvenido, <span className="font-semibold">{user?.username}</span>
          {station && (
            <span> - {station.name} ({station.code})</span>
          )}
        </p>
      </div>

      {/* KPIs de Recursos Humanos */}
      {!isProvider && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Recursos Humanos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Empleados"
              value={kpis.employees.total}
              icon={Users}
              color="primary"
              trend={kpis.employees.trend}
            />
            <KPICard
              title="Empleados Activos"
              value={kpis.employees.active}
              icon={Users}
              color="green"
              trend={0}
            />
            <KPICard
              title="Empleados Cesados"
              value={kpis.employees.inactive}
              icon={Users}
              color="gray"
            />
            <KPICard
              title="Documentos por Vencer"
              value={3}
              icon={AlertTriangle}
              color="yellow"
              alert
            />
          </div>
        </div>
      )}

      {/* KPIs de SST */}
      {!isProvider && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Seguridad y Salud en el Trabajo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Items en Inventario"
              value={kpis.sst.inventory}
              icon={Package}
              color="primary"
            />
            <KPICard
              title="Stock Bajo"
              value={kpis.sst.lowStock}
              icon={AlertTriangle}
              color="yellow"
              alert
            />
            <KPICard
              title="Entregas del Mes"
              value={kpis.sst.deliveries}
              icon={ClipboardList}
              color="primary"
            />
            <KPICard
              title="EPPs Vencidos"
              value={kpis.sst.expiredEPPs}
              icon={AlertTriangle}
              color="red"
              alert
            />
          </div>
        </div>
      )}

      {/* KPIs de Alimentación */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <UtensilsCrossed className="w-5 h-5 mr-2" />
          Alimentación
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Pedidos Hoy"
            value={kpis.alimentacion.todayOrders}
            icon={UtensilsCrossed}
            color="green"
          />
          <KPICard
            title="Pedidos Pendientes"
            value={kpis.alimentacion.pendingOrders}
            icon={ClipboardList}
            color="yellow"
          />
          <KPICard
            title="Pedidos del Mes"
            value={kpis.alimentacion.monthlyOrders}
            icon={TrendingUp}
            color="primary"
          />
          <KPICard
            title="Costo Promedio"
            value={`S/ ${kpis.alimentacion.avgCost.toFixed(2)}`}
            icon={TrendingUp}
            color="primary"
          />
        </div>
      </div>

      {/* Widget de Alertas de Cumpleaños y Documentos */}
      {!isProvider && <AlertsWidget />}

      {/* Gráficos y tablas adicionales */}
      {!isProvider && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Actividad reciente */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Actividad Reciente
            </h3>
            <div className="space-y-3">
              <ActivityItem
                action="Entrega de EPPs"
                user="Juan Pérez"
                time="Hace 30 minutos"
                icon={ClipboardList}
              />
              <ActivityItem
                action="Nuevo empleado registrado"
                user="María García"
                time="Hace 2 horas"
                icon={Users}
              />
              <ActivityItem
                action="Pedido de alimentos"
                user="Carlos López"
                time="Hace 3 horas"
                icon={UtensilsCrossed}
              />
            </div>
          </div>

          {/* Alertas SST */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Alertas SST
            </h3>
            <div className="space-y-3">
              <AlertItem
                type="warning"
                title="5 EPPs por vencer"
                description="Revisar renovaciones próximas en los siguientes 30 días"
                time="Hace 2 horas"
              />
              <AlertItem
                type="danger"
                title="Stock bajo en guantes"
                description="Solo quedan 5 unidades en inventario"
                time="Hace 4 horas"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Componente de tarjeta KPI
 */
const KPICard = ({ title, value, icon: Icon, color, trend, alert }) => {
  const colorClasses = {
    primary: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }

  return (
    <div className={`card ${alert ? 'ring-2 ring-yellow-400 dark:ring-yellow-600' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center mt-2">
              {trend >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400 mr-1" />
              )}
              <span className={`text-sm ${trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

/**
 * Componente de alerta
 */
const AlertItem = ({ type, title, description, time }) => {
  const typeClasses = {
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700',
    danger: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
  }

  return (
    <div className={`p-3 border rounded-lg ${typeClasses[type]}`}>
      <div className="flex items-start">
        <AlertTriangle className={`w-5 h-5 mr-2 flex-shrink-0 ${type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
            type === 'danger' ? 'text-red-600 dark:text-red-400' :
              'text-blue-600 dark:text-blue-400'
          }`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{description}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{time}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Componente de actividad
 */
const ActivityItem = ({ action, user, time, icon: Icon }) => {
  return (
    <div className="flex items-start space-x-3">
      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <Icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{action}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400">{user}</p>
        <p className="text-xs text-gray-500 dark:text-gray-500">{time}</p>
      </div>
    </div>
  )
}

export default DashboardPage
