import { useState, useEffect } from 'react'
import { useAuth } from '@contexts/AuthContext'
import menuService from '@services/menuService'
import {
  UtensilsCrossed,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Coffee,
  Sun,
  Moon,
  Building2,
  X
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
  const [showModal, setShowModal] = useState(false)
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
    setShowModal(true)
  }

  const handleNew = () => {
    setEditingMenu(null)
    setShowModal(true)
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

  const handleModalSuccess = () => {
    setShowModal(false)
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

  // Shortcuts para fechas rápidas
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

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
              {error.includes('migraciones SQL') && (
                <div className="mt-4 text-sm text-red-700">
                  <p className="font-medium mb-2">Para resolver este problema:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Ejecuta el archivo <code className="bg-red-100 px-2 py-0.5 rounded">migration_food_module.sql</code> en tu base de datos PostgreSQL</li>
                    <li>Luego ejecuta <code className="bg-red-100 px-2 py-0.5 rounded">migration_add_area_and_food_fields.sql</code></li>
                    <li>Recarga la página</li>
                  </ol>
                </div>
              )}
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
            <div key={menu.id} className="card p-5 hover:shadow-xl transition-all transform hover:-translate-y-1">
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
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Opciones del menú</p>
                <ul className="space-y-2">
                  {(Array.isArray(menu.options) ? menu.options : []).map((option, index) => (
                    <li key={index} className="flex items-center space-x-3 group">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full group-hover:scale-125 transition-transform"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{option}</span>
                    </li>
                  ))}
                </ul>
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

      {/* Modal */}
      {showModal && (
        <MenuModal
          stationId={station.id}
          providerId={user.id}
          menu={editingMenu}
          onClose={() => {
            setShowModal(false)
            setEditingMenu(null)
          }}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  )
}

/**
 * Modal para crear/editar menú
 */
const MenuModal = ({ stationId, providerId, menu, onClose, onSuccess }) => {
  const isEdit = !!menu

  const [formData, setFormData] = useState({
    station_id: stationId,
    provider_id: providerId,
    serve_date: menu?.serve_date || '',
    meal_type: menu?.meal_type || MEAL_TYPES.LUNCH,
    options: menu?.options || [],
    description: menu?.description || ''
  })
  const [newOption, setNewOption] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleAddOption = () => {
    if (!newOption.trim()) return

    setFormData(prev => ({
      ...prev,
      options: [...prev.options, newOption.trim()]
    }))
    setNewOption('')
  }

  const handleRemoveOption = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }))
  }

  const setQuickDate = (type) => {
    const date = new Date()
    if (type === 'tomorrow') {
      date.setDate(date.getDate() + 1)
    }
    setFormData(prev => ({ ...prev, serve_date: date.toISOString().split('T')[0] }))
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.serve_date) {
      newErrors.serve_date = 'La fecha es obligatoria'
    }

    if (formData.options.length === 0) {
      newErrors.options = 'Debe agregar al menos una opción de menú'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setSaving(true)

      if (isEdit) {
        await menuService.update(menu.id, formData)
        alert('Menú actualizado correctamente')
      } else {
        await menuService.create(formData)
        alert('Menú creado correctamente')
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving menu:', error)
      alert(error.message || 'Error al guardar el menú')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="gestor-modal-backdrop">
      <div className="gestor-modal-content max-w-2xl">
        <div className="gestor-modal-header">
          <h3 className="gestor-modal-title">
            {isEdit ? 'Editar Menú' : 'Nuevo Menú'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="gestor-modal-body max-h-[70vh] overflow-y-auto space-y-4">
            {/* Fecha */}
            <div>
              <label htmlFor="serve_date" className="label">
                Fecha <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  id="serve_date"
                  name="serve_date"
                  value={formData.serve_date}
                  onChange={handleChange}
                  className={`input flex-1 ${errors.serve_date ? 'border-red-500' : ''}`}
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={() => setQuickDate('today')}
                  className="btn btn-sm btn-secondary"
                  disabled={saving}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate('tomorrow')}
                  className="btn btn-sm btn-secondary"
                  disabled={saving}
                >
                  Mañana
                </button>
              </div>
              {errors.serve_date && (
                <p className="mt-1 text-sm text-red-600">{errors.serve_date}</p>
              )}
            </div>

            {/* Tipo de comida */}
            <div>
              <label htmlFor="meal_type" className="label">
                Tipo de Comida <span className="text-red-500">*</span>
              </label>
              <select
                id="meal_type"
                name="meal_type"
                value={formData.meal_type}
                onChange={handleChange}
                className="input"
                disabled={saving}
              >
                {Object.entries(MEAL_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Descripción */}
            <div>
              <label htmlFor="description" className="label">
                Descripción (Opcional)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="2"
                className="input"
                placeholder="Ej: Menú especial de la semana"
                disabled={saving}
              />
            </div>

            {/* Opciones del menú */}
            <div>
              <label className="label">
                Opciones del Menú <span className="text-red-500">*</span>
              </label>

              {/* Lista de opciones */}
              {formData.options.length > 0 && (
                <ul className="space-y-2 mb-3">
                  {formData.options.map((option, index) => (
                    <li key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 group hover:border-primary-200 dark:hover:border-primary-900/40 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{option}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        disabled={saving}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Agregar nueva opción */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                  className="input flex-1"
                  placeholder="Ej: Lomo saltado con arroz"
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="btn btn-secondary btn-md"
                  disabled={saving}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {errors.options && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.options}</p>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="gestor-modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-md"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-md"
              disabled={saving}
            >
              {saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear Menú')}
            </button>
          </div>
        </form>
      </div >
    </div >
  )
}

export default MenusPage
