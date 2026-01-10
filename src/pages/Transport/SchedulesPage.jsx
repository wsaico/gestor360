import { useState, useEffect } from 'react'
import { useAuth } from '@contexts/AuthContext'
import { useNotification } from '@contexts/NotificationContext'
import transportService from '@services/transportService'
import systemUserService from '@services/systemUserService'
import employeeService from '@services/employeeService'
import organizationService from '@services/organizationService'
import Modal from '@components/Modal'
import {
    Calendar,
    Clock,
    Plus,
    Users,
    Search,
    CheckCircle,
    XCircle,
    MapPin,
    Car,
    Briefcase,
    ChevronRight,
    Edit2,
    Share2,
    DollarSign,
    ArrowRight,
    MessageCircle, // WhatsApp
    ArrowUp,
    ArrowDown,
    Building2,
    Lock,
    CheckCircle2 // For validation badge
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const SchedulesPage = () => {
    const { user, station } = useAuth()
    const { notify } = useNotification()
    const isProvider = user?.role?.toUpperCase() === 'PROVIDER' || user?.role_name?.toUpperCase() === 'PROVIDER'
    // Force reload fix

    // Data States
    const [schedules, setSchedules] = useState([])
    const [routes, setRoutes] = useState([])
    const [providers, setProviders] = useState([])
    const [employees, setEmployees] = useState([])
    const [organizations, setOrganizations] = useState([])

    // Sub-resources cache
    const [subResources, setSubResources] = useState({ drivers: [], vehicles: [] })

    // UI States
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState({
        from: format(new Date(), 'yyyy-MM-01'),
        to: format(new Date(), 'yyyy-MM-dd')
    })
    const [loadingResources, setLoadingResources] = useState(false)

    // Modal
    const [showModal, setShowModal] = useState(false)
    const [editingSchedule, setEditingSchedule] = useState(null) // ID if editing
    const [selectedOrgFilter, setSelectedOrgFilter] = useState('') // New Filter
    const [viewMode, setViewMode] = useState('pending') // 'pending' | 'history'

    // Bulk Validation
    const [selectedSchedules, setSelectedSchedules] = useState(new Set())
    const [isValidating, setIsValidating] = useState(false)

    const [formData, setFormData] = useState({
        route_id: '',
        provider_id: '',
        scheduled_date: new Date().toISOString().split('T')[0],
        departure_time: '07:00',
        vehicle_id: '',
        driver_id: '',
        passengers_manifest: []
    })

    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        if (station?.id) {
            loadInitialData()
        }
    }, [station])

    useEffect(() => {
        if (station?.id) loadSchedules()
    }, [dateRange, station])

    const loadInitialData = async () => {
        try {
            const [routesData, usersData, employeesData, orgsData] = await Promise.all([
                transportService.getRoutes(),
                systemUserService.getAll(),
                employeeService.getAll(station.id, { activeOnly: true }),
                organizationService.getAll(true)
            ])
            setRoutes(routesData.filter(r => r.active))
            setProviders(usersData.filter(u => u.role === 'PROVIDER' || u.role_name === 'PROVIDER'))
            setEmployees(employeesData.data || [])
            setOrganizations(orgsData || [])
        } catch (error) {
            notify.error('Error cargando datos iniciales')
        }
    }

    const loadSchedules = async () => {
        try {
            setLoading(true)
            const data = await transportService.getSchedules({
                dateFrom: dateRange.from,
                dateTo: dateRange.to,
                stationId: station.id
            })
            setSchedules(data)
        } catch (error) {
            notify.error('Error cargando programación')
        } finally {
            setLoading(false)
        }
    }

    // Dynamic Resource Loading for Modal
    const loadSubResources = async (providerId) => {
        if (!providerId) {
            setSubResources({ drivers: [], vehicles: [] })
            return
        }
        setLoadingResources(true)
        try {
            // Ensure providerId is a string/number, not an event object
            const pid = typeof providerId === 'object' ? providerId.target?.value : providerId

            const [d, v] = await Promise.all([
                transportService.getDrivers(pid),
                transportService.getVehicles(pid)
            ])
            setSubResources({ drivers: d, vehicles: v })
        } catch (e) { console.error(e) } finally { setLoadingResources(false) }
    }

    const handleProviderChange = async (providerId) => {
        setFormData(prev => ({ ...prev, provider_id: providerId, driver_id: '', vehicle_id: '' }))
        await loadSubResources(providerId)
    }

    const handleOpenCreate = () => {
        setEditingSchedule(null)
        setFormData({
            route_id: '',
            provider_id: '',
            scheduled_date: new Date().toISOString().split('T')[0],
            departure_time: '07:00',
            vehicle_id: '',
            driver_id: '',
            passengers_manifest: []
        })
        setSubResources({ drivers: [], vehicles: [] })
        setShowModal(true)
    }

    const handleOpenEdit = async (schedule) => {
        try {
            // Robustly get provider ID
            const providerId = schedule.provider_id || schedule.provider?.id

            setEditingSchedule(schedule)
            setFormData({
                route_id: schedule.route_id,
                provider_id: providerId, // Use resolved ID
                scheduled_date: schedule.scheduled_date,
                departure_time: schedule.departure_time,
                vehicle_id: schedule.vehicle_id || '',
                driver_id: schedule.driver_id || '',
                passengers_manifest: schedule.passengers_manifest || []
            })

            // Load subresources immediately so dropdowns display correct values
            if (providerId) {
                await loadSubResources(providerId)
            }
            setShowModal(true)
        } catch (error) {
            console.error(error)
            notify.error("Error al cargar datos para editar")
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const payload = {
                ...formData,
                station_id: station.id
            }

            if (editingSchedule) {
                await transportService.updateSchedule(editingSchedule.id, payload)
                notify.success('Despacho actualizado correctamente')
            } else {
                await transportService.createSchedule({ ...payload, status: 'PENDING' })
                notify.success('Despacho programado correctamente')
            }

            setShowModal(false)
            loadSchedules()
        } catch (error) {
            notify.error('Error al guardar programación')
        }
    }

    // Passenger Logic
    const togglePassenger = (id) => {
        const currentManifest = formData.passengers_manifest
        if (currentManifest.includes(id)) {
            setFormData({ ...formData, passengers_manifest: currentManifest.filter(pid => pid !== id) })
        } else {
            setFormData({ ...formData, passengers_manifest: [...currentManifest, id] })
        }
    }

    const movePassenger = (index, direction) => {
        const newManifest = [...formData.passengers_manifest]
        if (direction === 'up' && index > 0) {
            [newManifest[index], newManifest[index - 1]] = [newManifest[index - 1], newManifest[index]]
        } else if (direction === 'down' && index < newManifest.length - 1) {
            [newManifest[index], newManifest[index + 1]] = [newManifest[index + 1], newManifest[index]]
        }
        setFormData({ ...formData, passengers_manifest: newManifest })
    }

    const handleShareWhatsapp = (schedule) => {
        // Fallback Organization Lookup
        let orgName = schedule.route?.organization?.name
        if (!orgName && schedule.route_id) {
            const route = routes.find(r => r.id === schedule.route_id)
            if (route?.organization_id) {
                const org = organizations.find(o => o.id === route.organization_id)
                if (org) orgName = org.name
            }
        }
        orgName = orgName || 'Cliente'

        const routeName = schedule.route?.name || 'Ruta'
        const time = schedule.departure_time?.substring(0, 5) || '--:--'
        const driverName = schedule.driver?.first_name || 'Por asignar'
        const plate = schedule.vehicle?.plate_number || '---'

        // Use safe unicode for emojis
        const emojiBus = '\uD83D\uDE8C' // 🚍
        const emojiCal = '\uD83D\uDCC5' // 📅
        const emojiClock = '\u23F0' // ⏰
        const emojiPin = '\uD83D\uDCCD' // 📍
        const emojiDriver = '\uD83D\uDC68\u200D\u2708\uFE0F' // 👨‍✈️ (Actually just use generic man or steer) -> Let's use Wheel ☸️ or just text

        let text = `*SERVICIO DE TRANSPORTE - ${orgName}*\n`
        text += `${emojiCal} Fecha: ${format(new Date(schedule.scheduled_date), 'dd/MM/yyyy')}\n`
        text += `${emojiClock} Hora: *${time}*\n`
        text += `${emojiPin} Ruta: *${routeName}*\n`
        text += `${emojiBus} Conductor: ${driverName} (${plate})\n\n`
        text += `*ORDEN DE RECOJO:*\n`

        if (schedule.passengers_manifest?.length) {
            schedule.passengers_manifest.forEach((pid, idx) => {
                const emp = employees.find(e => e.id === pid)
                text += `${idx + 1}. ${emp?.full_name || 'Pasajero'}\n`
            })
        } else {
            text += `(Sin pasajeros asignados)\n`
        }

        // Encode and open using standard encodeURIComponent
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`
        window.open(url, '_blank')
    }
    const filteredEmployees = employees.filter(emp =>
        emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || emp.dni?.includes(searchTerm)
    ).slice(0, 50)

    // Filter and Sort Schedules
    const visibleSchedules = schedules
        .filter(s => {
            if (viewMode === 'history') return s.status === 'COMPLETED' || s.status === 'CANCELLED'
            return s.status === 'PENDING' || s.status === 'IN_PROGRESS'
        })
        .sort((a, b) => a.departure_time.localeCompare(b.departure_time))

    // Bulk Validation Logic
    const handleToggleSelect = (id) => {
        const newSet = new Set(selectedSchedules)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedSchedules(newSet)
    }

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            // Select all VALIDATABLE (Completed & Not Validated)
            const validatable = visibleSchedules
                .filter(s => s.status === 'COMPLETED' && !s.is_provider_validated)
                .map(s => s.id)
            setSelectedSchedules(new Set(validatable))
        } else {
            setSelectedSchedules(new Set())
        }
    }

    const handleBulkValidate = async () => {
        if (selectedSchedules.size === 0) return
        if (!confirm(`¿Dar conformidad a ${selectedSchedules.size} viajes para facturación?`)) return

        setIsValidating(true)
        try {
            const ids = Array.from(selectedSchedules)
            // Loop update (since we don't have bulk RPC yet, or use Supabase 'in')
            await Promise.all(ids.map(id =>
                transportService.updateSchedule(id, {
                    is_provider_validated: true,
                    provider_validated_at: new Date().toISOString()
                })
            ))

            notify.success('Viajes validados correctamente')
            setSelectedSchedules(new Set())
            loadSchedules()
        } catch (error) {
            console.error(error)
            notify.error('Error al validar viajes')
        } finally {
            setIsValidating(false)
        }
    }

    // Stats
    const stats = {
        total: schedules.length,
        inProgress: schedules.filter(s => s.status === 'IN_PROGRESS').length,
        completed: schedules.filter(s => s.status === 'COMPLETED').length,
        pending: schedules.filter(s => s.status === 'PENDING').length
    }

    // For specific provider flow, allow viewing without station context if they are just seeing their trips? 
    // But currently the system requires station. Let's keep it safe.
    if (!station && !isProvider) return <div className="p-10 text-center text-gray-500">Seleccione una estación de trabajo.</div>
    if (!station && isProvider) {
        // If provider doesn't have station selected (maybe specific logic), handle gracefully or show empty.
        // For now assuming provider context might have station or we just show "Select Station" same as admin.
    }

    // Helper to robustly get route info
    const getRouteDisplay = (schedule) => {
        // 1. Try direct RPC object
        if (schedule.route?.name) {
            return {
                name: schedule.route.name,
                client: schedule.route.organization?.name || 'ORG'
            }
        }
        // 2. Try lookup in routes list
        if (schedule.route_id && routes.length > 0) {
            const foundRoute = routes.find(r => r.id === schedule.route_id)
            if (foundRoute) {
                const foundOrg = organizations.find(o => o.id === foundRoute.organization_id)
                return {
                    name: foundRoute.name,
                    client: foundOrg?.name || 'ORG'
                }
            }
        }
        return { name: 'Sin Ruta Asignada', client: '---' }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-primary-500 to-indigo-600 rounded-lg shadow-lg shadow-primary-500/30">
                            <Calendar className="w-8 h-8 text-white" />
                        </div>
                        {isProvider ? 'Mis Asignaciones de Viaje' : 'Programación de Salidas'}
                    </h1>
                    <p className="text-gray-500 mt-2 ml-14">
                        {isProvider ? 'Gestione conductores y vehículos para sus viajes asignados' : `Gestión de despachos para ${station?.name || '...'}`}
                    </p>
                </div>

                {/* Bulk Validate Button (Provider Only) */}
                {isProvider && selectedSchedules.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="fixed bottom-6 right-6 z-50 md:relative md:bottom-auto md:right-auto md:z-0"
                    >
                        <button
                            onClick={handleBulkValidate}
                            disabled={isValidating}
                            className="btn btn-success shadow-lg shadow-green-500/30 text-white font-bold px-6 animate-pulse"
                        >
                            {isValidating ? <span className="loading loading-spinner"></span> : <CheckCircle className="w-5 h-5 mr-2" />}
                            Validar ({selectedSchedules.size})
                        </button>
                    </motion.div>
                )}

                <div className="flex gap-4">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 min-w-[140px]">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Hoy</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 min-w-[140px]">
                        <p className="text-xs text-blue-400 font-bold uppercase tracking-wider">En Ruta</p>
                        <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                            {stats.inProgress > 0 && <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span></span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4 flex-1 px-4">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={dateRange.from}
                            onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                            className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 dark:text-gray-200"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            value={dateRange.to}
                            onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                            className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 dark:text-gray-200"
                        />
                    </div>

                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2" />

                    {/* View Mode Tabs */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('pending')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'pending' ? 'bg-white dark:bg-gray-600 shadow text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                        >
                            Pendientes
                        </button>
                        <button
                            onClick={() => setViewMode('history')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'history' ? 'bg-white dark:bg-gray-600 shadow text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                        >
                            Historial
                        </button>
                    </div>
                </div>
                {!isProvider && (
                    <button
                        onClick={handleOpenCreate}
                        className="btn btn-primary shadow-lg shadow-primary-500/30 px-8 rounded-xl h-12 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" /> Nueva Salida
                    </button>
                )}
            </div>
            {/* Schedule List - Premium Table View */}
            {loading ? (
                <div className="py-20 flex justify-center"><div className="loading loading-spinner loading-lg text-primary-500"></div></div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                    {isProvider && viewMode === 'history' && (
                                        <th className="px-4 py-4 w-10">
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-sm checkbox-primary"
                                                onChange={handleSelectAll}
                                                checked={selectedSchedules.size > 0 && selectedSchedules.size === visibleSchedules.filter(s => s.status === 'COMPLETED' && !s.is_provider_validated).length}
                                            />
                                        </th>
                                    )}
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Hora</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider min-w-[200px]">Cliente / Ruta</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider min-w-[180px]">Recurso</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Pasajeros</th>
                                    {(isProvider || user?.role === 'SUPERADMIN' || user?.role === 'ADMIN') && (
                                        <>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Validación</th>
                                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Costo</th>
                                        </>
                                    )}
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                <AnimatePresence>
                                    {visibleSchedules.map((schedule, idx) => (
                                        <motion.tr
                                            key={schedule.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            onClick={() => schedule.status === 'PENDING' && !isProvider && handleOpenEdit(schedule)}
                                            className={`group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-default ${schedule.status === 'COMPLETED' ? 'opacity-60 bg-gray-50/50' : ''
                                                }`}
                                        >
                                            {/* Checkbox for Bulk Validation */}
                                            {isProvider && viewMode === 'history' && (
                                                <td className="px-4 py-4">
                                                    {schedule.status === 'COMPLETED' && !schedule.is_provider_validated && (
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox checkbox-sm checkbox-primary"
                                                            checked={selectedSchedules.has(schedule.id)}
                                                            onChange={() => handleToggleSelect(schedule.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    )}
                                                    {schedule.is_provider_validated && (
                                                        <div className="tooltip" data-tip="Validado OK">
                                                            <CheckCircle className="w-5 h-5 text-blue-500 fill-blue-50" />
                                                        </div>
                                                    )}
                                                </td>
                                            )}

                                            {/* Time */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
                                                        <Clock className="w-5 h-5" />
                                                    </div>
                                                    <span className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                                                        {schedule.departure_time.substring(0, 5)}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${schedule.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    schedule.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        schedule.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
                                                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                    }`}>
                                                    {schedule.status === 'IN_PROGRESS' ? 'En Ruta' :
                                                        schedule.status === 'COMPLETED' ? 'Finalizado' :
                                                            schedule.status === 'CANCELLED' ? 'Cancelado' : 'Pendiente'}
                                                </span>
                                            </td>

                                            {/* Client & Route */}
                                            <td className="px-6 py-4 min-w-[200px]">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-primary-600 uppercase flex items-center gap-1 mb-0.5 truncate max-w-[180px]">
                                                        <Building2 className="w-3 h-3 flex-shrink-0" />
                                                        {getRouteDisplay(schedule).client}
                                                    </span>
                                                    <span className="font-bold text-gray-900 dark:text-white text-sm truncate max-w-[180px]" title={getRouteDisplay(schedule).name}>
                                                        {getRouteDisplay(schedule).name}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Resources (Driver/Vehicle) */}
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    {/* Provider Name (for Admins) */}
                                                    {(!isProvider && schedule.provider) && (
                                                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                                            <Briefcase className="w-3 h-3" />
                                                            <span className="font-semibold uppercase tracking-tight">{schedule.provider.username}</span>
                                                        </div>
                                                    )}

                                                    {/* Driver */}
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${schedule.driver ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                                                            {schedule.driver ? schedule.driver.first_name.charAt(0) : '?'}
                                                        </div>
                                                        <span className={`text-sm ${schedule.driver ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400 italic'} truncate max-w-[140px] block`}>
                                                            {schedule.driver?.first_name || 'Sin Chofer'}
                                                        </span>
                                                    </div>

                                                    {/* Vehicle */}
                                                    <div className="flex items-center gap-2 pl-8">
                                                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${schedule.vehicle ? 'bg-gray-100 text-gray-600 border border-gray-200' : 'text-gray-300'}`}>
                                                            {schedule.vehicle?.plate_number || '---'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Passengers */}
                                            <td className="px-6 py-4">
                                                <div className="flex -space-x-2">
                                                    {Array.from({ length: Math.min(3, schedule.passengers_manifest?.length || 0) }).map((_, i) => (
                                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                                                            <Users className="w-3 h-3" />
                                                        </div>
                                                    ))}
                                                    {(schedule.passengers_manifest?.length || 0) > 3 && (
                                                        <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                                            +{schedule.passengers_manifest.length - 3}
                                                        </div>
                                                    )}
                                                    {(schedule.passengers_manifest?.length || 0) === 0 && (
                                                        <span className="text-gray-300 text-xs italic">Sin pax</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Validation & Cost (Provider Only) */}
                                            {(isProvider || user?.role === 'SUPERADMIN' || user?.role === 'ADMIN') && (
                                                <>
                                                    {/* Validation Status */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {schedule.is_provider_validated ? (
                                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                <span className="text-xs font-bold uppercase">Conforme</span>
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400">
                                                                <Clock className="w-4 h-4" />
                                                                <span className="text-xs font-medium uppercase">Pendiente</span>
                                                            </div>
                                                        )}
                                                        {schedule.provider_validated_at && (
                                                            <div className="text-[10px] text-gray-400 mt-1 pl-1">
                                                                {format(new Date(schedule.provider_validated_at), 'dd/MM HH:mm')}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Cost */}
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-xs text-gray-400 font-bold mb-0.5">S/</span>
                                                            <span className="font-mono text-lg font-bold text-gray-900 dark:text-white">
                                                                {Number(schedule.cost || 0).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </>
                                            )}

                                            {/* Actions */}
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* WhatsApp Share Button */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleShareWhatsapp(schedule); }}
                                                        className="btn btn-sm btn-circle btn-ghost text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-700 border border-green-200"
                                                        title="Enviar WhatsApp"
                                                    >
                                                        <Share2 className="w-4 h-4" />
                                                    </button>

                                                    {/* Edit Button (Only for relevant users/status) */}
                                                    {(schedule.status === 'PENDING' || isProvider) && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(schedule); }}
                                                            className="btn btn-sm btn-circle btn-ghost text-gray-500 hover:text-primary-600 hover:bg-gray-100"
                                                            title={isProvider ? "Asignar Recursos" : "Editar"}
                                                        >
                                                            {isProvider ? <Car className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                                {schedules.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="py-20 text-center text-gray-400">
                                            <div className="flex flex-col items-center">
                                                <Clock className="w-16 h-16 text-gray-200 mb-4" />
                                                <p className="text-lg font-medium">No hay salidas programadas</p>
                                                <p className="text-sm">Seleccione otra fecha o cree una nueva salida</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal - Create/Edit */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingSchedule ? "Editar Despacho" : "Programar Despacho"} maxWidth="max-w-5xl">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8 h-[650px] overflow-hidden">
                    {/* Left Column: Form */}
                    <div className="lg:col-span-7 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-6">

                        {/* Section: Route & Time */}
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Detalles del Viaje {isProvider && <span className="badge badge-ghost gap-1"><Lock className="w-3 h-3" /> Solo Lectura</span>}
                            </h4>

                            {isProvider ? (
                                /* --- PROVIDER VIEW (READ ONLY DETAILS + EDITABLE RESOURCES) --- */
                                <div className="space-y-6">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600 border-dashed">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Cliente</p>
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-primary-500" />
                                                    <p className="font-bold text-lg text-gray-800 dark:text-gray-200">
                                                        {editingSchedule ? getRouteDisplay(editingSchedule).client : (organizations.find(o => o.id === selectedOrgFilter)?.name || 'Organización')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Ruta</p>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-secondary-500" />
                                                    <p className="font-bold text-lg text-gray-800 dark:text-gray-200">
                                                        {routes.find(r => r.id === formData.route_id)?.name || '...'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full h-px bg-gray-200 dark:bg-gray-600 my-4" />
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Fecha Programada</p>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    <p className="font-mono font-medium">{format(new Date(formData.scheduled_date || new Date()), 'dd/MM/yyyy')}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Hora Salida</p>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                    <p className="font-mono font-bold text-xl">{formData.departure_time}</p>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Tarifa</p>
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="w-4 h-4 text-green-500" />
                                                    <p className="font-mono font-bold text-xl text-green-600 dark:text-green-400">
                                                        S/ {Number(editingSchedule?.cost || 0).toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Editable Resources for Provider */}
                                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                        <h5 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2">
                                            <Car className="w-4 h-4" /> Asignación de Recursos
                                        </h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="form-control">
                                                <label className="label"><span className="label-text font-bold text-gray-700 dark:text-gray-300">Conductor</span></label>
                                                <select
                                                    className="select select-bordered w-full bg-white dark:bg-gray-800"
                                                    value={formData.driver_id}
                                                    onChange={e => setFormData({ ...formData, driver_id: e.target.value })}
                                                >
                                                    <option value="">-- Sin Asignar --</option>
                                                    {subResources.drivers.map(d => (
                                                        <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-control">
                                                <label className="label"><span className="label-text font-bold text-gray-700 dark:text-gray-300">Vehículo</span></label>
                                                <select
                                                    className="select select-bordered w-full bg-white dark:bg-gray-800"
                                                    value={formData.vehicle_id}
                                                    onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}
                                                >
                                                    <option value="">-- Sin Asignar --</option>
                                                    {subResources.vehicles.map(v => (
                                                        <option key={v.id} value={v.id}>{v.plate_number} - {v.model}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* --- ADMIN VIEW (EDITABLE) --- */
                                <>
                                    {/* Organization Filter */}
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-bold text-gray-700 dark:text-gray-300">Cliente / Organización</span>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Building2 className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <select
                                                className="select select-bordered w-full pl-10 bg-gray-50 dark:bg-gray-900 focus:bg-white transition-colors h-12 text-base"
                                                value={selectedOrgFilter}
                                                onChange={e => {
                                                    setSelectedOrgFilter(e.target.value)
                                                    setFormData(prev => ({ ...prev, route_id: '' })) // Reset route when org changes
                                                }}
                                            >
                                                <option value="">-- Todos los Clientes --</option>
                                                {organizations.map(org => (
                                                    <option key={org.id} value={org.id}>{org.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Route Selection */}
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-bold text-gray-700 dark:text-gray-300">Ruta de Destino</span>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <MapPin className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <select
                                                className="select select-bordered w-full pl-10 bg-gray-50 dark:bg-gray-900 focus:bg-white transition-colors h-12 text-base"
                                                value={formData.route_id}
                                                onChange={e => setFormData({ ...formData, route_id: e.target.value })}
                                            >
                                                <option value="">Seleccione una ruta...</option>
                                                {routes
                                                    .filter(r => !selectedOrgFilter || r.organization_id === selectedOrgFilter)
                                                    .map(r => (
                                                        <option key={r.id} value={r.id}>{r.name}</option>
                                                    ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Date & Time Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="form-control">
                                            <label className="label"><span className="label-text font-bold text-gray-700 dark:text-gray-300">Fecha</span></label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Calendar className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="date"
                                                    className="input input-bordered w-full pl-10 bg-gray-50 dark:bg-gray-900 focus:bg-white"
                                                    value={formData.scheduled_date}
                                                    onChange={e => setFormData({ ...formData, scheduled_date: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-control">
                                            <label className="label"><span className="label-text font-bold text-gray-700 dark:text-gray-300">Hora Salida</span></label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Clock className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="time"
                                                    className="input input-bordered w-full pl-10 bg-gray-50 dark:bg-gray-900 focus:bg-white"
                                                    value={formData.departure_time}
                                                    onChange={e => setFormData({ ...formData, departure_time: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Section: Resources (Admin Only - Providers have their own block above) */}
                        {!isProvider && (
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Car className="w-4 h-4" /> Asignación de Recursos
                                </h4>

                                {/* Provider Selection */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold text-gray-700 dark:text-gray-300">Empresa de Transporte</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Briefcase className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <select
                                            className="select select-bordered w-full pl-10 bg-gray-50 dark:bg-gray-900 focus:bg-white transition-colors h-12 text-base"
                                            value={formData.provider_id}
                                            onChange={e => handleProviderChange(e.target.value)}
                                        >
                                            <option value="">Seleccione Proveedor...</option>
                                            {providers.map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Driver & Vehicle */}
                                <AnimatePresence>
                                    {formData.provider_id && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2"
                                        >
                                            {loadingResources ? (
                                                <div className="col-span-2 flex justify-center py-4 text-gray-400 gap-2">
                                                    <span className="loading loading-spinner loading-sm" /> Cargando recursos...
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="form-control">
                                                        <label className="label"><span className="label-text text-sm font-medium text-gray-500">Conductor</span></label>
                                                        <select
                                                            className="select select-bordered w-full select-sm bg-white"
                                                            value={formData.driver_id}
                                                            onChange={e => setFormData({ ...formData, driver_id: e.target.value })}
                                                        >
                                                            <option value="">-- Sin Asignar --</option>
                                                            {subResources.drivers.length > 0 ? (
                                                                subResources.drivers.map(d => (
                                                                    <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
                                                                ))
                                                            ) : (
                                                                <option disabled>No hay conductores disponibles</option>
                                                            )}
                                                        </select>
                                                    </div>
                                                    <div className="form-control">
                                                        <label className="label"><span className="label-text text-sm font-medium text-gray-500">Vehículo</span></label>
                                                        <select
                                                            className="select select-bordered w-full select-sm bg-white"
                                                            value={formData.vehicle_id}
                                                            onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}
                                                        >
                                                            <option value="">-- Sin Asignar --</option>
                                                            {subResources.vehicles.length > 0 ? (
                                                                subResources.vehicles.map(v => (
                                                                    <option key={v.id} value={v.id}>{v.plate_number} - {v.model}</option>
                                                                ))
                                                            ) : (
                                                                <option disabled>No hay vehículos disponibles</option>
                                                            )}
                                                        </select>
                                                    </div>
                                                </>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Passengers */}
                    <div className="lg:col-span-5 flex flex-col h-full bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <h3 className="font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                                <Users className="w-5 h-5 text-primary-500" /> Manifiesto de Pasajeros
                                <span className="badge badge-primary badge-sm">{formData.passengers_manifest.length}</span>
                            </h3>

                            <div className="mt-3 relative">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o DNI..."
                                    className="input input-bordered input-sm w-full pl-9 rounded-lg bg-gray-100 dark:bg-gray-700 focus:bg-white transition-all"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Selected Passengers (Ordered) - Premium Timeline UI */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white dark:bg-gray-800 relative">
                            {formData.passengers_manifest.length > 0 ? (
                                <div>
                                    <div className="flex items-center justify-between mb-4 px-2">
                                        <h4 className="text-sm font-bold text-primary-600 uppercase tracking-wider flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                                                <ArrowDown className="w-4 h-4" />
                                            </div>
                                            Orden de Recojo
                                        </h4>
                                        <span className="text-xs text-gray-400 font-medium">{formData.passengers_manifest.length} Pax</span>
                                    </div>

                                    <div className="space-y-3 relative pl-4">
                                        {/* Vertical Timeline Line */}
                                        <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gray-100 dark:bg-gray-700 -z-0" />

                                        {formData.passengers_manifest.map((pid, idx) => {
                                            const emp = employees.find(e => e.id === pid)
                                            if (!emp) return null
                                            return (
                                                <div key={pid} className="relative z-10 flex items-center gap-3 group">
                                                    {/* Number Badge */}
                                                    <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-primary-500 text-primary-600 font-bold flex items-center justify-center shadow-sm shrink-0">
                                                        {idx + 1}
                                                    </div>

                                                    {/* Card */}
                                                    <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 p-3 rounded-xl shadow-sm flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                                            {emp.full_name.charAt(0)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{emp.full_name}</p>
                                                            <p className="text-[10px] text-gray-400 truncate">{emp.job_role?.name || 'S/C'}</p>
                                                        </div>

                                                        {/* Reorder Controls (Admin Only) */}
                                                        {!isProvider && (
                                                            <div className="flex flex-col gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => movePassenger(idx, 'up')}
                                                                    disabled={idx === 0}
                                                                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-primary-600 disabled:opacity-0"
                                                                >
                                                                    <ArrowUp className="w-3 h-3" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => movePassenger(idx, 'down')}
                                                                    disabled={idx === formData.passengers_manifest.length - 1}
                                                                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-primary-600 disabled:opacity-0"
                                                                >
                                                                    <ArrowDown className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        )}

                                                        {!isProvider && (
                                                            <button onClick={() => togglePassenger(pid)} className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-lg transition-colors">
                                                                <XCircle className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-40 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                    <Users className="w-10 h-10 mb-2 opacity-50" />
                                    <p className="text-sm">Sin pasajeros asignados</p>
                                </div>
                            )}

                            {/* Section: All Employees (Admin Only) */}
                            {!isProvider && (
                                <>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 border-t pt-6 mt-6">
                                        Todos los Empleados ({filteredEmployees.length})
                                    </h4>
                                    <div className="space-y-1">
                                        {filteredEmployees.map(emp => {
                                            const isSelected = formData.passengers_manifest.includes(emp.id)
                                            return (
                                                <div
                                                    key={emp.id}
                                                    onClick={() => togglePassenger(emp.id)}
                                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border group ${isSelected
                                                        ? 'bg-white shadow-md border-primary-500 ring-1 ring-primary-500 z-10'
                                                        : 'bg-white/50 border-transparent hover:bg-white hover:shadow-sm'
                                                        }`}
                                                >
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${isSelected ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'
                                                        }`}>
                                                        {emp.full_name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-bold truncate ${isSelected ? 'text-primary-800' : 'text-gray-700 dark:text-gray-300'}`}>
                                                            {emp.full_name}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="badge badge-xs bg-gray-100 text-gray-500 border-none">{emp.dni}</span>
                                                            <span className="text-[10px] text-gray-400 truncate">{emp.job_role?.name || 'Sin cargo'}</span>
                                                        </div>
                                                    </div>
                                                    {isSelected ? (
                                                        <CheckCircle className="w-6 h-6 text-primary-500 fill-white" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full border-2 border-gray-200 group-hover:border-gray-300" />
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {filteredEmployees.length === 0 && (
                                        <div className="text-center py-8 text-gray-400 text-sm">
                                            No se encontraron empleados. {isProvider ? '' : 'Intente otra búsqueda.'}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 -mx-6 -mb-6 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="btn btn-ghost hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 font-medium rounded-xl px-6"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className={`btn btn-primary px-8 shadow-lg shadow-primary-500/30 text-white font-bold rounded-xl flex items-center gap-2 transition-transform active:scale-95 ${(!formData.route_id || !formData.provider_id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!formData.route_id || !formData.provider_id}
                    >
                        {editingSchedule ? 'Guardar Cambios' : 'Confirmar Programación'}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </Modal >
        </div >
    )
}

export default SchedulesPage
