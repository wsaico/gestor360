import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { X, Save, Loader2, Package, Info, DollarSign, MapPin, FileText } from 'lucide-react'
import assetService from '@/services/assetService'
import organizationService from '@/services/organizationService'
import areaService from '@/services/areaService'
import employeeService from '@/services/employeeService'
import {
  ASSET_CATEGORIES,
  ASSET_CATEGORY_LABELS,
  ASSET_STATUS,
  ASSET_STATUS_LABELS,
  ASSET_CONDITIONS,
  ASSET_CONDITION_LABELS,
  ACQUISITION_METHODS,
  ACQUISITION_METHODS_LABELS
} from '@/utils/constants'
import assetConfigService from '@/services/assetConfigService'
import SearchableSelect from '@/components/common/SearchableSelect'
import { generateAssetCode } from '@/utils/helpers'

const TABS = {
  GENERAL: 'GENERAL',
  TECHNICAL: 'TECHNICAL',
  FINANCIAL: 'FINANCIAL',
  LOCATION: 'LOCATION',
  DOCUMENTS: 'DOCUMENTS'
}

const TABS_LABELS = {
  GENERAL: 'Información General',
  TECHNICAL: 'Especificaciones Técnicas',
  FINANCIAL: 'Información Financiera',
  LOCATION: 'Ubicación y Asignación',
  DOCUMENTS: 'Documentos'
}

const AssetFormModal = ({ isOpen, onClose, asset = null, onSuccess, stationId }) => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(TABS.GENERAL)
  const [loading, setLoading] = useState(false)
  const [organizations, setOrganizations] = useState([])
  const [areas, setAreas] = useState([])
  const [employees, setEmployees] = useState([])
  const [brands, setBrands] = useState([])
  const [models, setModels] = useState([]) // Models filtered by selected brand
  const [allModels, setAllModels] = useState([]) // All models
  const [errors, setErrors] = useState({})

  // Form state
  const [formData, setFormData] = useState({
    // General
    asset_code: '',
    inventory_code: '', // Código de inventario de la empresa (manual)
    asset_name: '',
    asset_category: '',
    subcategory: '',
    brand: '',
    model: '',
    description: '',
    status: ASSET_STATUS.DISPONIBLE,
    condition: ASSET_CONDITIONS.EXCELENTE,

    // Technical
    serial_number: '',
    imei: '',
    mac_address: '',
    ip_address: '',
    processor: '',
    ram: '',
    storage: '',
    operating_system: '',
    license_key: '',
    specifications: {},

    // Financial
    acquisition_method: '',
    acquisition_value: '',
    acquisition_date: '',
    supplier: '',
    invoice_number: '',
    warranty_months: '',
    warranty_expiration: '',
    depreciation_rate: '',
    residual_value: '',
    current_value: '',

    // Location
    station_id: stationId,
    area_id: '',
    organization_id: '',
    location: '',
    responsible_employee_id: '',

    // Documents
    purchase_order: '',
    invoice_document: '',
    warranty_document: '',
    manual_url: '',
    photo_url: '',
    notes: ''
  })

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      loadOrganizations()
      loadAreas()
      loadEmployees()
      loadBrands()
      loadModels()

      if (asset) {
        // Edit mode
        setFormData({
          ...asset,
          asset_code: asset.asset_code || '',
          inventory_code: asset.inventory_code || '',
          asset_name: asset.asset_name || '',
          asset_category: asset.asset_category || '',
          subcategory: asset.asset_subcategory || '', // Map backend to frontend
          brand: asset.brand || '',
          model: asset.model || '',
          description: asset.description || '',
          status: asset.status || ASSET_STATUS.DISPONIBLE,
          condition: asset.condition || ASSET_CONDITIONS.EXCELENTE,

          // Technical
          serial_number: asset.serial_number || '',
          imei: asset.imei || '',
          mac_address: asset.mac_address || '',
          ip_address: asset.ip_address || '',

          // Packed specs
          processor: asset.specifications?.processor || '',
          ram: asset.specifications?.ram || '',
          storage: asset.specifications?.storage || '',
          operating_system: asset.specifications?.operating_system || '',
          license_key: asset.specifications?.license_key || '',
          specifications: asset.specifications || {},

          // Financial
          acquisition_method: asset.acquisition_method || '',
          acquisition_value: asset.acquisition_value || '',
          acquisition_date: asset.acquisition_date || '',
          supplier: asset.supplier || '',
          invoice_number: asset.invoice_number || '',
          warranty_months: asset.warranty_months || '',
          warranty_expiration: asset.warranty_expiry_date || '', // Map backend to frontend
          depreciation_rate: asset.depreciation_rate || '',
          residual_value: asset.residual_value || '',
          current_value: asset.current_value || '',

          // Location
          station_id: asset.station_id || stationId || '',
          area_id: asset.area_id || '',
          organization_id: asset.organization_id || '',
          location: asset.location_detail || '', // Map backend to frontend
          responsible_employee_id: asset.assigned_to_employee_id || '', // Map backend to frontend

          // Documents
          purchase_order: asset.purchase_order || '',
          invoice_document: asset.invoice_document || '',
          warranty_document: asset.warranty_document || '',
          manual_url: asset.manual_url || '',
          photo_url: asset.photo_url || '',
          notes: asset.notes || ''
        })
      } else {
        // Create mode - generate asset code
        if (formData.asset_category) {
          generateCode()
        }
      }
    }
  }, [isOpen, asset])

  // Generate asset code when category changes
  useEffect(() => {
    if (!asset && formData.asset_category) {
      generateCode()
    }
  }, [formData.asset_category])

  const loadOrganizations = async () => {
    try {
      const data = await organizationService.getAll(true)
      setOrganizations(data)
    } catch (error) {
      console.error('Error loading organizations:', error)
    }
  }

  const loadAreas = async () => {
    try {
      const data = await areaService.getAll(stationId, true) // Solo áreas activas
      setAreas(data || [])
    } catch (error) {
      console.error('Error loading areas:', error)
      setAreas([])
    }
  }

  const loadEmployees = async () => {
    try {
      // Reutilizamos el servicio existente con filtro por estación y solo activos
      const data = await employeeService.getAll(stationId, { activeOnly: true })
      setEmployees(data || [])
    } catch (error) {
      console.error('Error loading employees:', error)
      setEmployees([])
    }
  }

  const loadBrands = async () => {
    try {
      const data = await assetConfigService.getBrands()
      setBrands(data || [])
    } catch (error) {
      console.error('Error loading brands:', error)
    }
  }

  const loadModels = async () => {
    try {
      const data = await assetConfigService.getModels()
      setAllModels(data || [])
      setModels(data || [])
    } catch (error) {
      console.error('Error loading models:', error)
    }
  }

  const generateCode = async () => {
    try {
      const prefix = stationCode || 'UNK' // Fallback if no code
      const code = await generateAssetCode(prefix, formData.asset_category, 1)
      setFormData(prev => ({ ...prev, asset_code: code }))
    } catch (error) {
      console.error('Error generating code:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleSpecificationChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [key]: value
      }
    }))
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.asset_name) newErrors.asset_name = 'Nombre es requerido'
    if (!formData.asset_category) newErrors.asset_category = 'Categoría es requerida'
    if (!formData.asset_code) newErrors.asset_code = 'Código es requerido'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      setActiveTab(TABS.GENERAL) // Switch to general tab to show errors
      return
    }

    setLoading(true)

    try {
      if (asset) {
        await assetService.update(asset.id, formData, user.id)
      } else {
        await assetService.create(formData, user.id)
      }

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error saving asset:', error)
      alert(error.message || 'Error al guardar el activo')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {asset ? 'Editar Activo' : 'Nuevo Activo'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {asset ? `Código: ${asset.asset_code}` : 'Complete la información del activo'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-4 px-6" aria-label="Tabs">
            {Object.entries(TABS).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setActiveTab(value)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === value
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
                  }
                `}
              >
                {TABS_LABELS[key]}
              </button>
            ))}
          </nav>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* GENERAL TAB */}
            {activeTab === TABS.GENERAL && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Inventory Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Código de Inventario / Etiqueta
                    </label>
                    <input
                      type="text"
                      name="inventory_code"
                      value={formData.inventory_code}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.inventory_code ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Ej: PAT-2024-001 - Etiqueta Física"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Código físico, etiqueta patrimonial o código anterior.
                    </p>
                  </div>

                  {/* Asset Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nombre del Activo *
                    </label>
                    <input
                      type="text"
                      name="asset_name"
                      value={formData.asset_name}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.asset_name ? 'border-red-500' : ''
                        }`}
                      placeholder="Ej: Laptop HP EliteBook 840"
                    />
                    {errors.asset_name && (
                      <p className="text-red-500 text-xs mt-1">{errors.asset_name}</p>
                    )}
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Categoría *
                    </label>
                    <select
                      name="asset_category"
                      value={formData.asset_category}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.asset_category ? 'border-red-500' : ''
                        }`}
                    >
                      <option value="">Seleccione...</option>
                      {Object.entries(ASSET_CATEGORIES).map(([key, value]) => (
                        <option key={key} value={value}>
                          {ASSET_CATEGORY_LABELS[key]}
                        </option>
                      ))}
                    </select>
                    {errors.asset_category && (
                      <p className="text-red-500 text-xs mt-1">{errors.asset_category}</p>
                    )}
                  </div>

                  {/* Subcategory */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Subcategoría
                    </label>
                    <input
                      type="text"
                      name="subcategory"
                      value={formData.subcategory}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Ej: Computadora Portátil"
                    />
                  </div>

                  {/* Brand */}
                  {/* Brand */}
                  <div>
                    <div className="mb-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Marca
                      </label>
                    </div>
                    {/* Smart Select for Brand */}
                    <div className="relative">
                      <input
                        list="brands-list"
                        type="text"
                        name="brand"
                        value={formData.brand}
                        onChange={(e) => {
                          handleChange(e)
                          // Filter models when brand changes (simple approximation)
                          const brandName = e.target.value
                          const brandObj = brands.find(b => b.name === brandName)
                          if (brandObj) {
                            const filtered = allModels.filter(m => m.brand_id === brandObj.id)
                            setModels(filtered)
                          } else {
                            setModels(allModels)
                          }
                        }}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Escribe o selecciona..."
                        autoComplete="off"
                      />
                      <datalist id="brands-list">
                        {brands.map(b => (
                          <option key={b.id} value={b.name} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Model */}
                  <div>
                    <div className="mb-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Modelo
                      </label>
                    </div>
                    {/* Smart Select for Model */}
                    <div className="relative">
                      <input
                        list="models-list"
                        type="text"
                        name="model"
                        value={formData.model}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Escribe o selecciona..."
                        autoComplete="off"
                      />
                      <datalist id="models-list">
                        {models.map(m => (
                          <option key={m.id} value={m.name} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Estado
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      {Object.entries(ASSET_STATUS).map(([key, value]) => (
                        <option key={key} value={value}>
                          {ASSET_STATUS_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Condición
                    </label>
                    <select
                      name="condition"
                      value={formData.condition}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      {Object.entries(ASSET_CONDITIONS).map(([key, value]) => (
                        <option key={key} value={value}>
                          {ASSET_CONDITION_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Descripción detallada del activo..."
                  />
                </div>
              </div>
            )}

            {/* TECHNICAL TAB */}
            {activeTab === TABS.TECHNICAL && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Siempre mostrar Serie */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Número de Serie
                    </label>
                    <input
                      type="text"
                      name="serial_number"
                      value={formData.serial_number}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="S/N del fabricante"
                    />
                  </div>

                  {/* IMEI solo para Móviles */}
                  {formData.asset_category === ASSET_CATEGORIES.EQUIPOS_MOVILES && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        IMEI
                      </label>
                      <input
                        type="text"
                        name="imei"
                        value={formData.imei}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  )}

                  {/* Red solo para Cómputo, Móviles, Electrónica */}
                  {(formData.asset_category === ASSET_CATEGORIES.EQUIPOS_COMPUTO ||
                    formData.asset_category === ASSET_CATEGORIES.EQUIPOS_MOVILES ||
                    formData.asset_category === ASSET_CATEGORIES.ELECTRONICA) && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Dirección MAC
                          </label>
                          <input
                            type="text"
                            name="mac_address"
                            value={formData.mac_address}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="XX:XX:XX:XX:XX:XX"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Dirección IP
                          </label>
                          <input
                            type="text"
                            name="ip_address"
                            value={formData.ip_address}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="0.0.0.0"
                          />
                        </div>
                      </>
                    )}

                  {/* Hardware solo para Cómputo */}
                  {formData.asset_category === ASSET_CATEGORIES.EQUIPOS_COMPUTO && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Procesador
                        </label>
                        <input
                          type="text"
                          name="processor"
                          value={formData.processor}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="Ej: Intel Core i7-1165G7"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          RAM
                        </label>
                        <input
                          type="text"
                          name="ram"
                          value={formData.ram}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="Ej: 16GB DDR4"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Almacenamiento
                        </label>
                        <input
                          type="text"
                          name="storage"
                          value={formData.storage}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="Ej: 512GB SSD NVMe"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Sistema Operativo
                        </label>
                        <input
                          type="text"
                          name="operating_system"
                          value={formData.operating_system}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="Ej: Windows 11 Pro"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Clave de Licencia
                        </label>
                        <input
                          type="text"
                          name="license_key"
                          value={formData.license_key}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* FINANCIAL TAB */}
            {activeTab === TABS.FINANCIAL && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Método de Adquisición
                    </label>
                    <select
                      name="acquisition_method"
                      value={formData.acquisition_method}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">Seleccione...</option>
                      {Object.entries(ACQUISITION_METHODS).map(([key, value]) => (
                        <option key={key} value={value}>
                          {ACQUISITION_METHODS_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Valor de Adquisición
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="acquisition_value"
                      value={formData.acquisition_value}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Fecha de Adquisición
                    </label>
                    <input
                      type="date"
                      name="acquisition_date"
                      value={formData.acquisition_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Proveedor
                    </label>
                    <input
                      type="text"
                      name="supplier"
                      value={formData.supplier}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Número de Factura
                    </label>
                    <input
                      type="text"
                      name="invoice_number"
                      value={formData.invoice_number}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Meses de Garantía
                    </label>
                    <input
                      type="number"
                      name="warranty_months"
                      value={formData.warranty_months}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Vencimiento de Garantía
                    </label>
                    <input
                      type="date"
                      name="warranty_expiration"
                      value={formData.warranty_expiration}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tasa de Depreciación (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="depreciation_rate"
                      value={formData.depreciation_rate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="10.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Valor Residual
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="residual_value"
                      value={formData.residual_value}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Valor Actual
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="current_value"
                      value={formData.current_value}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* LOCATION TAB */}
            {activeTab === TABS.LOCATION && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Área
                    </label>
                    <select
                      name="area_id"
                      value={formData.area_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">Seleccione...</option>
                      {areas.map(area => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Organización
                    </label>
                    <select
                      name="organization_id"
                      value={formData.organization_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">Ninguna</option>
                      {organizations.map(org => (
                        <option key={org.id} value={org.id}>
                          {org.name} ({org.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Empleado Responsable
                    </label>
                    <select
                      name="responsible_employee_id"
                      value={formData.responsible_employee_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">No asignado / Dejar en pool</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name} ({emp.dni}) - {emp.role_name || 'Sin cargo'}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      * El activo se asignará a este empleado (generará historial de movimiento)
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ubicación Física
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Ej: Oficina 201, Piso 2"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DOCUMENTS TAB */}
            {activeTab === TABS.DOCUMENTS && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL de Orden de Compra
                    </label>
                    <input
                      type="url"
                      name="purchase_order"
                      value={formData.purchase_order}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL de Factura
                    </label>
                    <input
                      type="url"
                      name="invoice_document"
                      value={formData.invoice_document}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL de Garantía
                    </label>
                    <input
                      type="url"
                      name="warranty_document"
                      value={formData.warranty_document}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL de Manual
                    </label>
                    <input
                      type="url"
                      name="manual_url"
                      value={formData.manual_url}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL de Foto
                    </label>
                    <input
                      type="url"
                      name="photo_url"
                      value={formData.photo_url}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notas Adicionales
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Notas adicionales sobre el activo..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{asset ? 'Actualizar' : 'Crear'} Activo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AssetFormModal
