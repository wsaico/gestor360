import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@contexts/AuthContext'
import employeeService from '@services/employeeService'
import jobRoleService from '@services/jobRoleService'
import stationService from '@services/stationService'
import areaService from '@services/areaService'
import { ArrowLeft, Save, Loader } from 'lucide-react'
import {
  EMPLOYEE_STATUS,
  CONTRACT_TYPES,
  CONTRACT_TYPE_LABELS,
  WORK_SCHEDULES,
  WORK_SCHEDULE_LABELS
} from '@utils/constants'
import { validateDNI, validateEmail } from '@utils/helpers'

/**
 * Formulario para crear/editar empleados
 */
const EmployeeFormPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { station, user, isGlobalAdmin } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const isEdit = !!id

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [jobRoles, setJobRoles] = useState([])
  const [stations, setStations] = useState([])
  const [areas, setAreas] = useState([])
  const [loadingRoles, setLoadingRoles] = useState(true)
  const [loadingStations, setLoadingStations] = useState(true)

  const [formData, setFormData] = useState({
    station_id: station?.id || '',
    full_name: '',
    dni: '',
    role_name: '',
    area: '',
    area_id: '',
    birth_date: '',
    contract_type: CONTRACT_TYPES.INDETERMINADO,
    work_schedule: WORK_SCHEDULES.FULL_8HRS,
    status: EMPLOYEE_STATUS.ACTIVE,
    uniform_size: 'M',
    phone: '',
    email: '',
    photo_url: '',
    is_visitor: false,
    visitor_discount_type: 'STANDARD'
  })

  useEffect(() => {
    fetchJobRoles()
    fetchStations()
    fetchStations()
    if (isEdit) {
      fetchEmployee()
    } else {
      // On Create: Load areas for the initial station (context or empty)
      if (station?.id) fetchAreas(station.id)
    }
  }, [id, station?.id])

  // Effect to reload areas when form station changes
  useEffect(() => {
    if (formData.station_id) {
      fetchAreas(formData.station_id)
    } else {
      setAreas([])
    }
  }, [formData.station_id])

  const fetchJobRoles = async () => {
    try {
      setLoadingRoles(true)
      const data = await jobRoleService.getAll()
      setJobRoles(data)
    } catch (error) {
      console.error('Error fetching job roles:', error)
      alert('Error al cargar los cargos')
    } finally {
      setLoadingRoles(false)
    }
  }

  const fetchStations = async () => {
    try {
      setLoadingStations(true)
      const data = await stationService.getAll()
      setStations(data)
    } catch (error) {
      console.error('Error fetching stations:', error)
      alert('Error al cargar las estaciones')
    } finally {
      setLoadingStations(false)
    }
  }

  const fetchAreas = async (targetStationId) => {
    try {
      if (!targetStationId) return
      const data = await areaService.getAll(targetStationId, true)
      setAreas(data)
    } catch (error) {
      console.error('Error fetching areas:', error)
      setAreas([])
    }
  }

  const fetchEmployee = async () => {
    try {
      setLoading(true)
      const data = await employeeService.getById(id)

      // Extraer station_id del objeto anidado si existe
      const formattedData = {
        ...data,
        station_id: data.station?.id || data.station_id
      }

      setFormData(formattedData)
    } catch (error) {
      console.error('Error fetching employee:', error)
      alert('Error al cargar el empleado')
      navigate('/rrhh/empleados')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData(prev => {
      const newData = { ...prev, [name]: value }

      // Special handling for Area: If area_id changes, update area name too
      if (name === 'area_id') {
        const selectedArea = areas.find(a => a.id === value)
        newData.area = selectedArea ? selectedArea.name : ''
      }

      return newData
    })

    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.station_id) {
      newErrors.station_id = 'La estación es obligatoria'
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'El nombre completo es obligatorio'
    }

    if (!formData.dni.trim()) {
      newErrors.dni = 'El DNI es obligatorio'
    } else if (!validateDNI(formData.dni)) {
      newErrors.dni = 'El DNI debe tener 8 dígitos'
    }

    if (!formData.role_name.trim()) {
      newErrors.role_name = 'El cargo es obligatorio'
    }

    if (!formData.email) {
      newErrors.email = 'El email es obligatorio para el acceso'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'El email no es válido'
    }

    if (formData.phone && formData.phone.length < 9) {
      newErrors.phone = 'El teléfono debe tener al menos 9 dígitos'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      alert('Por favor, corrija los errores en el formulario')
      return
    }

    try {
      setSaving(true)

      // Limpiar datos: eliminar campos anidados y campos de solo lectura
      const { station, created_at, updated_at, ...cleanData } = formData

      // Determine Final Station ID
      // If Admin (ANY Admin) -> Use Form selection
      // If Supervisor/Restricted -> Force Context Station if set, else Form selection (fallback)
      const allowedToChangeStation = isAdmin
      const finalStationId = allowedToChangeStation ? formData.station_id : (station?.id || formData.station_id)

      console.log('Saving Employee Station:', {
        role: user?.role,
        isAdmin,
        formStation: formData.station_id,
        contextStation: station?.id,
        FINAL: finalStationId
      })

      const dataToSave = {
        ...cleanData,
        station_id: finalStationId
      }

      // Ensure area_id is null if empty string
      if (dataToSave.area_id === '') dataToSave.area_id = null

      if (isEdit) {
        await employeeService.update(id, dataToSave)
        alert('Empleado actualizado correctamente')
      } else {
        await employeeService.create(dataToSave)
        alert('Empleado creado correctamente')
      }

      navigate('/rrhh/empleados')
    } catch (error) {
      console.error('Error saving employee:', error)
      alert(error.message || 'Error al guardar el empleado')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando empleado...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/rrhh/empleados')}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Editar Empleado' : 'Nuevo Empleado'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Actualiza la información del empleado' : 'Registra un nuevo empleado en el sistema'}
          </p>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Datos Personales</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Estación */}
            <div>
              <label htmlFor="station_id" className="label">
                Estación <span className="text-red-500">*</span>
              </label>
              <select
                id="station_id"
                name="station_id"
                value={formData.station_id}
                onChange={handleChange}
                className={`input ${errors.station_id ? 'border-red-500' : ''}`}
                disabled={saving || loadingStations || (!isAdmin && !!station?.id)}
              >
                <option value="">Seleccione una estación</option>
                {stations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.code} - {station.name}
                  </option>
                ))}
              </select>
              {errors.station_id && (
                <p className="mt-1 text-sm text-red-600">{errors.station_id}</p>
              )}
              {loadingStations && (
                <p className="mt-1 text-xs text-gray-500">Cargando estaciones...</p>
              )}
            </div>

            {/* Nombre Completo */}
            <div>
              <label htmlFor="full_name" className="label">
                Nombre Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className={`input ${errors.full_name ? 'border-red-500' : ''}`}
                placeholder="Ej: Juan Carlos Pérez García"
                disabled={saving}
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
              )}
            </div>

            {/* DNI */}
            <div>
              <label htmlFor="dni" className="label">
                DNI <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="dni"
                name="dni"
                value={formData.dni}
                onChange={handleChange}
                maxLength="8"
                className={`input ${errors.dni ? 'border-red-500' : ''}`}
                placeholder="12345678"
                disabled={saving || isEdit}
              />
              {errors.dni && (
                <p className="mt-1 text-sm text-red-600">{errors.dni}</p>
              )}
              {isEdit && (
                <p className="mt-1 text-xs text-gray-500">El DNI no se puede modificar</p>
              )}
            </div>

            {/* Cargo */}
            <div>
              <label htmlFor="role_name" className="label">
                Cargo <span className="text-red-500">*</span>
              </label>
              <select
                id="role_name"
                name="role_name"
                value={formData.role_name}
                onChange={handleChange}
                className={`input ${errors.role_name ? 'border-red-500' : ''}`}
                disabled={saving || loadingRoles}
              >
                <option value="">Seleccione un cargo</option>
                {jobRoles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
              {errors.role_name && (
                <p className="mt-1 text-sm text-red-600">{errors.role_name}</p>
              )}
            </div>

            {/* Área */}
            <div>
              <label htmlFor="area_id" className="label">
                Área
              </label>
              <select
                id="area_id"
                name="area_id"
                value={formData.area_id || ''}
                onChange={handleChange}
                className={`input ${errors.area ? 'border-red-500' : ''}`}
                disabled={saving}
              >
                <option value="">Seleccione un área</option>
                {areas.length > 0 ? (
                  areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="PAX">PAX</option>
                    <option value="RAMPA">RAMPA</option>
                    <option value="OMA">OMA</option>
                    <option value="TRAFICO">TRÁFICO</option>
                    <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
                  </>
                )}
              </select>
              {errors.area && (
                <p className="mt-1 text-sm text-red-600">{errors.area}</p>
              )}
            </div>

            {/* Fecha de Nacimiento */}
            <div>
              <label htmlFor="birth_date" className="label">
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                id="birth_date"
                name="birth_date"
                value={formData.birth_date || ''}
                onChange={handleChange}
                className={`input ${errors.birth_date ? 'border-red-500' : ''}`}
                disabled={saving}
              />
              {errors.birth_date && (
                <p className="mt-1 text-sm text-red-600">{errors.birth_date}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Para alertas de cumpleaños
              </p>
            </div>

            {/* Estado */}
            <div>
              <label htmlFor="status" className="label">
                Estado
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input"
                disabled={saving}
              >
                <option value={EMPLOYEE_STATUS.ACTIVE}>Activo</option>
                <option value={EMPLOYEE_STATUS.INACTIVE}>Cesado</option>
              </select>
            </div>

            {/* Talla de Uniforme */}
            <div>
              <label htmlFor="uniform_size" className="label">
                Talla de Uniforme
              </label>
              <select
                id="uniform_size"
                name="uniform_size"
                value={formData.uniform_size}
                onChange={handleChange}
                className="input"
                disabled={saving}
              >
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
              </select>
            </div>

            {/* Configuración de Visita */}
            <div className="md:col-span-2 bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex flex-col md:flex-row gap-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_visitor"
                  name="is_visitor"
                  checked={formData.is_visitor}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_visitor: e.target.checked }))}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                  disabled={saving}
                />
                <label htmlFor="is_visitor" className="ml-2 block text-sm font-bold text-gray-700">
                  Es Visitante / Externo
                </label>
              </div>

              {formData.is_visitor && (
                <div className="flex-1">
                  <label htmlFor="visitor_discount_type" className="label">
                    Tipo de Cobro (Visita)
                  </label>
                  <select
                    id="visitor_discount_type"
                    name="visitor_discount_type"
                    value={formData.visitor_discount_type}
                    onChange={handleChange}
                    className="input"
                    disabled={saving}
                  >
                    <option value="STANDARD">Estándar (Subsidio Normal)</option>
                    <option value="NONE">Costo Completo (Sin Descuento)</option>
                    <option value="COURTESY">Cortesía (Gratis)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Determina si la visita paga el subsidio o el costo total al registrarse en el menú.</p>
                </div>
              )}
            </div>

            {/* Tipo de Contrato */}
            <div>
              <label htmlFor="contract_type" className="label">
                Tipo de Contrato
              </label>
              <select
                id="contract_type"
                name="contract_type"
                value={formData.contract_type}
                onChange={handleChange}
                className="input"
                disabled={saving}
              >
                {Object.entries(CONTRACT_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Jornada Laboral */}
            <div>
              <label htmlFor="work_schedule" className="label">
                Jornada Laboral
              </label>
              <select
                id="work_schedule"
                name="work_schedule"
                value={formData.work_schedule}
                onChange={handleChange}
                className="input"
                disabled={saving}
              >
                {Object.entries(WORK_SCHEDULE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Datos de Contacto */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Datos de Contacto</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Teléfono */}
            <div>
              <label htmlFor="phone" className="label">
                Teléfono
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`input ${errors.phone ? 'border-red-500' : ''}`}
                placeholder="987654321"
                disabled={saving}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="label">
                Correo Electrónico <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`input ${errors.email ? 'border-red-500' : ''}`}
                placeholder="empleado@ejemplo.com"
                disabled={saving}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/rrhh/empleados')}
            className="btn btn-secondary btn-md"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-md inline-flex items-center space-x-2"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isEdit ? 'Actualizar' : 'Crear'} Empleado</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default EmployeeFormPage
