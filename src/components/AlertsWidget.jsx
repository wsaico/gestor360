import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  AlertCircle,
  Cake,
  FileText,
  ChevronRight,
  AlertTriangle,
  XCircle
} from 'lucide-react'
import alertsService from '@services/alertsService'
import { formatDate } from '@utils/helpers'
import { useAuth } from '@contexts/AuthContext'

/**
 * Widget de Alertas para Dashboard
 * Muestra cumpleaños próximos y documentos por vencer
 */
const AlertsWidget = () => {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'birthdays' | 'documents'

  useEffect(() => {
    fetchAlerts()
    // Refrescar cada 10 minutos (optimizado para Supabase free tier)
    // Previous: 5min = ~288 queries/day
    // Now: 10min = ~144 queries/day (50% additional reduction)
    const interval = setInterval(fetchAlerts, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const stationId = user?.station_id || null
      const data = await alertsService.getAllAlerts(stationId)
      setAlerts(data)
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center h-64">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  if (!alerts) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">Error al cargar alertas</p>
        </div>
      </div>
    )
  }

  const { birthdays, documents, summary } = alerts

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Alertas y Notificaciones</h2>
            <p className="text-sm text-gray-500">
              {summary.totalAlerts > 0 ? (
                <span className="text-yellow-600 font-medium">
                  {summary.totalAlerts} alerta{summary.totalAlerts !== 1 ? 's' : ''} activa{summary.totalAlerts !== 1 ? 's' : ''}
                </span>
              ) : (
                'No hay alertas pendientes'
              )}
            </p>
          </div>
        </div>
        <button
          onClick={fetchAlerts}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Actualizar
        </button>
      </div>

      {/* Statistics Cards */}
      {summary.totalAlerts > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Cumpleaños Hoy */}
          {summary.todayBirthdays > 0 && (
            <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Cake className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <div>
                  <p className="text-2xl font-bold text-primary-900 dark:text-primary-100">{summary.todayBirthdays}</p>
                  <p className="text-xs text-primary-700 dark:text-primary-300">Cumpleaños hoy</p>
                </div>
              </div>
            </div>
          )}

          {/* Cumpleaños esta semana */}
          {summary.thisWeekBirthdays > 0 && (
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Cake className="w-5 h-5 text-cyan-600" />
                <div>
                  <p className="text-2xl font-bold text-cyan-900">{summary.thisWeekBirthdays}</p>
                  <p className="text-xs text-cyan-700">Esta semana</p>
                </div>
              </div>
            </div>
          )}

          {/* Documentos vencidos */}
          {summary.expiredDocs > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-900">{summary.expiredDocs}</p>
                  <p className="text-xs text-red-700">Docs vencidos</p>
                </div>
              </div>
            </div>
          )}

          {/* Documentos por vencer */}
          {summary.warningDocs > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold text-yellow-900">{summary.warningDocs}</p>
                  <p className="text-xs text-yellow-700">Por vencer (30 días)</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'all'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          Todas ({summary.totalAlerts})
        </button>
        <button
          onClick={() => setActiveTab('birthdays')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'birthdays'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          Cumpleaños ({birthdays.length})
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'documents'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          Documentos ({documents.length})
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {summary.totalAlerts === 0 && (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No hay alertas en los próximos 30 días</p>
          </div>
        )}

        {/* Cumpleaños */}
        {(activeTab === 'all' || activeTab === 'birthdays') && birthdays.length > 0 && (
          <div className="space-y-2">
            {birthdays.map((birthday) => (
              <Link
                key={birthday.id}
                to={`/rrhh/empleados/${birthday.id}`}
                className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                    <Cake className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{birthday.full_name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {birthday.role_name} • {birthday.station?.code || 'N/A'}
                    </p>
                    <p className="text-xs text-primary-700 dark:text-primary-300 font-medium mt-1">
                      {birthday.daysUntilBirthday === 0 ? (
                        '¡Cumpleaños hoy! 🎉'
                      ) : birthday.daysUntilBirthday === 1 ? (
                        'Cumpleaños mañana'
                      ) : (
                        `En ${birthday.daysUntilBirthday} días (${formatDate(birthday.birth_date).substring(0, 5)})`
                      )}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </Link>
            ))}
          </div>
        )}

        {/* Documentos */}
        {(activeTab === 'all' || activeTab === 'documents') && documents.length > 0 && (
          <div className="space-y-2">
            {documents.map((doc) => (
              <Link
                key={doc.id}
                to={`/rrhh/empleados/${doc.employee.id}`}
                className={`flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-all ${doc.alertStatus.severity === 'danger'
                    ? 'bg-red-50 border-red-300 hover:bg-red-100'
                    : 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${doc.alertStatus.severity === 'danger'
                        ? 'bg-red-100'
                        : 'bg-yellow-100'
                      }`}
                  >
                    <FileText
                      className={`w-5 h-5 ${doc.alertStatus.severity === 'danger'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                        }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {doc.employee.full_name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {doc.doc_type} • {doc.employee.station?.code || 'N/A'}
                    </p>
                    <p
                      className={`text-xs font-medium mt-1 ${doc.alertStatus.severity === 'danger'
                          ? 'text-red-700'
                          : 'text-yellow-700'
                        }`}
                    >
                      {doc.daysRemaining < 0 ? (
                        `VENCIDO hace ${Math.abs(doc.daysRemaining)} días`
                      ) : doc.daysRemaining === 0 ? (
                        'VENCE HOY'
                      ) : (
                        `Vence en ${doc.daysRemaining} día${doc.daysRemaining !== 1 ? 's' : ''} (${formatDate(doc.expiry_date)})`
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`badge ${doc.alertStatus.severity === 'danger'
                        ? 'badge-danger'
                        : 'badge-warning'
                      }`}
                  >
                    {doc.alertStatus.label}
                  </span>
                  <ChevronRight
                    className={`w-5 h-5 ${doc.alertStatus.severity === 'danger'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                      }`}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {summary.totalAlerts > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Link
            to="/rrhh/empleados"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center"
          >
            Ver todos los empleados
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      )}
    </div>
  )
}

export default AlertsWidget
