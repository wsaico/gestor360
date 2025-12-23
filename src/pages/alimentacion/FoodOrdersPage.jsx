import { useState, useEffect } from 'react'
import {
    Search,
    Filter,
    Calendar,
    CheckCircle,
    XCircle,
    Clock,
    Trash2,
    Edit2,
    MoreVertical,
    UtensilsCrossed,
    Download,
    Plus,
    AlertTriangle
} from 'lucide-react'
import SearchableSelect from '@components/common/SearchableSelect'
import employeeService from '@services/employeeService' // Add employee service
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@contexts/AuthContext'
import foodOrderService from '@services/foodOrderService'
import stationService from '@services/stationService'
import pricingService from '@services/pricingService'
import menuService from '@services/menuService' // Add import
import { ROLES, MEAL_TYPE_LABELS } from '@utils/constants'
import { formatDate } from '@utils/helpers'
import { useNotification } from '@contexts/NotificationContext'
import * as XLSX from 'xlsx' // Add XLSX import

const FoodOrdersPage = () => {
    const { user, station, hasRole } = useAuth()
    const { notify } = useNotification() // Hook
    const [loading, setLoading] = useState(false)
    const [orders, setOrders] = useState([])
    const [stats, setStats] = useState({ total: 0, pending: 0, consumed: 0, cancelled: 0 })

    // Filters
    const [stations, setStations] = useState([])
    const [selectedStationId, setSelectedStationId] = useState(user?.station_id || '')
    const [dateRange, setDateRange] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    })
    const [statusFilter, setStatusFilter] = useState('')

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false) // Audit Modal
    const [missingEmployees, setMissingEmployees] = useState([]) // For Audit

    // Confirmation Modal State
    const [confirmation, setConfirmation] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirmar',
        confirmColor: 'primary', // primary, red, green
        onConfirm: null
    })

    // Init Logic to check URL params for date (deep linking)
    const [employees, setEmployees] = useState([])
    const [formData, setFormData] = useState({
        employee_id: '',
        visitor_name: '',
        menu_date: new Date().toISOString().split('T')[0],
        meal_type: 'ALMUERZO',
        selected_option: 'Menú del Día', // Default or fetch menus
        order_type: 'MANUAL', // MANUAL or VISITOR
        notes: '',
        pricing_rule: 'STANDARD' // STANDARD | COURTESY | FULL
    })
    const [selectedEmployeePricing, setSelectedEmployeePricing] = useState(null)

    /* Logic determining view mode */
    const isManager = hasRole(ROLES.ADMIN) || hasRole(ROLES.SUPERVISOR) || hasRole(ROLES.PROVIDER)

    // Init
    useEffect(() => {
        if (hasRole(ROLES.ADMIN)) {
            loadStations()
        }
        // Sync with Global Station Context (Header Selector)
        if (station) {
            setSelectedStationId(station.id)
        } else if (user?.station_id) {
            // Fallback to user assigned station if not global admin context
            setSelectedStationId(user.station_id)
        } else {
            // Global Admin with no station selected -> Show All (empty string)
            setSelectedStationId('')
        }
    }, [user, station]) // Add station to dependency

    useEffect(() => {
        // Allow loading with empty stationId (Global View) for Admins
        loadOrders()
        if (isModalOpen) {
            loadEmployees()
        }
    }, [selectedStationId, dateRange, statusFilter, isManager])

    const loadStations = async () => {
        try {
            const data = await stationService.getAll()
            setStations(data)
            // Default to ALL (empty) for comprehensive view
            // if (data.length > 0 && !selectedStationId) {
            //     setSelectedStationId(data[0].id)
            // }
        } catch (error) {
            console.error('Error loading stations:', error)
        }
    }

    // Load available employees for manual assignment
    const loadEmployees = async () => {
        try {
            const stationToLoad = selectedStationId || user?.station_id
            // Only load if we have a station context (or global admin might want all? Usually context specific)
            // User requested strict filtering.
            if (stationToLoad) {
                const response = await employeeService.getAll(stationToLoad, { activeOnly: true }, 1, 1000)
                const data = response.data
                setEmployees(data || [])
            } else {
                setEmployees([])
            }
        } catch (error) {
            console.error('Error loading employees:', error)
        }
    }

    const openManualOrder = () => {
        setFormData({
            employee_id: '',
            visitor_name: '', // Kept for safety but unused
            menu_date: new Date().toISOString().split('T')[0],
            meal_type: 'ALMUERZO',
            selected_option: 'Menú del Día',
            order_type: 'MANUAL',
            notes: '',
            pricing_rule: 'STANDARD'
        })
        setSelectedEmployeePricing(null)
        if (employees.length === 0) {
            loadEmployees()
        }
        setIsModalOpen(true)
    }

    const handleManualSubmit = async (e) => {
        e.preventDefault()
        try {
            // Basic validation
            if (!formData.employee_id) return notify.warning('Seleccione un empleado o visitante')

            let costUser = 0;
            let subsidyCompany = 0;
            let fullPrice = 0;

            // Fetch pricing if not already fetched (safeguard)
            let pricing = selectedEmployeePricing
            if (!pricing && formData.employee_id) {
                const emp = employees.find(e => e.id === formData.employee_id)
                if (emp) {
                    pricing = await pricingService.getByRole(selectedStationId || user?.station_id, emp.role_name)
                }
            }

            // --- Menu Validation Logic ---
            let menuId = null
            const targetStationId = selectedStationId || user?.station_id || (user?.role === 'SUPERADMIN' ? formData.station_id : null)

            try {
                // Find existing menu for date/meal/station
                const menus = await menuService.getAll(targetStationId, {
                    startDate: formData.menu_date,
                    endDate: formData.menu_date,
                    meal_type: formData.meal_type
                })

                if (menus && menus.length > 0) {
                    menuId = menus[0].id
                } else {
                    // DB now allows NULL menu_id (via recent migration)
                    // We allow regularization even if no menu exists
                    console.warn(`No existe un menú programado para ${formData.menu_date}. Se registrará sin menú asociado.`)
                }
            } catch (err) {
                console.error('Error finding menu:', err)
                // Non-blocking error for menu lookup
            }
            // -----------------------------

            if (pricing) {
                fullPrice = parseFloat(pricing.employee_cost) + parseFloat(pricing.company_subsidy)

                // Check for Courtesy Visitor Logic
                // If it's a Manual Order, we might have selected an employee. 
                // Let's check the employee object from the list.
                const selectedEmp = employees.find(e => e.id === formData.employee_id)
                const isCourtesyVisitor = selectedEmp?.is_visitor && selectedEmp?.visitor_discount_type === 'COURTESY'

                if (isCourtesyVisitor) {
                    // Override for Courtesy Visitor: Cost 0, Pricing Rule COURTESY (Logic below handles it but we force it)
                    console.log('Aplicando lógica de CORTESÍA para visitante')
                    costUser = 0
                    subsidyCompany = 0 // Zero Cost for Everyone (Just a record)
                    formData.pricing_rule = 'COURTESY' // Force rule
                } else if (formData.pricing_rule === 'STANDARD') { // Normal Employee Rate
                    costUser = parseFloat(pricing.employee_cost)
                    subsidyCompany = parseFloat(pricing.company_subsidy)
                } else if (formData.pricing_rule === 'COURTESY') { // Manual Override
                    costUser = 0
                    subsidyCompany = 0
                } else if (formData.pricing_rule === 'FULL') { // Visitor pays all (Zero subsidy)
                    costUser = fullPrice
                    subsidyCompany = 0
                }
            } else {
                // Fallback if no pricing found 
                console.warn('No pricing found for employee, defaulting to 0')
                // If courtesy visitor without pricing, still 0
                const selectedEmp = employees.find(e => e.id === formData.employee_id)
                if (selectedEmp?.is_visitor && selectedEmp?.visitor_discount_type === 'COURTESY') {
                    formData.pricing_rule = 'COURTESY'
                }
            }

            const payload = {
                ...formData,
                menu_id: menuId, // Associated Menu ID
                station_id: selectedStationId || user?.station_id,
                status: 'CONFIRMED', // Auto-confirm manual orders
                cost_applied: costUser,
                // Map 'MANUAL' (frontend state) to 'NORMAL' (DB enum) because DB doesn't accept 'MANUAL'
                // is_manual_entry already flags it as an admin action.
                order_type: formData.pricing_rule === 'FULL' ? 'SPECIAL' : 'NORMAL',
                employee_cost_snapshot: costUser,
                company_subsidy_snapshot: subsidyCompany,
                is_manual_entry: true,
                manual_entry_by: user.id
            }

            // Remove temporary field
            delete payload.pricing_rule

            // If visitor, we need a dummy employee ID or handle it in backend.
            // For now, assuming backend handles NULL employee_id for visitors or we assign to a "Visitor User"
            // The constraint might require employee_id. If so, we need a generic visitor employee or change DB.
            // Plan: If employee_id is required, we might fail. 
            // Wait, previous DB migration didn't make employee_id nullable?
            // Let's assume for MANUAL it works. For VISITOR, we might strictly need an employee_id if the DB says so.
            // Re-checking DB schema... `employee_id` is usually FK.
            // Quick fix: User requested "Visitor Support". Usually implies either a "Visitor" employee record or nullable FK.
            // I will use `visitor_name` in `notes` for now if I must assign to a placeholder, BUT 
            // implementation_plan said "Support Visitor".
            // If the DB requires employee_id, I will block Visitor mode creation without a selected "Host" employee or similar.
            // Actually, for "Regularization" (MANUAL), I pick an employee.
            // For VISITOR, I probably also pick the "Host" (Employee responsible) or just the Name if DB allows null.

            // Let's try sending. If it fails, I'll alert.
            await foodOrderService.create(payload)
            setIsModalOpen(false)
            loadOrders()
            notify.success('Pedido creado exitosamente')

        } catch (error) {
            console.error(error)
            notify.error(error.message)
        }
    }

    const loadOrders = async () => {
        setLoading(true)
        try {
            const filters = {
                startDate: dateRange.startDate || undefined,
                endDate: dateRange.endDate || undefined,
                status: statusFilter || undefined
            }

            let data = []

            // Si NO es manager, filtrar solo sus pedidos
            if (!isManager) {
                // Asumimos que user tiene employee_id o id que mapea.
                // Si no tiene station_id cargado, podría fallar el getAll(selectedStationId).
                // Usaremos getByEmployee si no es manager? O getAll con filtro.
                // El servicio tiene getByEmployee. Usémoslo para empleados normales.

                const empId = user?.employee_id || user?.id
                if (empId) {
                    data = await foodOrderService.getByEmployee(empId, filters)
                    updateStats(data)
                    setOrders(data)
                }
            } else {
                // Manager View
                data = await foodOrderService.getAll(selectedStationId, filters)
                updateStats(data)
                setOrders(data)
            }

        } catch (error) {
            console.error('Error loading orders:', error)
        } finally {
            setLoading(false)
        }
    }

    const updateStats = (data) => {
        setStats({
            total: data.length,
            pending: data.filter(o => o.status === 'PENDING').length,
            consumed: data.filter(o => o.status === 'CONSUMED').length,
            cancelled: data.filter(o => o.status === 'CANCELLED').length
        })
    }

    const handleStatusChange = (orderId, newStatus) => {
        // Validar permisos
        if (!isManager && newStatus === 'CONSUMED') {
            notify.warning('No tienes permisos para realizar esta acción')
            return
        }

        setConfirmation({
            isOpen: true,
            title: 'Actualizar Estado',
            message: `¿Estás seguro de cambiar el estado a ${newStatus}?`,
            confirmText: 'Actualizar',
            confirmColor: newStatus === 'CANCELLED' ? 'red' : 'primary',
            onConfirm: async () => {
                try {
                    await foodOrderService.update(orderId, { status: newStatus })
                    loadOrders()
                    notify.success('Estado actualizado correctamente')
                } catch (error) {
                    console.error('Error updating status:', error)
                    notify.error('Error al actualizar el estado')
                }
                closeConfirmation()
            }
        })
    }

    const handleDelete = (orderId) => {
        setConfirmation({
            isOpen: true,
            title: 'Eliminar Pedido',
            message: '¿Estás seguro de eliminar este pedido permanentemente? Esta acción no se puede deshacer.',
            confirmText: 'Eliminar',
            confirmColor: 'red',
            onConfirm: async () => {
                try {
                    await foodOrderService.delete(orderId)
                    loadOrders()
                    notify.success('Pedido eliminado correctamente')
                } catch (error) {
                    console.error('Error deleting order:', error)
                    notify.error('Error al eliminar el pedido')
                }
                closeConfirmation()
            }
        })
    }

    const closeConfirmation = () => {
        setConfirmation(prev => ({ ...prev, isOpen: false }))
    }

    // --- Export & Audit ---
    const handleExportExcel = () => {
        try {
            const dataToExport = orders.map(order => ({
                'Fecha': formatDate(order.menu_date),
                'Tipo': MEAL_TYPE_LABELS[order.meal_type] || order.meal_type,
                'Estación': stations.find(s => s.id === order.station_id)?.name || order.station_id,
                'Empleado': order.employee?.full_name || 'Visitante',
                'DNI': order.employee?.dni || '-',
                'Rol': order.employee?.role_name || '-',
                'Opción': order.selected_option,
                'Estado': order.status,
                'Costo Empleado': order.cost_applied,
                'Subsidio Empresa': order.company_subsidy_snapshot,
                'Notas': order.notes || '-'
            }))

            const ws = XLSX.utils.json_to_sheet(dataToExport)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "Pedidos")
            XLSX.writeFile(wb, `Reporte_Alimentacion_${new Date().toISOString().split('T')[0]}.xlsx`)
            notify.success('Reporte descargado exitosamente')
        } catch (error) {
            console.error(error)
            notify.error('Error al exportar Excel')
        }
    }

    const handleOpenAudit = async () => {
        try {
            // Need a station context to audit against
            const targetStationId = selectedStationId || user?.station_id

            // Fetch active employees for this context
            // Note: If no station selected (Superadmin view all), this might be heavy.
            // We'll warn or just fetch all? Let's try fetching all if no station.
            const { data: allEmployees } = await employeeService.getAll(targetStationId, { activeOnly: true }, 1, 1000)

            // Get unique employee IDs who HAVE orders in the CURRENT FILTERED LIST
            // This assumes the user has filtered by the Date/Meal they want to audit.
            const employeesWithOrder = new Set(orders.map(o => o.employee_id))

            // Find missing
            const missing = allEmployees.filter(emp => !employeesWithOrder.has(emp.id))

            setMissingEmployees(missing)
            setIsAuditModalOpen(true)
        } catch (error) {
            console.error(error)
            notify.error('Error al generar auditoría')
        }
    }

    const getStatusBadge = (status) => {
        const config = {
            PENDING: { color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50', label: 'Pendiente', icon: Clock },
            CONSUMED: { color: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800/50', label: 'Atendido', icon: CheckCircle },
            CANCELLED: { color: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800/50', label: 'Cancelado', icon: XCircle }
        }
        const style = config[status] || config.PENDING
        const Icon = style.icon

        return (
            <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${style.color}`}>
                <Icon className="w-3 h-3" />
                <span>{style.label}</span>
            </span>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <UtensilsCrossed className="w-8 h-8 text-primary-600" />
                        {isManager ? 'Gestión de Pedidos' : 'Mis Pedidos'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        {isManager ? 'Administra los pedidos de alimentación de la estación' : 'Historial de tus pedidos de alimentación'}
                    </p>
                </div>
            </div>



            {/* Quick Actions (Manager Only) */}
            {
                isManager && (
                    <div className="flex gap-2">
                        <button
                            onClick={openManualOrder}
                            className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-700 active:scale-95 transition-all shadow-sm"
                        >
                            <Plus size={20} />
                            <span className="hidden sm:inline font-medium">Nuevo Pedido</span>
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 active:scale-95 transition-all shadow-sm"
                            title="Descargar Excel"
                        >
                            <Download size={20} />
                            <span className="hidden sm:inline font-medium">Excel</span>
                        </button>
                        <button
                            onClick={handleOpenAudit}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 active:scale-95 transition-all shadow-sm"
                            title="Auditoría / Falta Pedir"
                        >
                            <CheckCircle size={20} />
                            <span className="hidden sm:inline font-medium">Auditoría / Faltantes</span>
                        </button>
                    </div>
                )
            }

            {/* Filters Bar */}
            <div className="card p-4 space-y-4 md:space-y-0 md:flex md:flex-wrap md:items-end md:gap-4">

                {/* Quick Dates - Full width on mobile for easy reach */}
                <div className="flex gap-2 w-full md:w-auto">
                    <button
                        onClick={() => setDateRange({
                            startDate: new Date().toISOString().split('T')[0],
                            endDate: new Date().toISOString().split('T')[0]
                        })}
                        className="flex-1 md:flex-none px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 transition-colors"
                    >
                        HOY
                    </button>
                    <button
                        onClick={() => setDateRange({
                            startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                            endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
                        })}
                        className="flex-1 md:flex-none px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 border border-purple-200 dark:border-purple-800/50 transition-colors"
                    >
                        MAÑANA
                    </button>
                </div>

                {/* Filter Inputs Grid */}
                <div className="grid grid-cols-2 gap-3 w-full md:flex md:w-auto md:flex-1 md:items-end">

                    {/* Admin Station Selector */}
                    {hasRole(ROLES.ADMIN) && (
                        <div className="col-span-2 md:w-48">
                            <label className="label">Estación</label>
                            <select
                                value={selectedStationId}
                                onChange={(e) => setSelectedStationId(e.target.value)}
                                className="input w-full"
                            >
                                <option value="">Todas las estaciones</option>
                                {stations.map(st => (
                                    <option key={st.id} value={st.id}>{st.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Date Inputs */}
                    <div className="col-span-1 md:w-auto">
                        <label className="label">Desde</label>
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                            className="input w-full"
                        />
                    </div>
                    <div className="col-span-1 md:w-auto">
                        <label className="label">Hasta</label>
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                            className="input w-full"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="col-span-2 md:w-40">
                        <label className="label">Estado</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input w-full"
                        >
                            <option value="">Todos</option>
                            <option value="PENDING">Pendientes</option>
                            <option value="CONSUMED">Atendidos</option>
                            <option value="CANCELLED">Cancelados</option>
                        </select>
                    </div>

                    {/* Search Button */}
                    <div className="col-span-2 md:w-auto">
                        <button
                            onClick={loadOrders}
                            className="w-full md:w-auto p-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                            title="Recargar"
                        >
                            <Search className="w-5 h-5" />
                            <span className="md:hidden text-sm font-medium">Filtrar</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: stats.total, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/20' },
                    { label: 'Pendientes', value: stats.pending, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
                    { label: 'Atendidos', value: stats.consumed, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
                    { label: 'Cancelados', value: stats.cancelled, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
                ].map((stat, i) => (
                    <div key={i} className={`card ${stat.bg} p-4 !border-none`}>
                        <span className={`block text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{stat.label}</span>
                    </div>
                ))}
            </div>

            {/* Orders List */}
            <div className="gestor-table-container">

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="gestor-table">
                        <thead className="gestor-thead">
                            <tr>
                                <th scope="col" className="gestor-th">Fecha</th>
                                <th scope="col" className="gestor-th">Estación</th>
                                <th scope="col" className="gestor-th">Empleado</th>
                                <th scope="col" className="gestor-th">Detalle</th>
                                <th scope="col" className="gestor-th">Opción</th>
                                <th scope="col" className="gestor-th">Estado</th>
                                <th scope="col" className="gestor-th text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="gestor-tbody">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="gestor-td text-center py-12 text-gray-500 dark:text-gray-400">
                                        Cargando pedidos...
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="gestor-td text-center py-12 text-gray-500 dark:text-gray-400">
                                        No hay pedidos registrados para estos filtros.
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id} className="gestor-tr-hover">
                                        <td className="gestor-td whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                            {formatDate(order.menu_date)}
                                        </td>
                                        <td className="gestor-td whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {stations.find(s => s.id === order.station_id)?.name || order.station_id?.slice(0, 8)}
                                        </td>
                                        <td className="gestor-td">
                                            <div className="flex items-center">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{order.employee?.full_name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{order.employee?.role_name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="gestor-td">
                                            <div className="text-sm text-gray-900 dark:text-white font-medium">
                                                {MEAL_TYPE_LABELS[order.meal_type] || order.meal_type}
                                            </div>
                                            {order.order_type === 'ESPECIAL' && (
                                                <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full font-bold uppercase">Especial</span>
                                            )}
                                        </td>
                                        <td className="gestor-td text-sm text-gray-600 dark:text-gray-300">
                                            {order.selected_option}
                                        </td>
                                        <td className="gestor-td whitespace-nowrap text-[10px] font-bold uppercase tracking-wider">
                                            {getStatusBadge(order.status)}
                                        </td>
                                        <td className="gestor-td whitespace-nowrap text-right text-sm font-medium">

                                            {/* Actions */}
                                            <div className="flex items-center justify-end space-x-3">
                                                {order.status === 'PENDING' && isManager && (
                                                    <button
                                                        onClick={() => handleStatusChange(order.id, 'CONSUMED')}
                                                        className="text-green-600 hover:text-green-900"
                                                        title="Marcar Atendido"
                                                    >
                                                        <CheckCircle className="w-5 h-5" />
                                                    </button>
                                                )}

                                                {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                                                    <button
                                                        onClick={() => handleStatusChange(order.id, 'CANCELLED')}
                                                        className="text-red-600 hover:text-red-900"
                                                        title="Cancelar Pedido"
                                                    >
                                                        <XCircle className="w-5 h-5" />
                                                    </button>
                                                )}

                                                {/* Allow Delete if PENDING (for everyone) OR if ADMIN (any status) */}
                                                {(order.status === 'PENDING' || hasRole(ROLES.ADMIN)) && !hasRole(ROLES.PROVIDER) && (
                                                    <button
                                                        onClick={() => handleDelete(order.id)}
                                                        className="text-gray-400 hover:text-red-600"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>

                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4 p-4">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Cargando pedidos...</div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">No hay pedidos registrados para estos filtros.</div>
                    ) : (
                        orders.map((order) => (
                            <div key={order.id} className="card p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white text-lg">{order.employee?.full_name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{order.employee?.role_name}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                            {stations.find(s => s.id === order.station_id)?.name || ''}
                                        </p>
                                    </div>
                                    {getStatusBadge(order.status)}
                                </div>

                                <div className="py-2 border-t border-b border-gray-50 space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Opción:</span>
                                        <span className="font-medium text-gray-900">{order.selected_option}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Tipo:</span>
                                        <span className="text-gray-900">
                                            {MEAL_TYPE_LABELS[order.meal_type]}
                                            {order.order_type === 'ESPECIAL' && <span className="ml-1 text-xs text-purple-600">(Especial)</span>}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Fecha:</span>
                                        <span className="text-gray-900">{formatDate(order.menu_date)}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    {order.status === 'PENDING' && isManager ? (
                                        <button
                                            onClick={() => handleStatusChange(order.id, 'CONSUMED')}
                                            className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle className="w-5 h-5" />
                                            <span>Atender</span>
                                        </button>
                                    ) : null}

                                    {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                                        <button
                                            onClick={() => handleStatusChange(order.id, 'CANCELLED')}
                                            className="px-4 py-3 bg-white text-red-600 border border-red-100 rounded-xl font-medium hover:bg-red-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            <XCircle className="w-5 h-5" />
                                            <span className="sr-only sm:not-sr-only">Cancelar</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            {/* Manual Order Modal */}
            {/* Manual Order Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                        >
                            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Nuevo Pedido Manual
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                <form onSubmit={handleManualSubmit} className="space-y-4">

                                    {/* Row 1: Date & Meal */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Fecha</label>
                                            <input
                                                type="date"
                                                required
                                                className="input w-full"
                                                value={formData.menu_date}
                                                onChange={e => setFormData({ ...formData, menu_date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Tipo Comida</label>
                                            <select
                                                className="input w-full"
                                                value={formData.meal_type}
                                                onChange={e => setFormData({ ...formData, meal_type: e.target.value })}
                                            >
                                                <option value="DESAYUNO">Desayuno</option>
                                                <option value="ALMUERZO">Almuerzo</option>
                                                <option value="CENA">Cena</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Row 2: Employee */}
                                    <div>
                                        <SearchableSelect
                                            label="Empleado / Visitante"
                                            required
                                            placeholder="Buscar por nombre o DNI..."
                                            options={employees.map(emp => ({
                                                value: emp.id,
                                                label: `${emp.full_name} (${emp.dni})`,
                                                subLabel: emp.role_name
                                            }))}
                                            value={formData.employee_id}
                                            onChange={async (val) => {
                                                setFormData({ ...formData, employee_id: val })
                                                // Fetch pricing preview
                                                if (val) {
                                                    const emp = employees.find(e => e.id === val)
                                                    if (emp) {
                                                        try {
                                                            const p = await pricingService.getByRole(emp.station_id || selectedStationId, emp.role_name)
                                                            setSelectedEmployeePricing(p)
                                                        } catch (err) { console.error(err) }
                                                    }
                                                } else {
                                                    setSelectedEmployeePricing(null)
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* Row 3: Pricing Rules (Compact) */}
                                    {selectedEmployeePricing && (
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600 text-sm">
                                            <p className="font-bold text-gray-700 dark:text-gray-300 mb-2">Regla de Cobro:</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                                    <input
                                                        type="radio"
                                                        name="pricing_rule" value="STANDARD"
                                                        checked={formData.pricing_rule === 'STANDARD'}
                                                        onChange={e => setFormData({ ...formData, pricing_rule: e.target.value })}
                                                        className="text-primary-600 focus:ring-primary-500"
                                                    />
                                                    <span className="flex flex-col">
                                                        <span className="font-medium">Estándar</span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">S/{parseFloat(selectedEmployeePricing.employee_cost).toFixed(2)}</span>
                                                    </span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                                    <input
                                                        type="radio"
                                                        name="pricing_rule" value="COURTESY"
                                                        checked={formData.pricing_rule === 'COURTESY'}
                                                        onChange={e => setFormData({ ...formData, pricing_rule: e.target.value })}
                                                        className="text-primary-600 focus:ring-primary-500"
                                                    />
                                                    <span className="flex flex-col">
                                                        <span className="font-medium">Cortesía</span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">S/0.00</span>
                                                    </span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                                    <input
                                                        type="radio"
                                                        name="pricing_rule" value="FULL"
                                                        checked={formData.pricing_rule === 'FULL'}
                                                        onChange={e => setFormData({ ...formData, pricing_rule: e.target.value })}
                                                        className="text-primary-600 focus:ring-primary-500"
                                                    />
                                                    <span className="flex flex-col">
                                                        <span className="font-medium">Full</span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">S/{(parseFloat(selectedEmployeePricing.employee_cost) + parseFloat(selectedEmployeePricing.company_subsidy)).toFixed(2)}</span>
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* Row 4: Option & Notes */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Opción / Plato</label>
                                            <input
                                                type="text"
                                                required
                                                className="input w-full"
                                                placeholder="Ej. Menú del día"
                                                value={formData.selected_option}
                                                onChange={e => setFormData({ ...formData, selected_option: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Notas (Opcional)</label>
                                            <input
                                                type="text"
                                                className="input w-full"
                                                placeholder="Ej. Sin ensalada"
                                                value={formData.notes}
                                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </form>
                            </div>

                            {/* Footer (Fixed at bottom) */}
                            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl flex gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleManualSubmit}
                                    className="btn flex-1 bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-600/30"
                                >
                                    <CheckCircle size={18} className="mr-2" />
                                    Confirmar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Audit Modal */}
            <AnimatePresence>
                {isAuditModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                        >
                            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                        Auditoría / Faltantes
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Personal activo sin pedido para la fecha seleccionada.
                                    </p>
                                </div>
                                <button onClick={() => setIsAuditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                {/* Stats Summary */}
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            {employees.length + missingEmployees.length}
                                        </div>
                                        <div className="text-xs font-medium text-blue-800 dark:text-blue-300 uppercase mt-1">Total Activos</div>
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                            {orders.length}
                                        </div>
                                        <div className="text-xs font-medium text-green-800 dark:text-green-300 uppercase mt-1">Con Pedido</div>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-center">
                                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                            {missingEmployees.length}
                                        </div>
                                        <div className="text-xs font-medium text-red-800 dark:text-red-300 uppercase mt-1">Faltantes</div>
                                    </div>
                                </div>

                                {/* Missing List */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <UtensilsCrossed size={16} />
                                        Personal Faltante ({missingEmployees.length})
                                    </h4>

                                    {missingEmployees.length === 0 ? (
                                        <div className="text-center py-8 text-green-600 bg-green-50 rounded-lg dark:bg-green-900/10">
                                            <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p className="font-medium">¡Todo el personal tiene pedido!</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-100 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                                            {missingEmployees.map(emp => (
                                                <div key={emp.id} className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 flex justify-between items-center transition-colors">
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">{emp.full_name}</p>
                                                        <p className="text-xs text-gray-500">{emp.role_name} • {emp.dni}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setIsAuditModalOpen(false)
                                                                setFormData(prev => ({ ...prev, employee_id: emp.id }))
                                                                setIsModalOpen(true) // Open Manual Order pre-filled
                                                            }}
                                                            className="text-xs bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full hover:bg-primary-100 font-medium"
                                                        >
                                                            Crear Pedido
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {confirmation.isOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 text-center">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmation.confirmColor === 'red' ? 'bg-red-100 text-red-600' : 'bg-primary-50 text-primary-600'
                                    }`}>
                                    <AlertTriangle size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    {confirmation.title}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                                    {confirmation.message}
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={closeConfirmation}
                                        className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors dark:bg-gray-700 dark:text-gray-300"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmation.onConfirm}
                                        className={`flex-1 py-3 font-bold rounded-xl text-white shadow-lg transition-all active:scale-95 ${confirmation.confirmColor === 'red'
                                            ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30'
                                            : 'bg-primary-600 hover:bg-primary-700 shadow-primary-600/30'
                                            }`}
                                    >
                                        {confirmation.confirmText}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    )
}

export default FoodOrdersPage

