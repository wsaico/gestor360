import { useState, useEffect } from 'react'
import { useAuth } from '@contexts/AuthContext'
import menuService from '@services/menuService'
import stationService from '@services/stationService'
import MenuWizard from './MenuWizard'
import {
  UtensilsCrossed,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Coffee,
  Sun,
  Moon,
  Share2,
  Building2
} from 'lucide-react'
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '@utils/constants'
import { formatDate } from '@utils/helpers'

/**
 * Página de gestión de menús diarios
 * Accesible para PROVIDER, ADMIN, SUPERVISOR
 */
const MenusPage = () => {
  const { user, station } = useAuth()

  const [menus, setMenus] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modal State
  const [showWizard, setShowWizard] = useState(false)
  const [editingMenu, setEditingMenu] = useState(null)

  const [filterDate, setFilterDate] = useState('')

  useEffect(() => {
    if (station?.id) {
      fetchMenus()
    } else {
      setLoading(false)
    }
  }, [station, filterDate])

  const fetchMenus = async () => {
    try {
      setLoading(true)
      setError(null)
      const filters = filterDate ? { startDate: filterDate, endDate: filterDate } : {}
      const data = await menuService.getAll(station.id, filters)
      setMenus(data)
    } catch (error) {
      console.error('Error fetching menus:', error)
      setError(error.message || 'Error al cargar los menús')

      // Check if it's a table not found error
      if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
        setError('⚠️ Las tablas del módulo de alimentación no existen. Por favor, ejecuta las migraciones SQL primero.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (menu) => {
    setEditingMenu(menu)
    setShowWizard(true)
  }

  const handleNew = () => {
    setEditingMenu(null)
    setShowWizard(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de eliminar este menú?')) {
      return
    }

    try {
      await menuService.delete(id)
      setMenus(prev => prev.filter(m => m.id !== id))
      alert('Menú eliminado correctamente')
    } catch (error) {
      console.error('Error deleting menu:', error)
      alert(error.message || 'Error al eliminar el menú')
    }
  }

  const handleWizardSuccess = () => {
    setShowWizard(false)
    setEditingMenu(null)
    fetchMenus()
  }

  const getMealIcon = (mealType) => {
    switch (mealType) {
      case MEAL_TYPES.BREAKFAST:
        return <Coffee className="w-4 h-4" />
      case MEAL_TYPES.LUNCH:
        return <Sun className="w-4 h-4" />
      case MEAL_TYPES.DINNER:
        return <Moon className="w-4 h-4" />
      default:
        return <UtensilsCrossed className="w-4 h-4" />
    }
  }

  const handleShare = async (menu) => {
    try {
      // 1. Get Station Config (Time)
      // We might need to fetch it if not available in "station" from context context typically has partial data?
      // Let's safe fetch or use available. Assume station from context might be enough or fetch full.
      // Better fetch full to be safe about order times which might be recent.
      const fullStation = await stationService.getById(menu.station_id)

      const startTime = fullStation.order_start_time || '00:00'
      const endTime = fullStation.order_end_time || '23:59'
      const stationName = fullStation.name

      // 2. Format Message
      const mealEmojis = {
        [MEAL_TYPES.BREAKFAST]: '☕',
        [MEAL_TYPES.LUNCH]: '☀️',
        [MEAL_TYPES.DINNER]: '🌙'
      }
      const emojiMeal = mealEmojis[menu.meal_type] || '🍱'
      const mealLabel = MEAL_TYPE_LABELS[menu.meal_type]
      const dateStr = formatDate(menu.serve_date)

      let message = `*${emojiMeal} MENÚ - ${mealLabel} ${emojiMeal}*\n`
      message += `📅 *Fecha:* ${dateStr}\n`
      message += `🏢 *Estación:* ${stationName}\n`
      message += `⏰ *Horario de Pedidos:* ${startTime} - ${endTime}\n`
      message += `──────────────────────\n\n`

      if (menu.description) {
        message += `💡 *Nota:* _${menu.description}_\n\n`
      }

      message += `✅ *OPCIONES DISPONIBLES:*\n`

      // Format Options
      const items = Array.isArray(menu.options) ? menu.options : []

      items.forEach(item => {
        if (typeof item === 'string' && item.startsWith('SECTION:')) {
          const sectionTitle = item.replace('SECTION:', '')
          message += `\n*📌 ${sectionTitle.toUpperCase()}*\n`
        } else if (typeof item === 'string' && item.includes('|')) {
          const [name, details] = item.split('|')
          message += `🍛 *${name}*\n   └ _${details}_\n`
        } else {
          message += `🍱 *${item}*\n`
        }
      })

      message += `\n──────────────────────\n`
      message += `📲 *Realiza tu pedido aquí:* \n`
      const appUrl = window.location.origin + '/menu'
      message += `👉 ${appUrl}`

      // 3. Open WhatsApp
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
      window.open(whatsappUrl, '_blank')

    } catch (error) {
      console.error('Error sharing:', error)
      alert('Error al generar el mensaje de WhatsApp')
    }
  }

  // Shortcuts para fechas rápidas
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  // Render logic for menu options (supports Granular Sections)
  const renderMenuOptions = (options) => {
    const items = Array.isArray(options) ? options : []
    const renderedItems = []

    let currentSection = null

    items.forEach((item, idx) => {
      if (typeof item === 'string' && item.startsWith('SECTION:')) {
        // Render Section Header
        const sectionTitle = item.replace('SECTION:', '')
        renderedItems.push(
          <li key={`sec-${idx}`} className="pt-2 pb-1">
            <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider block border-b border-primary-100 dark:border-primary-900/30 mb-1">
              {sectionTitle}
            </span>
          </li>
        )
      } else {
        // Render Item (Support NAME|DETAILS)
        const isString = typeof item === 'string'
        const [name, details] = isString && item.includes('|') ? item.split('|') : [item, null]

        renderedItems.push(
          <li key={`opt-${idx}`} className="flex flex-col pl-2 border-l-2 border-gray-100 dark:border-gray-700 my-1 py-1">
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{name}</span>
            {details && (
              <span className="text-xs text-gray-500 dark:text-gray-400 italic leading-tight">
                {details}
              </span>
            )}
          </li>
        )
      }
    })

    return <ul className="space-y-1">{renderedItems}</ul>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Cargando menús...</p>
        </div>
      </div>
    )
  }

  // Si no hay estación seleccionada (admin global), mostrar mensaje apuntando al header
  if (!station) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-full">
          <Building2 className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Menús</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
          Por favor, seleccione una estación en el <strong>menú superior</strong> para visualizar y gestionar los menús diarios.
        </p>
        <div className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-2 font-medium">
          <span className="animate-bounce">↑</span>
          <span>Use el selector de estación en la barra superior</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Menús Diarios</h1>
          <p className="text-gray-600 mt-1">Gestión de menús {station && `- ${station.name}`}</p>
        </div>

        <div className="card bg-red-50 border-red-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error al cargar los menús</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button onClick={fetchMenus} className="btn btn-sm btn-primary">
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Menús Diarios</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestión de menús {station && `- ${station.name}`}
          </p>
        </div>
        <button
          onClick={handleNew}
          className="btn btn-primary btn-md mt-4 sm:mt-0 inline-flex items-center space-x-2 shadow-lg transform active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Menú</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Filtrar por fecha:</span>
          </div>

          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <button
              onClick={() => setFilterDate(today)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filterDate === today ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              HOY
            </button>
            <button
              onClick={() => setFilterDate(tomorrow)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filterDate === tomorrow ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              MAÑANA
            </button>
          </div>

          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="input !py-1.5"
          />

          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="btn btn-secondary btn-sm"
            >
              Ver todos
            </button>
          )}
        </div>
      </div>

      {/* Menus List */}
      {menus.length === 0 ? (
        <div className="card p-12 text-center">
          <UtensilsCrossed className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-500 dark:text-gray-400">No hay menús registrados</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider font-medium">
            {filterDate ? 'No hay menús para la fecha seleccionada' : 'Haga clic en "Nuevo Menú" para comenzar'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menus.map((menu) => (
            <div key={menu.id} className="card p-5 hover:shadow-xl transition-all transform hover:-translate-y-1 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl shadow-sm ${menu.meal_type === MEAL_TYPES.BREAKFAST ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400' :
                    menu.meal_type === MEAL_TYPES.LUNCH ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400' :
                      'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
                    }`}>
                    {getMealIcon(menu.meal_type)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      {MEAL_TYPE_LABELS[menu.meal_type] || menu.meal_type}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {formatDate(menu.serve_date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEdit(menu)}
                    className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleShare(menu)}
                    className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                    title="Compartir por WhatsApp"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  {/* Providers cannot delete menus */}
                  {user?.role_name !== 'PROVIDER' && (
                    <button
                      onClick={() => handleDelete(menu.id)}
                      className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              {menu.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg italic">
                  "{menu.description}"
                </p>
              )}

              {/* Options */}
              <div className="space-y-3 flex-1">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 h-full">
                  {renderMenuOptions(menu.options)}
                </div>
              </div>

              {/* Provider */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-gray-400 dark:text-gray-500">Proveedor</span>
                  <span className="text-primary-600 dark:text-primary-400">{menu.provider?.username || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Wizard Modal */}
      {showWizard && (
        <MenuWizard
          stationId={station?.id}
          providerId={user?.id}
          menuToEdit={editingMenu}
          onClose={() => {
            setShowWizard(false)
            setEditingMenu(null)
          }}
          onSuccess={handleWizardSuccess}
        />
      )}
    </div>
  )
}

export default MenusPage
