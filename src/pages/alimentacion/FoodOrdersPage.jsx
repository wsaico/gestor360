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
    Download
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@contexts/AuthContext'
import foodOrderService from '@services/foodOrderService'
import stationService from '@services/stationService'
import { ROLES, MEAL_TYPE_LABELS } from '@utils/constants'
import { formatDate } from '@utils/helpers'

const FoodOrdersPage = () => {
    const { user, hasRole } = useAuth()
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

    /* Logic determining view mode */
    const isManager = hasRole(ROLES.ADMIN) || hasRole(ROLES.SUPERVISOR) || hasRole(ROLES.PROVIDER)

    // Init
    useEffect(() => {
        if (hasRole(ROLES.ADMIN)) {
            loadStations()
        } else if (user?.station_id) {
            setSelectedStationId(user.station_id)
        }
    }, [user])

    useEffect(() => {
        // Allow loading with empty stationId (Global View) for Admins
        loadOrders()
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

    const handleStatusChange = async (orderId, newStatus) => {
        // Validar permisos
        if (!isManager && newStatus === 'CONSUMED') {
            alert('No tienes permisos para realizar esta acción')
            return
        }

        if (!window.confirm(`¿Estás seguro de cambiar el estado a ${newStatus}?`)) return

        try {
            await foodOrderService.update(orderId, { status: newStatus })
            loadOrders()
        } catch (error) {
            console.error('Error updating status:', error)
            alert('Error al actualizar el estado')
        }
    }

    const handleDelete = async (orderId) => {
        if (!window.confirm('¿Estás seguro de eliminar este pedido permanentemente?')) return

        try {
            await foodOrderService.delete(orderId)
            loadOrders()
        } catch (error) {
            console.error('Error deleting order:', error)
            alert('Error al eliminar el pedido')
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

                                                {order.status === 'PENDING' && !hasRole(ROLES.PROVIDER) && (
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
        </div>
    )
}

export default FoodOrdersPage

