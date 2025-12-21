import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@contexts/AuthContext'
import employeeService from '@services/employeeService'
import jobRoleService from '@services/jobRoleService'
import stationService from '@services/stationService'
import areaService from '@services/areaService'
import { ArrowLeft, Save, Loader, UserCog, Shield, MapPin, Phone, Mail, Calendar, Ruler, FileText } from 'lucide-react'
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
 * Refactorizado para mayor robustez y limpieza de código
 */
const EmployeeFormPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { station, user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const isEdit = !!id

  // Estados de carga individualizados para mejor UX
  const [loadingState, setLoadingState] = useState({
    main: false,
    roles: false,
    stations: false,
    areas: false,
    saving: false
  })

  // Listas de datos auxiliares
  const [options, setOptions] = useState({
    jobRoles: [],
    stations: [],
    areas: []
  })

  // Errores de validación
  const [errors, setErrors] = useState({})

  // Estado del formulario
  const [formData, setFormData] = useState({
    station_id: '', // Inicialmente vacío, se llenará con efecto
    full_name: '',
    dni: '',
    role_name: '',
    area: '', // Legacy string
    area_id: '', // Relación FK
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

  // 1. Efecto inicial: Cargar datos maestros (Roles y Estaciones)
  useEffect(() => {
    const fetchMasterData = async () => {
      setLoadingState(prev => ({ ...prev, roles: true, stations: true }))
      try {
        const [rolesData, stationsData] = await Promise.all([
          jobRoleService.getAll(),
          stationService.getAll()
        ])
        setOptions(prev => ({ ...prev, jobRoles: rolesData, stations: stationsData }))
      } catch (error) {
        console.error('Error cargando datos maestros:', error)
        // No bloqueamos la UI con alert invasivo, mejor log o toast
      } finally {
        setLoadingState(prev => ({ ...prev, roles: false, stations: false }))
      }
    }
    fetchMasterData()
  }, [])

  // 2. Efecto para establecer estación inicial
  useEffect(() => {
    if (!isEdit && !formData.station_id) {
      // Al crear, pre-seleccionar la estación del usuario actual (si existe)
      if (station?.id) {
        setFormData(prev => ({ ...prev, station_id: station.id }))
      }
    }
  }, [isEdit, station?.id])

  // 3. Efecto para cargar datos del empleado (Modo Edición)
  useEffect(() => {
    if (isEdit) {
      const fetchEmployee = async () => {
        setLoadingState(prev => ({ ...prev, main: true }))
        try {
          const data = await employeeService.getById(id)

          // Normalización de datos recibidos
          const formattedData = {
            ...data,
            station_id: data.station?.id || data.station_id,
            // Asegurar que area_id sea string vacío si es null para control inputs
            area_id: data.area_id || '',
            // Asegurar fechas válidas YYYY-MM-DD
            birth_date: data.birth_date ? data.birth_date.split('T')[0] : ''
          }

          setFormData(formattedData)
        } catch (error) {
          console.error('Error cargando empleado:', error)
          alert('Error al cargar el empleado. Puede haber sido eliminado.')
          navigate('/rrhh/empleados')
        } finally {
          setLoadingState(prev => ({ ...prev, main: false }))
        }
      }
      fetchEmployee()
    }
  }, [id, isEdit, navigate])

  // 4. Efecto para cargar áreas cuando cambia la estación seleccionada
  useEffect(() => {
    const currentStationId = formData.station_id
    if (currentStationId) {
      const loadAreas = async () => {
        // Evitar recargar si ya tenemos áreas de esta estación (opcional, pero simple es mejor aquí)
        // setLoadingState(prev => ({ ...prev, areas: true })) 
        // Mejor UX: carga silenciosa o indicador sutil en el select
        try {
          const areasData = await areaService.getAll(currentStationId, true)
          setOptions(prev => ({ ...prev, areas: areasData }))
        } catch (error) {
          console.error('Error cargando áreas:', error)
          setOptions(prev => ({ ...prev, areas: [] }))
        }
      }
      loadAreas()
    } else {
      setOptions(prev => ({ ...prev, areas: [] }))
    }
  }, [formData.station_id])

  // Manejador de cambios genérico
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value

    setFormData(prev => {
      const newData = { ...prev, [name]: newValue }

      // Lógica específica: Sincronizar area_id -> area (nombre)
      if (name === 'area_id') {
        const selectedArea = options.areas.find(a => a.id === value)
        newData.area = selectedArea ? selectedArea.name : ''
      }

      // Si cambia la estación, limpiar el área seleccionada para evitar inconsistencias
      if (name === 'station_id' && value !== prev.station_id) {
        newData.area_id = ''
        newData.area = ''
      }

      return newData
    })

    // Limpiar error del campo modificado
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // Validación robusta
  const validateForm = () => {
    const newErrors = {}

    // Validaciones requeridas
    if (!formData.station_id) newErrors.station_id = 'La estación es obligatoria'
    if (!formData.full_name?.trim()) newErrors.full_name = 'El nombre completo es obligatorio'
    if (!formData.role_name) newErrors.role_name = 'El cargo es obligatorio'

    // DNI
    if (!formData.dni?.trim()) {
      newErrors.dni = 'El DNI es obligatorio'
    } else if (!validateDNI(formData.dni)) {
      newErrors.dni = 'El DNI debe tener 8 dígitos numéricos válidos'
    }

    // Email
    if (!formData.email?.trim()) {
      newErrors.email = 'El email es obligatorio'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Formato de correo inválido'
    }

    // Validación condicional
    if (formData.phone && formData.phone.length < 9) {
      newErrors.phone = 'El teléfono debe tener al menos 9 dígitos'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      // Scroll al primer error (opcional) o alert simple
      // alert('Revise los campos marcados en rojo')
      return
    }

    setLoadingState(prev => ({ ...prev, saving: true }))

    try {
      // 1. Determinar estación final
      // Si es admin, usa la del formulario. Si no, fuerza la del contexto (seguridad extra)
      // Aunque el backend RLS debería proteger, el frontend guia al usuario.
      const finalStationId = isAdmin ? formData.station_id : (station?.id || formData.station_id)

      // 2. Preparar payload limpio
      const cleanPayload = {
        station_id: finalStationId,
        full_name: formData.full_name.trim(),
        dni: formData.dni.trim(),
        role_name: formData.role_name, // Ya viene normalizado del select (value=name)
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone?.trim(),
        // Áreas: preferimos area_id, pero enviamos area (nombre) por compatibilidad
        area_id: formData.area_id || null,
        area: formData.area || null,
        // Fechas y Enums
        birth_date: formData.birth_date || null,
        contract_type: formData.contract_type,
        work_schedule: formData.work_schedule,
        status: formData.status,
        uniform_size: formData.uniform_size,
        // Visitantes
        is_visitor: formData.is_visitor,
        visitor_discount_type: formData.visitor_discount_type
      }

      if (isEdit) {
        await employeeService.update(id, cleanPayload)
      } else {
        await employeeService.create(cleanPayload)
      }

      navigate('/rrhh/empleados')
    } catch (error) {
      console.error('Error guardando empleado:', error)
      let msg = error.message || 'Error desconocido al guardar'
      if (msg.includes('duplicate key')) msg = 'Ya existe un empleado con este DNI o Correo.'
      alert(msg)
    } finally {
      setLoadingState(prev => ({ ...prev, saving: false }))
    }
  }

  if (loadingState.main) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader className="w-10 h-10 text-primary-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Cargando información del personal...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* Header de Navegación */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/rrhh/empleados')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          title="Volver"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Editar Expediente' : 'Alta de Personal'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEdit ? `Actualizando datos de ${formData.full_name}` : 'Registrar nuevo colaborador en el sistema'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Sección 1: Datos de Filiación y Ubicación */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold text-gray-800">Filiación y Ubicación</h2>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Estación - Crítica para cargar áreas */}
            <div className="col-span-1 lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Estación de Trabajo <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <select
                  name="station_id"
                  value={formData.station_id}
                  onChange={handleChange}
                  className={`pl-10 w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.station_id ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  disabled={loadingState.saving || (!isAdmin && !!station?.id)}
                >
                  <option value="">Seleccione Estación</option>
                  {options.stations.map(st => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>
              {errors.station_id && <p className="mt-1 text-xs text-red-500">{errors.station_id}</p>}
            </div>

            {/* DNI */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Documento de Identidad <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="dni"
                value={formData.dni}
                onChange={handleChange}
                maxLength={8}
                placeholder="Ej. 70123456"
                className={`w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 ${errors.dni ? 'border-red-500' : ''}`}
                disabled={isEdit || loadingState.saving} // DNI no editable
              />
              {errors.dni && <p className="mt-1 text-xs text-red-500">{errors.dni}</p>}
            </div>

            {/* Nombre Completo */}
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Apellidos y Nombres <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className={`w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 ${errors.full_name ? 'border-red-500' : ''}`}
                placeholder="Apellido Paterno Materno, Nombres"
              />
              {errors.full_name && <p className="mt-1 text-xs text-red-500">{errors.full_name}</p>}
            </div>

            {/* Cargo - Dropdown Dinámico */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Cargo / Puesto <span className="text-red-500">*</span>
              </label>
              <select
                name="role_name"
                value={formData.role_name}
                onChange={handleChange}
                className={`w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 ${errors.role_name ? 'border-red-500' : ''}`}
              >
                <option value="">-- Seleccionar Cargo --</option>
                {options.jobRoles.map(role => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </select>
              {errors.role_name && <p className="mt-1 text-xs text-red-500">{errors.role_name}</p>}
            </div>

            {/* Área - Dependiente de Estación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Área Operativa
              </label>
              <select
                name="area_id"
                value={formData.area_id}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                disabled={!formData.station_id}
              >
                <option value="">-- Sin Área Específica --</option>
                {options.areas.map(area => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
              {!formData.station_id && <p className="mt-1 text-xs text-amber-600">Seleccione estación para ver áreas</p>}
            </div>

            {/* Fecha Nacimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Fecha de Nacimiento
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  name="birth_date"
                  value={formData.birth_date}
                  onChange={handleChange}
                  className="pl-10 w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Sección 2: Contacto Corporativo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold text-gray-800">Contacto Corporativo</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Correo Electrónico <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="usuario@dominio.com"
                  className={`pl-10 w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 ${errors.email ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Teléfono / Celular
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="9XX XXX XXX"
                  className={`pl-10 w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 ${errors.phone ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
            </div>
          </div>
        </div>

        {/* Sección 3: Datos Laborales y Configuración */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold text-gray-800">Datos Contractuales</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Contrato</label>
              <select name="contract_type" value={formData.contract_type} onChange={handleChange} className="w-full rounded-lg border-gray-300">
                {Object.entries(CONTRACT_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Jornada Laboral</label>
              <select name="work_schedule" value={formData.work_schedule} onChange={handleChange} className="w-full rounded-lg border-gray-300">
                {Object.entries(WORK_SCHEDULE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Talla Uniforme</label>
              <div className="relative">
                <Ruler className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <select name="uniform_size" value={formData.uniform_size} onChange={handleChange} className="pl-10 w-full rounded-lg border-gray-300">
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full rounded-lg border-gray-300 bg-gray-50">
                <option value={EMPLOYEE_STATUS.ACTIVE}>Activo</option>
                <option value={EMPLOYEE_STATUS.INACTIVE}>Cesado / Inactivo</option>
              </select>
            </div>

          </div>

          {/* Configuración de Visitante */}
          <div className="border-t border-gray-100 p-6 bg-yellow-50/50">
            <div className="flex items-start gap-4">
              <div className="flex h-6 items-center">
                <input
                  id="is_visitor"
                  name="is_visitor"
                  type="checkbox"
                  checked={formData.is_visitor}
                  onChange={handleChange}
                  className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="is_visitor" className="font-medium text-gray-900">Usuario Externo / Visitante</label>
                <p className="text-gray-500 text-sm">Marque esta casilla si el usuario no es parte de la planilla directa pero requiere registrar consumos (ej. Auditores, Técnicos externos).</p>

                {formData.is_visitor && (
                  <div className="mt-4 max-w-sm animate-fadeIn">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Cobro (Visita)</label>
                    <select name="visitor_discount_type" value={formData.visitor_discount_type} onChange={handleChange} className="w-full rounded-lg border-gray-300">
                      <option value="STANDARD">Tarifa Estándar</option>
                      <option value="NONE">Costo Completo (Sin Subsidio)</option>
                      <option value="COURTESY">Cortesía 100%</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Botones Flotantes / Footer */}
        <div className="flex justify-end gap-3 pt-4 pb-8">
          <button
            type="button"
            onClick={() => navigate('/rrhh/empleados')}
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loadingState.saving}
            className="px-6 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-wait flex items-center gap-2"
          >
            {loadingState.saving ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isEdit ? 'Guardar Cambios' : 'Registrar Empleado'}</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  )
}

export default EmployeeFormPage
