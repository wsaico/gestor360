import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@contexts/AuthContext'
import { useNotification } from '@contexts/NotificationContext'
import deliveryService from '@services/deliveryService'
import eppInventoryService from '@services/eppInventoryService'
import employeeService from '@services/employeeService'
import areaService from '@services/areaService'
import supabase from '@services/supabase'
import SignatureCanvas from '@components/SignatureCanvas'
import { generateDeliveryPDF } from '@utils/pdfGenerator'
import AddStockModal from '@components/sst/AddStockModal'
import SearchableSelect from '@components/common/SearchableSelect'
import ItemPickerModal from '@components/sst/ItemPickerModal'
import ConfirmDialog from '@components/ConfirmDialog'
import CancellationModal from '@components/common/CancellationModal'
import {
  Plus,
  Search,
  FileText,
  Eye,
  Trash2,
  X,
  Save,
  PenTool,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  Map,
  Filter,
  Sparkles,
  User,
  Calendar,
  ClipboardList,
  ChevronRight,
  ShoppingCart
} from 'lucide-react'
import {
  DELIVERY_STATUS,
  DELIVERY_STATUS_LABELS,
  DELIVERY_REASONS,
  DELIVERY_REASON_LABELS
} from '@utils/constants'

const DeliveriesPage = () => {
  const { station, user } = useAuth()
  const { notify } = useNotification()

  const [deliveries, setDeliveries] = useState([])
  const [employees, setEmployees] = useState([])
  const [items, setItems] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Settings State
  const [valuationEnabled, setValuationEnabled] = useState(false)
  const [currencySymbol, setCurrencySymbol] = useState('S/')
  const [totalCost, setTotalCost] = useState(0)

  // Pagination State
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const ITEMS_PER_PAGE = 10

  const [showModal, setShowModal] = useState(false)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [showResponsibleSignModal, setShowResponsibleSignModal] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [signatureType, setSignatureType] = useState(null)
  const [signingStep, setSigningStep] = useState(1)
  const [activeTab, setActiveTab] = useState('general') // 'general', 'items'

  const [selectedDeliveryDetails, setSelectedDeliveryDetails] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  // Custom Confirmation
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'danger'
  })

  // Cancellation Modal State
  const [showCancellationModal, setShowCancellationModal] = useState(false)
  const [deliveryToCancel, setDeliveryToCancel] = useState(null)

  // ... (previous state)

  // Wizard Handlers
  const handleWizardNext = async (signatureData) => {
    try {
      // Step 1: Employee Signature
      await deliveryService.signEmployee(selectedDelivery.id, signatureData)
      notify.success('Firma de empleado registrada. Proceda con la firma del responsable.')
      setSigningStep(2)
      // Refresh to ensure we have latest data if needed, though we continue flow
      await fetchData()
    } catch (error) {
      console.error('Error saving employee signature:', error)
      notify.error('Error al guardar firma de empleado')
    }
  }

  const handleWizardFinish = async (signatureData) => {
    if (!responsibleData.name || !responsibleData.position) {
      notify.warning('Complete los datos del responsable')
      return
    }

    try {
      // Step 2: Responsible Signature
      await deliveryService.signResponsible(
        selectedDelivery.id,
        signatureData,
        responsibleData.name,
        responsibleData.position
      )
      notify.success('¡Entrega firmada y completada exitosamente!')
      setShowSignatureModal(false)
      setSelectedDelivery(null)
      setSigningStep(1)
      setResponsibleData({ name: '', position: '', employee_id: '' })
      await fetchData()
    } catch (error) {
      console.error('Error saving responsible signature:', error)
      notify.error('Error al guardar firma de responsable')
    }
  }

  const handleStartSigning = (delivery) => {
    setSelectedDelivery(delivery)
    setSigningStep(1) // Always start at 1
    // Pre-fill responsible if it's the current logged in user (optional improvement)
    if (user?.id) {
      // logic to pre-fill could go here if we had employee mapping current user
    }
    setShowSignatureModal(true)
  }

  // Stock Modal State
  const [showStockModal, setShowStockModal] = useState(false)
  const [stockItem, setStockItem] = useState(null)

  // Item Picker State
  const [showItemPicker, setShowItemPicker] = useState(false)

  const [formData, setFormData] = useState({
    employee_id: '',
    delivery_date: new Date().toISOString().split('T')[0],
    delivery_reason: 'NUEVO_INGRESO',
    items: [],
    notes: ''
  })

  // currentItem includes item_name for display pre-submit
  const [currentItem, setCurrentItem] = useState({
    item_id: '',
    item_name: '',
    quantity: 1,
    size: '',
    motivo: '',
    observacion: ''
  })

  const [responsibleData, setResponsibleData] = useState({
    name: '',
    position: '',
    employee_id: ''
  })

  // Estadísticas (Client Side por ahora para los KPIs visibles)
  // Nota: Con paginación real, idealmente estos vendrían del backend
  const stats = {
    total: deliveries.length,
    pending: deliveries.filter(d => d.status === 'PENDING').length,
    signed: deliveries.filter(d => d.status === 'SIGNED').length,
    cancelled: deliveries.filter(d => d.status === 'CANCELLED').length
  }

  // Stock Modal Handlers
  const handleOpenStockModal = (e) => {
    e?.preventDefault()
    if (!currentItem.item_id) {
      notify.warning('Seleccione un item primero')
      return
    }
    const item = items.find(i => i.id === currentItem.item_id)
    if (item) {
      setStockItem(item)
      setShowStockModal(true)
    }
  }

  const handleStockSuccess = async () => {
    // Refresh items to get new stock
    const itemsData = await eppInventoryService.getAll(station.id)
    setItems(itemsData || [])
    notify.success('Stock actualizado correctamente')
  }

  useEffect(() => {
    // Trigger fetch if station changes OR if I am admin (and station might be null)
    if (station?.id || user?.role === 'ADMIN') {
      fetchData(1) // Load page 1 on mount/station change
      fetchSettings()
    }
  }, [station?.id, user?.role])

  const [appSettings, setAppSettings] = useState({})

  // ... (existing effects)

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('*')

      if (data) {
        // Convert to map for easy access
        const settingsMap = data.reduce((acc, curr) => {
          acc[curr.key] = curr.value
          return acc
        }, {})
        setAppSettings(settingsMap)

        // Legacy/Specific State Updates
        const isValuationEnabled = settingsMap['INVENTORY_VALORIZATION_ENABLED'] === true || String(settingsMap['INVENTORY_VALORIZATION_ENABLED']) === 'true'
        setValuationEnabled(isValuationEnabled)

        if (settingsMap['CURRENCY_SYMBOL']) {
          setCurrencySymbol(String(settingsMap['CURRENCY_SYMBOL']).replace(/['"]+/g, ''))
        }
      }
    } catch (err) {
      console.error('Error loading settings', err)
    }
  }

  // Calculate total cost whenever items change
  useEffect(() => {
    if (formData.items && formData.items.length > 0) {
      const total = formData.items.reduce((sum, item) => sum + ((item.unit_price || 0) * item.quantity), 0)
      setTotalCost(total)
    } else {
      setTotalCost(0)
    }
  }, [formData.items])

  // Effect to reload when page changes
  useEffect(() => {
    if (station?.id || user?.role === 'ADMIN') {
      fetchData(page)
    }
  }, [page])

  const fetchData = async (currentPage = 1) => {
    // Si no hay estación y NO es admin global, no cargar nada.
    if (!station?.id && user?.role !== 'ADMIN') return

    try {
      setLoading(true)
      const targetStationId = station?.id || null

      // Load Deliveries Paginated
      const { data: deliveriesData, count } = await deliveryService.getPaginated(targetStationId, {
        page: currentPage,
        limit: ITEMS_PER_PAGE
      })

      // Load other resources (cached or full list for dropdowns)
      const [employeesData, itemsData, areasData] = await Promise.all([
        employeeService.getAll(targetStationId, { activeOnly: true }, 1, 1000).then(res => res.data),
        eppInventoryService.getAll(targetStationId),
        areaService.getAll(targetStationId, true)
      ])

      setDeliveries(deliveriesData || [])
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE))
      setEmployees(employeesData || [])
      setItems(itemsData || [])
      setAreas(areasData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      notify.error('Error al cargar los datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = () => {
    if (!currentItem.item_id || !currentItem.quantity) {
      notify.warning('Por favor complete los datos del item')
      return
    }

    const item = items.find(i => i.id === currentItem.item_id)
    if (!item) {
      notify.error('Item no encontrado')
      return
    }

    // AREA RESTRICTION CHECK (Double Check)
    if (item.area_id && formData.employee_id) {
      const selectedEmp = employees.find(e => e.id === formData.employee_id)
      if (selectedEmp && selectedEmp.area_id && item.area_id !== selectedEmp.area_id) {
        const itemAreaName = areas.find(a => a.id === item.area_id)?.name || 'AREA ITEM'
        const empAreaName = areas.find(a => a.id === selectedEmp.area_id)?.name || 'AREA EMPLEADO'
        notify.error(`Restricción: Este ítem es exclusivo de "${itemAreaName}". El empleado pertenece al area de "${empAreaName}". considere elegir otro elemento que corresponde a su area`)
        return
      }
    }

    if (item.stock_current < currentItem.quantity) {
      notify.error(`Stock insuficiente. Disponible: ${item.stock_current}`)
      return
    }

    // Calcular fecha de renovación
    const deliveryDate = new Date(formData.delivery_date)
    const renewalDate = new Date(deliveryDate)
    renewalDate.setMonth(renewalDate.getMonth() + item.useful_life_months)

    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          ...currentItem,
          item_name: item.name,
          item_type: item.item_type,
          item_size: item.size,
          unit_price: Number(item.unit_price) || 0,
          fecha_renovacion: renewalDate.toISOString().split('T')[0]
        }
      ]
    })

    setCurrentItem({
      item_id: '',
      item_name: '',
      quantity: 1,
      size: '',
      motivo: formData.delivery_reason === 'RENOVACION' ? 'Renovación' : 'Nuevo Ingreso',
      observacion: ''
    })
  }

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (formData.items.length === 0) {
      notify.warning('Debe agregar al menos un item a la entrega')
      return
    }

    try {
      const deliveryData = {
        station_id: station?.id,
        employee_id: formData.employee_id,
        delivered_by: user?.id,
        delivery_date: formData.delivery_date,
        delivery_reason: formData.delivery_reason,
        notes: formData.notes,
        items: formData.items
      }

      await deliveryService.create(deliveryData)
      await fetchData()
      handleCloseModal()
      notify.success('Entrega creada correctamente. Ahora puede proceder a firmarla.')
    } catch (error) {
      console.error('Error creating delivery:', error)
      notify.error(error.message || 'Error al crear la entrega')
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setFormData({
      employee_id: '',
      delivery_date: new Date().toISOString().split('T')[0],
      delivery_reason: 'NUEVO_INGRESO',
      notes: '',
      items: []
    })
    setCurrentItem({
      item_id: '',
      item_name: '',
      quantity: 1,
      size: '',
      motivo: '',
      observacion: ''
    })
  }

  const handleSignEmployee = (delivery) => {
    setSelectedDelivery(delivery)
    setSignatureType('employee')
    setShowSignatureModal(true)
  }

  const handleSignResponsible = (delivery) => {
    setSelectedDelivery(delivery)
    setSignatureType('responsible')
    setShowResponsibleSignModal(true)
  }

  const handleSaveSignature = async (signatureData) => {
    try {
      if (signatureType === 'employee') {
        await deliveryService.signEmployee(selectedDelivery.id, signatureData)
        notify.success('Firma de empleado guardada correctamente')
      }
      setShowSignatureModal(false)
      setSelectedDelivery(null)
      setSignatureType(null)
      await fetchData()
    } catch (error) {
      console.error('Error saving signature:', error)
      notify.error('Error al guardar la firma')
    }
  }

  const handleSaveResponsibleSignature = async (signatureData) => {
    if (!responsibleData.name || !responsibleData.position) {
      notify.warning('Por favor ingrese el nombre y cargo del responsable')
      return
    }

    try {
      await deliveryService.signResponsible(
        selectedDelivery.id,
        signatureData,
        responsibleData.name,
        responsibleData.position
      )
      notify.success('Firma de responsable guardada correctamente. ¡Entrega completada!')
      setShowSignatureModal(false)
      setShowResponsibleSignModal(false)
      setSelectedDelivery(null)
      setSignatureType(null)
      setResponsibleData({ name: '', position: '', employee_id: '' })
      await fetchData()
    } catch (error) {
      console.error('Error saving responsible signature:', error)
      notify.error('Error al guardar la firma')
    }
  }

  const handleViewDetails = (delivery) => {
    setSelectedDeliveryDetails(delivery)
    setShowDetailsModal(true)
  }

  const handleDeleteItem = (deliveryId, item, index) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Item',
      message: `¿Estás seguro de eliminar el item "${item.item_name}"? Esta acción revertirá el stock al inventario.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await deliveryService.removeItem(deliveryId, item, index)
          notify.success('Item eliminado y stock restaurado correctamente')

          // Refresh main list
          await fetchData()

          // Refetch details for the modal to keep it open and updated
          try {
            const updatedDelivery = await deliveryService.getById(deliveryId)
            setSelectedDeliveryDetails(updatedDelivery)
          } catch (innerError) {
            console.warn('Could not refresh details, closing modal', innerError)
            setShowDetailsModal(false)
          }

          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        } catch (error) {
          console.error('Error deleting item:', error)
          notify.error('Error al eliminar el item')
        }
      }
    })
  }

  // Handle Initial Click on Trash Icon
  const handleDelete = (delivery) => {
    if (delivery.status === 'PENDING') {
      // Hard Delete for Pending
      setConfirmDialog({
        isOpen: true,
        title: 'Eliminar Entrega',
        message: '¿Está seguro de eliminar esta entrega por completo? El stock de todos los items será restaurado.',
        type: 'danger',
        onConfirm: async () => {
          try {
            await deliveryService.delete(delivery.id)
            notify.success('Entrega eliminada y stock restaurado')
            await fetchData()
            setConfirmDialog(prev => ({ ...prev, isOpen: false }))
          } catch (error) {
            console.error('Error deleting delivery:', error)
            notify.error('Error al eliminar entrega: ' + error.message)
          }
        }
      })
    } else {
      // Soft Cancel for Signed (requires reason)
      setDeliveryToCancel(delivery.id)
      setShowCancellationModal(true)
    }
  }

  const handleConfirmCancel = async (reason) => {
    try {
      await deliveryService.cancel(deliveryToCancel, reason)
      await fetchData()
      notify.success('Entrega cancelada correctamente')
      setShowCancellationModal(false)
      setDeliveryToCancel(null)
    } catch (error) {
      console.error('Error canceling delivery:', error)
      notify.error(error.message || 'Error al cancelar la entrega')
    }
  }

  const handleViewPDF = async (delivery) => {
    try {
      const fullDelivery = await deliveryService.getById(delivery.id)

      if (!fullDelivery) {
        notify.error('No se pudo cargar la información de la entrega')
        return
      }

      const employee = fullDelivery.employee || delivery.employee

      if (!employee) {
        notify.error('No se encontró información del empleado')
        return
      }

      // Prepare settings for PDF
      const pdfSettings = {
        ...appSettings,
        // Calculate dynamic count if needed (using current filtered state or total logic)
        calculated_employee_count: employees.length
      }

      generateDeliveryPDF(fullDelivery, employee, station?.name || 'Sin estación', pdfSettings)
    } catch (error) {
      console.error('Error generating PDF:', error)
      notify.error('Error al generar el PDF: ' + error.message)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50',
      SIGNED: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800/50',
      CANCELLED: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800/50'
    }

    const icons = {
      PENDING: <Clock className="w-3 h-3" />,
      SIGNED: <CheckCircle className="w-3 h-3" />,
      CANCELLED: <AlertCircle className="w-3 h-3" />
    }

    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>
        {icons[status]}
        <span>{DELIVERY_STATUS_LABELS[status]}</span>
      </span>
    )
  }

  const filteredDeliveries = deliveries.filter((delivery) => {
    const employee = delivery.employee
    const searchLower = searchTerm.toLowerCase()
    return (
      employee?.full_name?.toLowerCase().includes(searchLower) ||
      employee?.dni?.includes(searchLower) ||
      delivery.document_code?.toLowerCase().includes(searchLower)
    )
  })

  // Derived state for modal options
  const employeeOptions = employees.map(emp => ({
    value: emp.id,
    label: emp.full_name,
    subLabel: `DNI: ${emp.dni}`
  }))

  const selectedItemObj = items.find(i => i.id === currentItem.item_id)
  const isOutOfStock = selectedItemObj && selectedItemObj.stock_current <= 0

  const handleSelectItem = (item) => {
    // AREA RESTRICTION LOGIC
    if (item.area_id && formData.employee_id) {
      const selectedEmp = employees.find(e => e.id === formData.employee_id)

      // If employee exists and has an area, and item has an area, and they don't match
      if (selectedEmp && selectedEmp.area_id && item.area_id !== selectedEmp.area_id) {
        const itemAreaName = areas.find(a => a.id === item.area_id)?.name || 'AREA ITEM'
        const empAreaName = areas.find(a => a.id === selectedEmp.area_id)?.name || 'AREA EMPLEADO'

        // Notify and BLOCK selection with User's Specific Message
        notify.error(`Restricción: Este ítem es exclusivo de "${itemAreaName}". El empleado pertenece al area de "${empAreaName}". considere elegir otro elemento que corresponde a su area`)
        return
      }
    }

    setCurrentItem({
      ...currentItem,
      item_id: item.id,
      item_name: item.name,
      size: item.size || ''
    })
    setShowItemPicker(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando entregas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Entregas de EPPs</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestión de entregas con firma digital
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary btn-md mt-4 sm:mt-0 inline-flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Entrega</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Entregas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Firmadas</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.signed}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Canceladas</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.cancelled}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por empleado, DNI o código de documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="gestor-table-container">
        <div className="overflow-x-auto">
          <table className="gestor-table">
            <thead className="gestor-thead">
              <tr>
                <th className="gestor-th">Código</th>
                <th className="gestor-th">Empleado</th>
                <th className="gestor-th">Fecha</th>
                <th className="gestor-th">Motivo</th>
                <th className="gestor-th">Items</th>
                <th className="gestor-th">Estado</th>
                <th className="gestor-th">Acciones</th>
              </tr>
            </thead>
            <tbody className="gestor-tbody uppercase text-[10px] tracking-wider">
              {filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="gestor-td text-center py-12 text-gray-500 dark:text-gray-400">
                    No se encontraron entregas
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <tr key={delivery.id} className="gestor-tr-hover">
                    <td className="gestor-td">
                      <div className="text-sm font-mono text-gray-900 dark:text-white">
                        {delivery.document_code}
                      </div>
                    </td>
                    <td className="gestor-td">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {delivery.employee?.full_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        DNI: {delivery.employee?.dni}
                      </div>
                    </td>
                    <td className="gestor-td whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-200">
                        {new Date(delivery.delivery_date).toLocaleDateString('es-PE')}
                      </div>
                    </td>
                    <td className="gestor-td whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-200">
                        {DELIVERY_REASON_LABELS[delivery.delivery_reason] || delivery.delivery_reason}
                      </div>
                    </td>
                    <td className="gestor-td">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-gray-900 dark:text-white text-sm">{delivery.items?.length || 0} items</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">Entregados</span>
                      </div>
                    </td>
                    <td className="gestor-td whitespace-nowrap">
                      {getStatusBadge(delivery.status)}
                    </td>
                    <td className="gestor-td whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {delivery.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleStartSigning(delivery)}
                              className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                              title="Firmar Entrega"
                            >
                              <PenTool className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(delivery)}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {delivery.status === 'SIGNED' && (
                          <>
                            <button
                              onClick={() => handleViewPDF(delivery)}
                              className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 transition-colors"
                              title="Descargar PDF"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(delivery)}
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              title="Anular Entrega"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleViewDetails(delivery)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          title="Ver Detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sm:px-6 rounded-b-lg">
          <div className="flex justify-between flex-1 sm:hidden">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-secondary btn-sm"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-secondary btn-sm ml-3"
            >
              Siguiente
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Página <span className="font-medium">{page}</span> de <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <span className="sr-only">Anterior</span>
                  Anterior
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <span className="sr-only">Siguiente</span>
                  Siguiente
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit/Create - REDESIGNED PREMIUM MODERN UX */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Package className="w-6 h-6 text-primary-600" />
                    Nueva Entrega
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Registre la salida de materiales y solicite firmas digitales.
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-6 pt-4 flex gap-6 border-b border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${activeTab === 'general' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <User size={16} />
                  Información y Contexto
                  {activeTab === 'general' && <motion.div layoutId="tab-underline-del" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />}
                </button>
                <button
                  onClick={() => setActiveTab('items')}
                  className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${activeTab === 'items' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <ShoppingCart size={16} />
                  Items y Carrito
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${formData.items.length > 0 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
                    {formData.items.length}
                  </span>
                  {activeTab === 'items' && <motion.div layoutId="tab-underline-del" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">

                  {/* TAB 1: GENERAL INFO */}
                  {activeTab === 'general' && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }} className="space-y-6">

                      <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                        <h4 className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold mb-4">
                          <User className="w-5 h-5" /> Datos del Receptor
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2">
                            <SearchableSelect
                              label="Seleccionar Empleado *"
                              required
                              options={employeeOptions}
                              value={formData.employee_id}
                              onChange={(val) => setFormData({ ...formData, employee_id: val })}
                              placeholder="Escribe para buscar por nombre o DNI..."
                            />
                            <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">El empleado recibirá una notificación para firmar.</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <h4 className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-bold mb-4">
                          <ClipboardList className="w-5 h-5" /> Contexto de la Entrega
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                              <Calendar size={14} className="text-gray-400" /> Fecha
                            </label>
                            <input
                              type="date"
                              required
                              value={formData.delivery_date}
                              onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Motivo</label>
                            <div className="relative">
                              <select
                                required
                                value={formData.delivery_reason}
                                onChange={(e) => setFormData({ ...formData, delivery_reason: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all appearance-none dark:text-white"
                              >
                                {Object.entries(DELIVERY_REASON_LABELS).map(([key, label]) => (
                                  <option key={key} value={key}>{label}</option>
                                ))}
                              </select>
                              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notas / Observaciones</label>
                            <textarea
                              rows={2}
                              value={formData.notes}
                              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all resize-none dark:text-white"
                              placeholder="Detalles opcionales sobre esta entrega..."
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-4">
                        <button
                          type="button"
                          onClick={() => setActiveTab('items')}
                          className="btn btn-primary btn-md px-6 flex items-center gap-2"
                        >
                          Siguiente: Agregar Items <ChevronRight size={16} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: ITEMS & CART */}
                  {activeTab === 'items' && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }} className="space-y-6">

                      {/* Summary Card */}
                      {valuationEnabled && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 flex justify-between items-center shadow-sm">
                          <div>
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Costo Total Estimado</p>
                            <p className="text-sm text-blue-600/70 dark:text-blue-400/70">Calculado en base a precios unitarios</p>
                          </div>
                          <div className="text-3xl font-black text-blue-700 dark:text-blue-300 tracking-tight">
                            {currencySymbol} {totalCost.toFixed(2)}
                          </div>
                        </div>
                      )}

                      {/* Add Item Form */}
                      <div className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
                        <h5 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <Plus className="w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded-full p-0.5" /> Agregar Producto
                        </h5>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                          <div className="md:col-span-6 relative">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">Buscar Item</label>
                            <button
                              type="button"
                              onClick={() => setShowItemPicker(true)}
                              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-primary-400 transition-colors group text-left"
                            >
                              {currentItem.item_id ? (
                                <div className="flex flex-col">
                                  <span className="font-bold text-gray-900 dark:text-white text-sm">{currentItem.item_name}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">{currentItem.size ? `Talla: ${currentItem.size}` : 'Sin talla'}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500 text-sm italic">Seleccione un item del stock...</span>
                              )}
                              <Search size={18} className="text-gray-400 group-hover:text-primary-500 transition-colors" />
                            </button>
                            {isOutOfStock && <span className="text-xs text-red-500 font-bold absolute -bottom-5 left-0 flex items-center gap-1"><AlertCircle size={10} /> Sin Stock</span>}
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">Cant.</label>
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                value={currentItem.quantity}
                                onChange={e => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) })}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-center font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20"
                              />
                              {currentItem.item_id && (
                                <button type="button" onClick={handleOpenStockModal} className="absolute -right-1 -top-6 text-[10px] text-blue-500 hover:underline flex items-center">
                                  + Stock
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="md:col-span-4">
                            <button
                              type="button"
                              onClick={handleAddItem}
                              disabled={!currentItem.item_id}
                              className="w-full py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                            >
                              <Plus size={18} /> Agregar a Lista
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                        {formData.items.length === 0 ? (
                          <div className="p-8 text-center flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-700 m-4 rounded-xl">
                            <ShoppingCart size={40} className="mb-2 text-gray-200 dark:text-gray-700" />
                            <p className="text-sm">La lista de entregas está vacía.</p>
                            <p className="text-xs mt-1">Busca items arriba para comenzar.</p>
                          </div>
                        ) : (
                          <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                              <tr>
                                <th className="px-5 py-3 text-left">Item</th>
                                <th className="px-5 py-3 text-center">Tipo</th>
                                <th className="px-5 py-3 text-center">Cant.</th>
                                <th className="px-5 py-3 text-center">Talla</th>
                                <th className="px-5 py-3 text-right">Acción</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                              {formData.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                  <td className="px-5 py-3">
                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{item.item_name}</p>
                                    <p className="text-xs text-gray-400">Renov: {new Date(item.fecha_renovacion).toLocaleDateString()}</p>
                                  </td>
                                  <td className="px-5 py-3 text-center text-xs text-gray-500 dark:text-gray-400">{item.item_type}</td>
                                  <td className="px-5 py-3 text-center font-mono font-bold text-gray-900 dark:text-white">{item.quantity}</td>
                                  <td className="px-5 py-3 text-center text-xs text-gray-500">{item.size || '-'}</td>
                                  <td className="px-5 py-3 text-right">
                                    <button
                                      onClick={() => handleRemoveItem(idx)}
                                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>

                    </motion.div>
                  )}

                </div>

                {/* Footer Fixed */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center z-10">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Listo para procesar</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={formData.items.length === 0 || !formData.employee_id}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-blue-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <Sparkles size={18} className="animate-pulse" />
                      Crear Entrega
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unified Signing Wizard Modal */}
      {showSignatureModal && selectedDelivery && (
        <div className="gestor-modal-backdrop">
          <div className="gestor-modal-content max-w-xl">
            <div className="gestor-modal-header">
              <div>
                <h3 className="gestor-modal-title">
                  {signingStep === 1 ? 'Firma del Receptor' : 'Firma del Responsable'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase font-bold tracking-wider">
                  Paso {signingStep} de 2
                </p>
              </div>
              <button onClick={() => setShowSignatureModal(false)} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="gestor-modal-body">
              {/* Progress Indicators */}
              <div className="flex items-center mb-8 px-4">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${signingStep >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'} font-bold text-sm shadow-sm`}>
                  1
                </div>
                <div className={`flex-1 h-1 mx-2 rounded-full ${signingStep >= 2 ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${signingStep >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'} font-bold text-sm shadow-sm`}>
                  2
                </div>
              </div>

              {/* Step Content */}
              {signingStep === 1 && (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 mb-4">
                    <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">Receptor (Empleado):</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedDelivery.employee?.full_name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">DNI: {selectedDelivery.employee?.dni}</p>
                  </div>

                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-50 border-dashed">
                    <SignatureCanvas
                      onSave={handleWizardNext}
                      onCancel={() => setShowSignatureModal(false)}
                      title="Firma del Empleado"
                    />
                  </div>
                  <p className="text-[10px] text-center text-gray-500 dark:text-gray-400 mt-2 italic px-4">
                    * Al firmar, el trabajador declara haber recibido los EPPs detallados conforme a ley y se compromete a su uso obligatorio y correcto mantenimiento.
                  </p>
                </div>
              )}

              {signingStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-4 mb-4">
                    <div>
                      <SearchableSelect
                        label="Nombre del Responsable *"
                        required
                        options={employeeOptions}
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
                            setResponsibleData({ ...responsibleData, employee_id: val })
                          }
                        }}
                        placeholder="Buscar responsable..."
                      />
                    </div>
                    <div>
                      <label className="label">Cargo *</label>
                      <input type="text" required value={responsibleData.position} onChange={(e) => setResponsibleData({ ...responsibleData, position: e.target.value })} className="input w-full" placeholder="Ej: Supervisor SST" />
                    </div>
                  </div>

                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-50 border-dashed">
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
      )}

      {/* Item Picker Modal */}
      <ItemPickerModal
        show={showItemPicker}
        onClose={() => setShowItemPicker(false)}
        items={items}
        areas={areas}
        onSelect={handleSelectItem}
      />

      {/* Delivery Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedDeliveryDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary-600" />
                    Detalle de Entrega: <span className="font-mono text-gray-600 dark:text-gray-400">{selectedDeliveryDetails.document_code}</span>
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Empleado: <span className="font-semibold text-gray-900 dark:text-gray-200">{selectedDeliveryDetails.employee?.full_name}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-gray-500">
                    Fecha: <span className="font-medium text-gray-900 dark:text-white">{new Date(selectedDeliveryDetails.delivery_date).toLocaleDateString()}</span>
                  </div>
                  {getStatusBadge(selectedDeliveryDetails.status)}
                </div>

                <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Items Entregados</h4>
                <div className="space-y-3">
                  {selectedDeliveryDetails.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm text-gray-600 dark:text-gray-300">
                          <Package size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-sm">{item.item_name}</p>
                          <p className="text-xs text-gray-500">
                            {item.item_type} • Talla: {item.size || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded-md text-sm font-bold shadow-sm border border-gray-100 dark:border-gray-700">
                          Qty: {item.quantity}
                        </span>

                        {/* Allow deletion only if PENDING */}
                        {selectedDeliveryDetails.status === 'PENDING' && (
                          <button
                            onClick={() => handleDeleteItem(selectedDeliveryDetails.id, item, idx)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
                            title="Eliminar item y restaurar stock"
                          >
                            <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800 md:flex justify-end border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="btn btn-secondary w-full md:w-auto"
                >
                  Cerrar
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Stock Modal */}
      <AddStockModal
        show={showStockModal}
        onClose={() => setShowStockModal(false)}
        item={stockItem}
        onSuccess={handleStockSuccess}
        userId={user?.id}
      />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        type={confirmDialog.type}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
      />


      <CancellationModal
        isOpen={showCancellationModal}
        onClose={() => {
          setShowCancellationModal(false)
          setDeliveryToCancel(null)
        }}
        onConfirm={handleConfirmCancel}
      />
    </div >
  )
}

export default DeliveriesPage
