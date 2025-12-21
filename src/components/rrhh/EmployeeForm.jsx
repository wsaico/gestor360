import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    User,
    Mail,
    Smartphone,
    MapPin,
    Calendar,
    Briefcase,
    AlertCircle,
    Upload,
    Heart,
    Shield,
    CreditCard,
    Building,
    Save,
    X
} from 'lucide-react'
import { useAuth } from '@contexts/AuthContext'
import employeeService from '@services/employeeService'
import jobRoleService from '@services/jobRoleService'
import stationService from '@services/stationService'
import areaService from '@services/areaService'
import {
    EMPLOYEE_STATUS,
    CONTRACT_TYPES,
    CONTRACT_TYPE_LABELS,
    WORK_SCHEDULES,
    WORK_SCHEDULE_LABELS
} from '@utils/constants'
import { validateDNI, validateEmail } from '@utils/helpers'

const EmployeeForm = ({ employee, onSuccess, onCancel }) => {
    const { user, station: contextStation } = useAuth()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [roles, setRoles] = useState([])
    const [stations, setStations] = useState([])
    const [areas, setAreas] = useState([])
    const [errors, setErrors] = useState({})

    const isEdit = !!employee
    const isAdmin = user?.role === 'ADMIN'

    const [formData, setFormData] = useState({
        station_id: contextStation?.id || '',
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
        const initialize = async () => {
            await loadDependencies()

            if (isEdit && employee) {
                setFormData({
                    ...employee,
                    station_id: employee.station_id || contextStation?.id || '',
                    area_id: employee.area_id || '',
                    birth_date: employee.birth_date || '',
                })
            } else if (contextStation?.id && !formData.station_id) {
                setFormData(prev => ({
                    ...prev,
                    station_id: contextStation.id
                }))
            }
        }

        initialize()
    }, [employee, contextStation?.id])

    // Reload areas when station changes
    useEffect(() => {
        if (formData.station_id) {
            fetchAreas(formData.station_id)
        } else {
            setAreas([])
        }
    }, [formData.station_id])

    const loadDependencies = async () => {
        try {
            const [rolesData, stationsData] = await Promise.all([
                jobRoleService.getAll(),
                stationService.getAll()
            ])
            setRoles(rolesData || [])
            setStations(stationsData || [])
            if (!rolesData?.length) console.warn('No se cargaron roles de la base de datos')
            if (!stationsData?.length) console.warn('No se cargaron estaciones de la base de datos')
        } catch (error) {
            console.error('Error loading dependencies:', error)
            alert('Error al cargar cargos/estaciones. Verifique su conexión y permisos.')
        }
    }

    const fetchAreas = async (targetStationId) => {
        try {
            const data = await areaService.getAll(targetStationId, true)
            setAreas(data)
        } catch (error) {
            console.error('Error fetching areas:', error)
            setAreas([])
        }
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        const val = type === 'checkbox' ? checked : value

        setFormData(prev => {
            const newData = { ...prev, [name]: val }
            if (name === 'area_id') {
                const selectedArea = areas.find(a => a.id === value)
                newData.area = selectedArea ? selectedArea.name : ''
            }
            return newData
        })

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }))
        }
    }

    const validateForm = () => {
        const newErrors = {}
        if (!formData.station_id) newErrors.station_id = 'La estación es obligatoria'
        if (!formData.full_name?.trim()) newErrors.full_name = 'El nombre es obligatorio'
        if (!formData.dni?.trim()) {
            newErrors.dni = 'El DNI es obligatorio'
        } else if (!validateDNI(formData.dni)) {
            newErrors.dni = 'DNI no válido'
        }
        if (!formData.role_name) newErrors.role_name = 'El cargo es obligatorio'
        if (!formData.email) {
            newErrors.email = 'El email es obligatorio'
        } else if (!validateEmail(formData.email)) {
            newErrors.email = 'Email no válido'
        }
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validateForm()) return

        setSaving(true)
        try {
            const { station, created_at, updated_at, ...cleanData } = formData

            const dataToSave = {
                ...cleanData,
                area_id: cleanData.area_id || null
            }

            if (isEdit) {
                await employeeService.update(employee.id, dataToSave)
            } else {
                await employeeService.create(dataToSave)
            }
            onSuccess?.()
        } catch (error) {
            console.error('Error saving employee:', error)
            alert(error.message || 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Sección: Datos Principales */}
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide flex items-center gap-2">
                        <User className="w-4 h-4 text-primary-500" />
                        Información Básica
                    </h4>

                    <div>
                        <label className="label">DNI *</label>
                        <input
                            type="text"
                            name="dni"
                            required
                            value={formData.dni}
                            onChange={handleChange}
                            className={`input ${errors.dni ? 'border-red-500' : ''}`}
                            maxLength={8}
                            disabled={isEdit}
                        />
                        {errors.dni && <p className="text-xs text-red-500 mt-1">{errors.dni}</p>}
                    </div>

                    <div>
                        <label className="label">Nombre Completo *</label>
                        <input
                            type="text"
                            name="full_name"
                            required
                            value={formData.full_name}
                            onChange={handleChange}
                            className={`input ${errors.full_name ? 'border-red-500' : ''}`}
                        />
                        {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Email *</label>
                            <input
                                type="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className={`input ${errors.email ? 'border-red-500' : ''}`}
                            />
                            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                        </div>
                        <div>
                            <label className="label">Teléfono</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">Fecha Nacimiento</label>
                        <input
                            type="date"
                            name="birth_date"
                            value={formData.birth_date}
                            onChange={handleChange}
                            className="input"
                        />
                    </div>
                </div>

                {/* Sección: Laboral */}
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-green-500" />
                        Configuración Laboral
                    </h4>

                    <div>
                        <label className="label">Estación *</label>
                        <select
                            name="station_id"
                            value={formData.station_id}
                            onChange={handleChange}
                            className={`input ${errors.station_id ? 'border-red-500' : ''}`}
                            disabled={!isAdmin && !!contextStation?.id}
                        >
                            <option value="">Seleccione...</option>
                            {stations.map(st => (
                                <option key={st.id} value={st.id}>{st.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Cargo *</label>
                            <select name="role_name" value={formData.role_name} onChange={handleChange} className="input">
                                <option value="">Seleccionar...</option>
                                {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Área</label>
                            <select name="area_id" value={formData.area_id} onChange={handleChange} className="input">
                                <option value="">Seleccionar...</option>
                                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Contrato</label>
                            <select name="contract_type" value={formData.contract_type} onChange={handleChange} className="input">
                                {Object.entries(CONTRACT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Jornada</label>
                            <select name="work_schedule" value={formData.work_schedule} onChange={handleChange} className="input">
                                {Object.entries(WORK_SCHEDULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Talla Uniforme</label>
                            <select name="uniform_size" value={formData.uniform_size} onChange={handleChange} className="input">
                                {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Estado</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="input">
                                <option value={EMPLOYEE_STATUS.ACTIVE}>Activo</option>
                                <option value={EMPLOYEE_STATUS.INACTIVE}>Cesado</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Visitas */}
            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
                <div className="flex items-center gap-2 mb-3">
                    <input
                        type="checkbox"
                        id="is_visitor"
                        name="is_visitor"
                        checked={formData.is_visitor}
                        onChange={handleChange}
                        className="w-4 h-4"
                    />
                    <label htmlFor="is_visitor" className="text-sm font-bold text-yellow-800 dark:text-yellow-400">
                        Es Visitante / Externo
                    </label>
                </div>
                {formData.is_visitor && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="label text-xs">Tipo de Cobro</label>
                        <select name="visitor_discount_type" value={formData.visitor_discount_type} onChange={handleChange} className="input text-sm">
                            <option value="STANDARD">Estándar (Menú)</option>
                            <option value="NONE">Costo Total</option>
                            <option value="COURTESY">Cortesía</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={saving}>
                    Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear Empleado')}
                </button>
            </div>
        </form>
    )
}

export default EmployeeForm
