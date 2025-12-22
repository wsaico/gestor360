import { useState, useEffect } from 'react'
import stationService from '@services/stationService'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MapPin,
  Building2,
  AlertCircle,
  Archive,
  ArchiveRestore,
  ExternalLink
} from 'lucide-react'
import { formatDate } from '@utils/helpers'

/**
 * Página de gestión de estaciones (solo ADMIN)
 */
const StationsPage = () => {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingStation, setEditingStation] = useState(null)
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    fetchStations()
  }, [showInactive])

  const fetchStations = async () => {
    try {
      setLoading(true)
      const data = await stationService.getAll(showInactive)
      setStations(data)
    } catch (error) {
      console.error('Error fetching stations:', error)
      alert('Error al cargar las estaciones')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (station) => {
    setEditingStation(station)
    setShowModal(true)
  }

  const handleArchive = async (stationId) => {
    const station = stations.find(s => s.id === stationId)

    if (!confirm(`¿Está seguro de archivar la estación "${station?.code}"?\n\nLa estación se ocultará pero conservará todos sus datos asociados.`)) {
      return
    }

    try {
      await stationService.archive(stationId)
      setStations(prev => prev.filter(s => s.id !== stationId))
      alert('Estación archivada correctamente')
    } catch (error) {
      console.error('Error archiving station:', error)
      alert(error.message || 'Error al archivar la estación')
    }
  }

  const handleReactivate = async (stationId) => {
    const station = stations.find(s => s.id === stationId)

    if (!confirm(`¿Está seguro de reactivar la estación "${station?.code}"?`)) {
      return
    }

    try {
      await stationService.reactivate(stationId)
      setStations(prev => prev.map(s => s.id === stationId ? { ...s, is_active: true } : s))
      alert('Estación reactivada correctamente')
    } catch (error) {
      console.error('Error reactivating station:', error)
      alert(error.message || 'Error al reactivar la estación')
    }
  }

  const handleDelete = async (stationId) => {
    const station = stations.find(s => s.id === stationId)

    if (!confirm(`⚠️ ELIMINAR PERMANENTEMENTE "${station?.code}"?\n\nEsta acción NO se puede deshacer.\n\nSolo se puede eliminar si NO tiene empleados u otros datos asociados.\n\n¿Está completamente seguro?`)) {
      return
    }

    try {
      await stationService.delete(stationId)
      setStations(prev => prev.filter(s => s.id !== stationId))
      alert('Estación eliminada permanentemente')
    } catch (error) {
      console.error('Error deleting station:', error)
      alert(error.message || 'Error al eliminar la estación')
    }
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditingStation(null)
  }

  const handleModalSuccess = () => {
    setShowModal(false)
    setEditingStation(null)
    fetchStations()
  }

  const filteredStations = stations.filter((station) => {
    const search = searchTerm.toLowerCase()
    return (
      station.name.toLowerCase().includes(search) ||
      station.code.toLowerCase().includes(search) ||
      (station.location && station.location.toLowerCase().includes(search))
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando estaciones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Estaciones</h1>
          <p className="text-gray-600 mt-1">Gestión de estaciones del sistema</p>
        </div>
        <button
          onClick={() => {
            setEditingStation(null)
            setShowModal(true)
          }}
          className="btn btn-primary btn-md mt-4 sm:mt-0 inline-flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Estación</span>
        </button>
      </div>

      {/* Búsqueda y Filtros */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por código IATA, nombre o ubicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showInactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="showInactive" className="text-sm text-gray-700">
              Mostrar archivadas
            </label>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Estaciones</p>
              <p className="text-2xl font-bold text-gray-900">{stations.length}</p>
            </div>
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Building2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Activas</p>
              <p className="text-2xl font-bold text-green-600">
                {stations.filter(s => s.is_active !== false).length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Archivadas</p>
              <p className="text-2xl font-bold text-gray-600">
                {stations.filter(s => s.is_active === false).length}
              </p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <Archive className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de estaciones */}
      {filteredStations.length === 0 ? (
        <div className="card text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No se encontraron estaciones' : 'No hay estaciones registradas'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary btn-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Primera Estación
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStations.map((station) => (
            <div key={station.id} className={`card hover:shadow-lg transition-shadow ${!station.is_active ? 'opacity-60 bg-gray-50' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${station.is_active ? 'bg-primary-100' : 'bg-gray-200'}`}>
                    <Building2 className={`w-6 h-6 ${station.is_active ? 'text-primary-700' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900">{station.code}</h3>
                      {!station.is_active && (
                        <span className="badge badge-secondary text-xs">Archivada</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">Código IATA</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(station)}
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <a
                    href={`/board/${station.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-900"
                    title="Abrir Pantalla Pública (Monitor)"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  {station.is_active ? (
                    <button
                      onClick={() => handleArchive(station.id)}
                      className="text-orange-600 hover:text-orange-900"
                      title="Archivar"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(station.id)}
                      className="text-green-600 hover:text-green-900"
                      title="Reactivar"
                    >
                      <ArchiveRestore className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(station.id)}
                    className="text-red-600 hover:text-red-900"
                    title="Eliminar permanentemente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{station.name}</p>
                </div>
                {station.location && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{station.location}</span>
                  </div>
                )}
                <div className="text-xs text-gray-500 pt-2 border-t">
                  Creado: {formatDate(station.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <StationModal
          station={editingStation}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  )
}

/**
 * Modal para crear/editar estación
 */
const StationModal = ({ station, onClose, onSuccess }) => {
  const isEdit = !!station

  const [formData, setFormData] = useState({
    code: station?.code || '',
    name: station?.name || '',
    location: station?.location || ''
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.code.trim()) {
      newErrors.code = 'El código IATA es obligatorio'
    } else if (formData.code.length !== 3) {
      newErrors.code = 'El código IATA debe tener 3 caracteres'
    }

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio'
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

      // Convertir código a mayúsculas
      const dataToSave = {
        ...formData,
        code: formData.code.toUpperCase()
      }

      if (isEdit) {
        await stationService.update(station.id, dataToSave)
        alert('Estación actualizada correctamente')
      } else {
        await stationService.create(dataToSave)
        alert('Estación creada correctamente')
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving station:', error)
      alert(error.message || 'Error al guardar la estación')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          {isEdit ? 'Editar Estación' : 'Nueva Estación'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">
              Código IATA <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              maxLength="3"
              className={`input uppercase ${errors.code ? 'border-red-500' : ''}`}
              placeholder="LIM"
              disabled={saving || isEdit}
            />
            {errors.code && (
              <p className="mt-1 text-sm text-red-600">{errors.code}</p>
            )}
            {isEdit && (
              <p className="mt-1 text-xs text-gray-500">El código IATA no se puede modificar</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              3 letras según estándar IATA (ej: LIM, CUZ, JAU)
            </p>
          </div>

          <div>
            <label className="label">
              Nombre de la Estación <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`input ${errors.name ? 'border-red-500' : ''}`}
              placeholder="Aeropuerto Internacional Jorge Chávez"
              disabled={saving}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="label">Ubicación</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="input"
              placeholder="Lima, Perú"
              disabled={saving}
            />
            <p className="mt-1 text-xs text-gray-500">
              Ciudad, Región o País
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
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
              {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default StationsPage
