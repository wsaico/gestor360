import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@contexts/AuthContext'
import { useNotification } from '@contexts/NotificationContext' // Added import
import supabase from '@services/supabase'
import deliveryService from '@services/deliveryService'
import eppInventoryService from '@services/eppInventoryService'
import employeeService from '@services/employeeService' // Added
import reportService from '@services/reportService' // Added
import SearchableSelect from '@components/common/SearchableSelect' // Added
import SignatureCanvas from '@components/SignatureCanvas'
import AddStockModal from '@components/sst/AddStockModal'
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  RefreshCw,
  Package,
  User,
  Calendar,
  Search,
  X,
  Plus,
  Sparkles,
  ClipboardList,
  Download
} from 'lucide-react'
import {
  RENEWAL_STATUS_LABELS
} from '@utils/constants'

// BUENA PRÁCTICA: Centralizar la lógica de días restantes para consistencia
const calculateDaysDiff = (renewalDate) => {
  if (!renewalDate) return null

  // 1. Normalizar fechas a medianoche (00:00:00) para evitar problemas de zona horaria/horas
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const renewal = new Date(renewalDate)
  renewal.setHours(0, 0, 0, 0)

  // 2. Calcular diferencia en milisegundos y convertir a días enteros
  const diffTime = renewal.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

const RenewalsPage = () => {
  const { station, user } = useAuth()
  const { notify } = useNotification() // Added hook

  const [renewals, setRenewals] = useState([])
  const [items, setItems] = useState([])
  const [employees, setEmployees] = useState([]) // Added
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [showRenewalModal, setShowRenewalModal] = useState(false)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  // const [showResponsibleSignModal, setShowResponsibleSignModal] = useState(false) // Removed
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])
  const [signatureType, setSignatureType] = useState(null)
  const [deliveryId, setDeliveryId] = useState(null)
  const [signingStep, setSigningStep] = useState(1) // Added

  // Stock Modal State
  const [showStockModal, setShowStockModal] = useState(false)
  const [stockItem, setStockItem] = useState(null)

  const [responsibleData, setResponsibleData] = useState({
    name: '',
    position: '',
    employee_id: '' // Added for SearchableSelect
  })

  useEffect(() => {
    if (station?.id) {
      fetchRenewals()
      fetchItems()
      fetchEmployees() // Added
    }
  }, [station?.id])

  const fetchRenewals = async () => {
    if (!station?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('vw_renewals_pending')
        .select('*')
        .eq('station_id', station.id)
        .order('renewal_date', { ascending: true })

      if (error) throw error

      setRenewals(data || [])
    } catch (error) {
      console.error('Error fetching renewals:', error)
      notify.error('Error al cargar las renovaciones: ' + error.message) // Use notify
    } finally {
      setLoading(false)
    }
  }

  const fetchItems = async () => {
    if (!station?.id) return

    try {
      const data = await eppInventoryService.getAll(station.id)

      setItems(data || [])
    } catch (error) {
      console.error('Error fetching items:', error)
    }
  }

  const fetchEmployees = async () => {
    if (!station?.id) return
    try {
      const { data } = await employeeService.getAll(station.id, { activeOnly: true }, 1, 1000)
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  // Stock Handlers
  const handleOpenStockModal = (e, itemId) => {
    e.preventDefault()
    const item = items.find(i => i.id === itemId)
    if (item) {
      setStockItem(item)
      setShowStockModal(true)
    }
  }

  const handleStockSuccess = async () => {
    // Refresh items to update stock view
    await fetchItems()
    notify.success('Stock actualizado') // Added feedback
  }

  const handleRenewEmployee = (employeeId, employeeName) => {
    const employeeRenewals = renewals.filter(r => r.employee_id === employeeId)
    setSelectedEmployee({ id: employeeId, name: employeeName })
    setSelectedItems(employeeRenewals.map(r => ({
      ...r,
      selected: true,
      quantity: r.quantity
    })))
    setShowRenewalModal(true)
  }

  const handleToggleItem = (itemId) => {
    setSelectedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, selected: !item.selected } : item
      )
    )
  }

  const handleSubmitRenewal = async () => {
    const itemsToRenew = selectedItems.filter(i => i.selected)

    if (itemsToRenew.length === 0) {
      notify.warning('Debe seleccionar al menos un item para renovar') // Use notify
      return
    }

    // Verificar stock disponible
    for (const item of itemsToRenew) {
      const itemData = items.find(i => i.id === item.item_id)
      if (!itemData) {
        notify.error(`Item ${item.item_name} no encontrado`) // Use notify
        return
      }
      if (itemData.stock_current < item.quantity) {
        notify.warning(`Stock insuficiente para ${item.item_name}. Disponible: ${itemData.stock_current}`) // Use notify
        return
      }
    }

    try {
      const renewalData = {
        station_id: station?.id,
        employee_id: selectedEmployee.id,
        delivered_by: user?.id,
        delivery_date: new Date().toISOString().split('T')[0],
        items: itemsToRenew.map(item => ({
          item_id: item.item_id,
          item_name: item.item_name,
          item_type: item.item_type,
          quantity: item.quantity,
          size: item.size || '',
          assignment_id: item.id
        })),
        notes: 'Renovación programada'
      }

      const delivery = await deliveryService.createRenewal(renewalData)
      setDeliveryId(delivery.id)
      setShowRenewalModal(false)
      notify.success('Renovación creada. Ahora debe proceder a firmar.')

      // Mostrar modal de firma (Wizard Start)
      setSigningStep(1)
      setResponsibleData({ name: '', position: '', employee_id: '' })
      setShowSignatureModal(true)

      await fetchRenewals()
      await fetchItems()
    } catch (error) {
      console.error('Error creating renewal:', error)
      notify.error(error.message || 'Error al crear la renovación') // Use notify
    }
  }

  // Wizard Step 1: Employee Signature
  const handleWizardNext = async (signatureData) => {
    try {
      await deliveryService.signEmployee(deliveryId, signatureData)
      notify.success('Firma de empleado guardada.')
      setSigningStep(2) // Move to next step
    } catch (error) {
      console.error('Error saving signature:', error)
      notify.error('Error al guardar la firma')
    }
  }

  // Wizard Step 2: Responsible Signature
  const handleWizardFinish = async (signatureData) => {
    if (!responsibleData.name || !responsibleData.position) {
      notify.warning('Por favor seleccione el responsable o complete los datos')
      return
    }

    try {
      await deliveryService.signResponsible(
        deliveryId,
        signatureData,
        responsibleData.name,
        responsibleData.position
      )
      notify.success('¡Renovación completada exitosamente!')

      setSigningStep(1)
      setResponsibleData({ name: '', position: '', employee_id: '' })
      setSelectedEmployee(null)
      setSelectedItems([])

      await fetchRenewals()
    } catch (error) {
      console.error('Error saving responsible signature:', error)
      notify.error('Error al guardar la firma del responsable')
    }
  }

  // --- EXCEL EXPORT PROFESSIONAL ---
  const handleExportExcel = async () => {
    try {
      if (employeeGroups.length === 0) {
        notify.warning('No hay datos para exportar')
        return
      }

      // Use the Centralized Report Service for Professional Formatting
      const blob = await reportService.generateRenewalsReport(
        employeeGroups,
        station.name,
        items // Pass inventory items for Stock lookup
      )

      const fileName = `Reporte_Reposicion_${station?.name || 'General'}_${new Date().toISOString().split('T')[0]}.xlsx`
      reportService.downloadBlob(blob, fileName)

      notify.success('Reporte de Compra exportado correctamente con formato profesional')
    } catch (error) {
      console.error('Error exporting excel:', error)
      notify.error('Error al exportar reporte: ' + error.message)
    }
  }

  const getRenewalStatusBadge = (diffDays) => {
    // Determinar status basado en diffDays
    let status = 'VIGENTE'
    if (diffDays < 0) {
      status = 'VENCIDO'
    } else if (diffDays <= 30) {
      status = 'POR_VENCER'
    }

    const styles = {
      VIGENTE: 'bg-green-100 text-green-800',
      POR_VENCER: 'bg-yellow-100 text-yellow-800',
      VENCIDO: 'bg-red-100 text-red-800'
    }

    const icons = {
      VIGENTE: <CheckCircle className="w-4 h-4" />,
      POR_VENCER: <Clock className="w-4 h-4" />,
      VENCIDO: <AlertTriangle className="w-4 h-4" />
    }

    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>
        {icons[status]}
        <span>{RENEWAL_STATUS_LABELS[status]}</span>
      </span>
    )
  }

  const getDaysOverdueText = (diffDays) => {
    if (diffDays === null) return '-'

    if (diffDays > 0) {
      return `Faltan ${diffDays} días`
    } else if (diffDays === 0) {
      return 'Vence hoy'
    } else {
      return `Vencido hace ${Math.abs(diffDays)} días`
    }
  }

  // Filtrado de renovaciones
  const filteredRenewals = renewals.filter((renewal) => {
    const matchesSearch =
      renewal.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      renewal.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      renewal.dni?.includes(searchTerm) ||
      renewal.item_name?.toLowerCase().includes(searchTerm.toLowerCase())

    // Calcular estado dinámico para filtro
    const diffDays = calculateDaysDiff(renewal.renewal_date)
    let calculatedStatus = 'VIGENTE'
    if (diffDays < 0) calculatedStatus = 'VENCIDO'
    else if (diffDays <= 30) calculatedStatus = 'POR_VENCER'

    const matchesStatus = filterStatus === 'ALL' || calculatedStatus === filterStatus

    return matchesSearch && matchesStatus
  })

  // Agrupar por empleado
  const groupedByEmployee = filteredRenewals.reduce((acc, renewal) => {
    const key = renewal.employee_id
    if (!acc[key]) {
      acc[key] = {
        employee_id: renewal.employee_id,
        employee_name: renewal.full_name,
        dni: renewal.dni,
        role_name: renewal.role_name,
        area: renewal.area,
        items: []
      }
    }
    acc[key].items.push(renewal)
    return acc
  }, {})

  const employeeGroups = Object.values(groupedByEmployee)

  // Recalcular stats basado en lógica cliente
  const getStatusFromDate = (date) => {
    const day = calculateDaysDiff(date)
    if (day < 0) return 'VENCIDO'
    if (day <= 30) return 'POR_VENCER'
    return 'VIGENTE'
  }

  const stats = {
    total: renewals.length,
    vencidos: renewals.filter(r => getStatusFromDate(r.renewal_date) === 'VENCIDO').length,
    porVencer: renewals.filter(r => getStatusFromDate(r.renewal_date) === 'POR_VENCER').length,
    vigentes: renewals.filter(r => getStatusFromDate(r.renewal_date) === 'VIGENTE').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando renovaciones...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Renovaciones Pendientes</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Control de EPPs y Uniformes que requieren renovación
            </p>
          </div>
          <button
            onClick={handleExportExcel}
            className="btn btn-secondary flex items-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Reposición</span>
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Vencidos</p>
                <p className="text-2xl font-bold text-red-600">{stats.vencidos}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Por Vencer</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.porVencer}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Empleados Afectados</p>
                <p className="text-2xl font-bold text-gray-900">{employeeGroups.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <User className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por empleado, DNI o item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input"
              >
                <option value="ALL">Todos los estados</option>
                <option value="VENCIDO">Vencidos</option>
                <option value="POR_VENCER">Por Vencer (30 días)</option>
                <option value="VIGENTE">Vigentes</option>
              </select>
            </div>
          </div>
        </div>

        {employeeGroups.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="bg-green-100 dark:bg-green-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">¡Todo al día!</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              No hay renovaciones pendientes en este momento. Todos los EPPs y uniformes están vigentes.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                <thead className="bg-gray-50/50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Empleado</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cargo / Área</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado de Items</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  <AnimatePresence>
                    {employeeGroups.map((group, index) => {
                      // Calculate summary stats for this employee
                      const expiredCount = group.items.filter(i => calculateDaysDiff(i.renewal_date) < 0).length
                      const expiringCount = group.items.filter(i => {
                        const d = calculateDaysDiff(i.renewal_date)
                        return d >= 0 && d <= 30
                      }).length

                      return (
                        <motion.tr
                          key={group.employee_id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
                                {group.employee_name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 dark:text-white text-sm">{group.employee_name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{group.dni || 'Sin DNI'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{group.role_name || '-'}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{group.area || '-'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {expiredCount > 0 && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800">
                                  <AlertTriangle size={12} className="mr-1" />
                                  {expiredCount} Vencidos
                                </span>
                              )}
                              {expiringCount > 0 && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800">
                                  <Clock size={12} className="mr-1" />
                                  {expiringCount} Por Vencer
                                </span>
                              )}
                              {expiredCount === 0 && expiringCount === 0 && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border border-green-200 dark:border-green-800">
                                  <CheckCircle size={12} className="mr-1" />
                                  OK
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleRenewEmployee(group.employee_id, group.employee_name)}
                              className="btn btn-secondary btn-sm inline-flex items-center gap-2 group"
                              title="Ver detalles y renovar"
                            >
                              <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500 text-primary-600" />
                              <span className="font-bold text-primary-700 dark:text-primary-400">Ver Detalles</span>
                            </button>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Renewal Modal - REDESIGNED PREMIUM MODERN UX */}
      <AnimatePresence>
        {showRenewalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-green-600" />
                    Renovar Items
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Empleado: <span className="font-bold text-gray-700 dark:text-gray-200">{selectedEmployee?.name}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowRenewalModal(false)
                    setSelectedEmployee(null)
                    setSelectedItems([])
                  }}
                  className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">

                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 flex gap-3 items-start mb-6">
                  <ClipboardList className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm">Selección de Items</h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Seleccione los elementos de la lista que desea renovar. Los items sin stock no pueden ser seleccionados.
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                        <tr>
                          <th className="px-5 py-3 text-left w-12">
                            <input
                              type="checkbox"
                              checked={selectedItems.length > 0 && selectedItems.every(i => i.selected || (items.find(st => st.id === i.item_id)?.stock_current < i.quantity))}
                              onChange={(e) => {
                                const checked = e.target.checked
                                setSelectedItems(prev => prev.map(item => {
                                  // Solo marcar si tiene stock
                                  const itemData = items.find(i => i.id === item.item_id)
                                  const hasStock = itemData && itemData.stock_current >= item.quantity
                                  return hasStock ? { ...item, selected: checked } : item
                                }))
                              }}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                            />
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Detalle del Item</th>
                          <th className="px-5 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado Actual</th>
                          <th className="px-5 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Disponibilidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {selectedItems.map((item) => {
                          const itemData = items.find(i => i.id === item.item_id)
                          const hasStock = itemData && itemData.stock_current >= item.quantity
                          const diffDays = calculateDaysDiff(item.renewal_date)

                          return (
                            <motion.tr
                              key={item.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className={`group transition-colors ${!hasStock ? 'bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
                            >
                              <td className="px-5 py-4">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() => handleToggleItem(item.id)}
                                  disabled={!hasStock}
                                  className={`rounded border-gray-300 text-primary-600 focus:ring-primary-500 ${!hasStock ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                />
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex flex-col">
                                  <span className={`font-bold text-sm ${!hasStock ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                    {item.item_name}
                                  </span>
                                  <span className="text-xs text-gray-400 mt-0.5">
                                    Cant: {item.quantity} • {item.item_type}
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  {getRenewalStatusBadge(diffDays)}
                                  <span className="text-[10px] text-gray-400">
                                    Vence: {new Date(item.renewal_date).toLocaleDateString()}
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-center">
                                {hasStock ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                    Stock: {itemData.stock_current}
                                  </span>
                                ) : (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                      Sin Stock
                                    </span>
                                    {/* Quick Add Stock */}
                                    <button
                                      onClick={(e) => handleOpenStockModal(e, item.item_id)}
                                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
                                    >
                                      <Plus size={10} /> AGREGAR
                                    </button>
                                  </div>
                                )}
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 z-10">
                <button
                  onClick={() => {
                    setShowRenewalModal(false)
                    setSelectedEmployee(null)
                    setSelectedItems([])
                  }}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitRenewal}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-blue-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <Sparkles size={18} className="animate-pulse" />
                  Generar Renovación
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Signature Wizard Modal (Unified Steps) */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowSignatureModal(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">

                {/* Wizard Header */}
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {signingStep === 1 ? 'Firma del Receptor' : 'Firma del Responsable'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Paso {signingStep} de 2
                    </p>
                  </div>
                  <button onClick={() => setShowSignatureModal(false)} className="text-gray-400 hover:text-gray-500">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Progress Indicators */}
                <div className="flex items-center mb-8">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${signingStep >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'} font-bold text-sm`}>
                    1
                  </div>
                  <div className={`flex-1 h-1 mx-2 ${signingStep >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${signingStep >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'} font-bold text-sm`}>
                    2
                  </div>
                </div>

                {/* Step 1: Employee Signature */}
                {signingStep === 1 && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                      <p className="text-sm text-blue-800 font-medium">Receptor (Empleado):</p>
                      <p className="text-lg font-bold text-gray-900">{selectedEmployee?.name || 'Empleado'}</p>
                    </div>

                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <SignatureCanvas
                        onSave={handleWizardNext}
                        onCancel={() => setShowSignatureModal(false)}
                        title="Firma del Empleado"
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Responsible Signature */}
                {signingStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-4 mb-4">
                      <div>
                        <SearchableSelect
                          label="Nombre del Responsable *"
                          required
                          options={employees.map(emp => ({
                            value: emp.id,
                            label: emp.full_name,
                            subLabel: `DNI: ${emp.dni}`
                          }))}
                          value={responsibleData.employee_id}
                          onChange={(val) => {
                            const emp = employees.find(e => e.id === val)
                            if (emp) {
                              setResponsibleData({
                                ...responsibleData,
                                employee_id: val,
                                name: emp.full_name,
                                position: emp.role_name || emp.position || ''
                              })
                            } else {
                              // Allow custom value or just id? SearchableSelect returns value. 
                              // If not found in list but SearchableSelect allows custom input (it might not), we handle it.
                              // Assuming selection from list for now as per "Reusable names" request.
                              setResponsibleData({ ...responsibleData, employee_id: val })
                            }
                          }}
                          placeholder="Buscar responsable..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cargo *</label>
                        <input
                          type="text"
                          required
                          value={responsibleData.position}
                          onChange={(e) => setResponsibleData({ ...responsibleData, position: e.target.value })}
                          className="input w-full"
                          placeholder="Ej: Supervisor SST"
                        />
                      </div>
                    </div>

                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <SignatureCanvas
                        onSave={handleWizardFinish}
                        onCancel={() => setSigningStep(1)} // Go back
                        title="Firma del Responsable"
                      />
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}





      {/* Shared AddStockModal */}
      <AddStockModal
        show={showStockModal}
        onClose={() => setShowStockModal(false)}
        item={stockItem}
        onSuccess={handleStockSuccess}
        userId={user?.id}
      />
    </>
  )
}

export default RenewalsPage
