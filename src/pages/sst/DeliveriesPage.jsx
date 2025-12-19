import { useState, useEffect } from 'react'
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
  Filter
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
    if (station?.id) {
      fetchData(1) // Load page 1 on mount/station change
      fetchSettings()
    }
  }, [station?.id])

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
    if (station?.id) {
      fetchData(page)
    }
  }, [page])

  const fetchData = async (currentPage = 1) => {
    if (!station?.id) return

    try {
      setLoading(true)

      // Load Deliveries Paginated
      const { data: deliveriesData, count } = await deliveryService.getPaginated(station.id, {
        page: currentPage,
        limit: ITEMS_PER_PAGE
      })

      // Load other resources (cached or full list for dropdowns)
      // Note: Employee list is full for dropdowns, filtered by Active
      const [employeesData, itemsData, areasData] = await Promise.all([
        employeeService.getAll(station.id, { activeOnly: true }),
        eppInventoryService.getAll(station.id),
        areaService.getAll(station.id, true)
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

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de eliminar esta entrega?')) return

    try {
      const reason = prompt('Ingrese el motivo de la cancelación:')
      if (!reason) return

      await deliveryService.cancel(id, reason)
      await fetchData()
      notify.success('Entrega cancelada correctamente')
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
                    <td className="gestor-td whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {delivery.items?.length || 0} items
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
                              onClick={() => handleDelete(delivery.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Cancelar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {delivery.status === 'SIGNED' && (
                          <button
                            onClick={() => handleViewPDF(delivery)}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 transition-colors"
                            title="Descargar PDF"
                          >
                            <FileText className="w-4 h-4" />
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

      {showModal && (
        <div className="gestor-modal-backdrop">
          <div className="gestor-modal-content max-w-4xl">
            <div className="gestor-modal-header">
              <h3 className="gestor-modal-title">Nueva Entrega</h3>
              <button type="button" onClick={handleCloseModal} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="gestor-modal-body overflow-y-auto max-h-[calc(90vh-140px)]">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <SearchableSelect
                      label="Empleado"
                      required
                      options={employeeOptions}
                      value={formData.employee_id}
                      onChange={(val) => setFormData({ ...formData, employee_id: val })}
                      placeholder="Buscar empleado por nombre o DNI..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Entrega *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.delivery_date}
                      onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Motivo de Entrega *
                    </label>
                    <select
                      required
                      value={formData.delivery_reason}
                      onChange={(e) => setFormData({ ...formData, delivery_reason: e.target.value })}
                      className="input w-full"
                    >
                      {Object.entries(DELIVERY_REASON_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Observaciones
                    </label>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="input w-full"
                      placeholder="Observaciones generales..."
                    />
                  </div>
                </div>

                <hr className="my-6" />

                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium text-gray-900">Agregar Items</h4>
                  {valuationEnabled && (
                    <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 flex items-center shadow-sm">
                      <span className="text-xs text-blue-600 font-medium mr-2 uppercase tracking-wide">Valor Total:</span>
                      <span className="text-xl font-bold text-blue-800">
                        {currencySymbol} {totalCost.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4 items-end">

                  {/* Item Picker Input (Trigger) */}
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item
                    </label>
                    <div
                      className="input flex items-center justify-between cursor-pointer w-full bg-white hover:bg-gray-50 min-h-[42px]"
                      onClick={() => setShowItemPicker(true)}
                    >
                      <span className={`truncate ${currentItem.item_id ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                        {currentItem.item_id
                          ? `${currentItem.item_name} ${currentItem.size ? `(${currentItem.size})` : ''}`
                          : 'Seleccionar producto del inventario...'}
                      </span>
                      <Search className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                    </div>

                    {/* Visual Alert for Out of Stock */}
                    {isOutOfStock && (
                      <div className="mt-1 text-xs text-red-600 flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Sin stock disponible
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Cantidad
                      </label>
                      {/* Quick Add Stock Button */}
                      {currentItem.item_id && (
                        <button
                          type="button"
                          onClick={handleOpenStockModal}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center"
                          title="Ingresar stock para este item"
                        >
                          <Plus className="w-3 h-3 mr-0.5" />
                          Stock
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) })}
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Talla
                    </label>
                    <input
                      type="text"
                      value={currentItem.size}
                      readOnly
                      className="input w-full bg-gray-50 cursor-not-allowed"
                      placeholder={currentItem.item_id ? 'Sin talla' : '-'}
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="btn btn-secondary btn-md w-full mb-0.5"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar
                    </button>
                  </div>
                </div>

                {formData.items.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tipo</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cantidad</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Talla</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Renovación</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {formData.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm">{item.item_name}</td>
                            <td className="px-4 py-2 text-sm">{item.item_type}</td>
                            <td className="px-4 py-2 text-sm">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm">{item.size || '-'}</td>
                            <td className="px-4 py-2 text-sm">
                              {new Date(item.fecha_renovacion).toLocaleDateString('es-PE')}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="gestor-modal-footer">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-secondary btn-md w-full sm:w-auto mt-3 sm:mt-0"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-md w-full sm:w-auto sm:mr-3 inline-flex items-center justify-center shadow-lg transform active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Crear Entrega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Stock Modal */}
      <AddStockModal
        show={showStockModal}
        onClose={() => setShowStockModal(false)}
        item={stockItem}
        onSuccess={handleStockSuccess}
        userId={user?.id}
      />
    </div >
  )
}

export default DeliveriesPage
