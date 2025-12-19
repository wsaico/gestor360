import { useState, useEffect } from 'react'
import { useAuth } from '@contexts/AuthContext'
import { useNotification } from '@contexts/NotificationContext' // Added import
import supabase from '@services/supabase'
import deliveryService from '@services/deliveryService'
import eppInventoryService from '@services/eppInventoryService'
import employeeService from '@services/employeeService' // Added
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
  Plus
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
      const data = await employeeService.getAll(station.id, { activeOnly: true })
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

      setShowSignatureModal(false)
      // Reset State
      setDeliveryId(null)
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
        employee_name: `${renewal.first_name} ${renewal.last_name}`,
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Renovaciones Pendientes</h1>
            <p className="text-gray-600 mt-1">
              Control de EPPs y Uniformes que requieren renovación
            </p>
          </div>
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

        {/* Employee Groups */}
        {employeeGroups.length === 0 ? (
          <div className="card">
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay renovaciones pendientes</p>
              <p className="text-sm text-gray-400 mt-2">
                Todos los EPPs y uniformes están al día
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {employeeGroups.map((group) => (
              <div key={group.employee_id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-gray-100 rounded-lg">
                      <User className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {group.employee_name}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span>DNI: {group.dni}</span>
                        <span>•</span>
                        <span>{group.role_name}</span>
                        <span>•</span>
                        <span>{group.area}</span>
                      </div>
                      <div className="mt-2">
                        <span className="text-sm font-medium text-gray-700">
                          {group.items.length} item{group.items.length !== 1 ? 's' : ''} pendiente{group.items.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRenewEmployee(group.employee_id, group.employee_name)}
                    className="btn btn-primary btn-sm inline-flex items-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Renovar</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tipo</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cantidad</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha Entrega</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha Renovación</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {group.items.map((item) => {
                        // CALCULAR UNA SOLA VEZ
                        const diffDays = calculateDaysDiff(item.renewal_date)

                        return (
                          <tr key={item.id}>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              {item.item_name}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {item.item_type}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {new Date(item.delivery_date).toLocaleDateString('es-PE')}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className={diffDays < 0 ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                                  {new Date(item.renewal_date).toLocaleDateString('es-PE')}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {/* USAR EL MISMO VALOR CALCULADO */}
                                {getDaysOverdueText(diffDays)}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              {/* USAR EL MISMO VALOR CALCULADO */}
                              {getRenewalStatusBadge(diffDays)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Renewal Modal */}
      {showRenewalModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Renovar Items - {selectedEmployee?.name}
                  </h3>
                  <button
                    onClick={() => {
                      setShowRenewalModal(false)
                      setSelectedEmployee(null)
                      setSelectedItems([])
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Seleccione los items que desea renovar:
                </p>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">
                          <input
                            type="checkbox"
                            checked={selectedItems.every(i => i.selected)}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setSelectedItems(prev => prev.map(item => ({ ...item, selected: checked })))
                            }}
                            className="rounded border-gray-300"
                          />
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tipo</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cantidad</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estado</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedItems.map((item) => {
                        const itemData = items.find(i => i.id === item.item_id)
                        const hasStock = itemData && itemData.stock_current >= item.quantity
                        // Calcular estado dinámico
                        const diffDays = calculateDaysDiff(item.renewal_date)

                        return (
                          <tr key={item.id} className={!hasStock ? 'bg-red-50' : ''}>
                            <td className="px-4 py-2">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => handleToggleItem(item.id)}
                                disabled={!hasStock}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              {item.item_name}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {item.item_type}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-2">
                              {getRenewalStatusBadge(diffDays)}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {hasStock ? (
                                <span className="text-green-600">
                                  Disponible: {itemData.stock_current}
                                </span>
                              ) : (
                                <div className="flex flex-col items-start">
                                  <span className="text-red-600 font-semibold mb-1">
                                    Sin stock
                                  </span>
                                  {/* Add Stock Quick Button */}
                                  <button
                                    onClick={(e) => handleOpenStockModal(e, item.item_id)}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center"
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Agregar
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    onClick={() => {
                      setShowRenewalModal(false)
                      setSelectedEmployee(null)
                      setSelectedItems([])
                    }}
                    className="btn btn-secondary btn-md"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmitRenewal}
                    className="btn btn-primary btn-md inline-flex items-center"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Crear Renovación
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
