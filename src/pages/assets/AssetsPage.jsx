import React, { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  Filter,
  Download,
  Grid3x3,
  List,
  Package,
  AlertCircle,
  RefreshCw,
  Edit,
  Eye,
  Trash2,
  UserPlus,
  ArrowRightLeft,
  Ban,
  Upload,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  User,
  MoreVertical
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useAuth } from '@/contexts/AuthContext'
import { useNotification } from '@/contexts/NotificationContext'
import assetService from '@/services/assetService'
import areaService from '@/services/areaService'
import organizationService from '@/services/organizationService'
import AssetCard from '@/components/assets/AssetCard'
import AssetStatusBadge from '@/components/assets/AssetStatusBadge'
import AssetConditionBadge from '@/components/assets/AssetConditionBadge'
import AssetFormModal from '@/components/assets/AssetFormModal'
import AssetAssignModal from '@/components/assets/AssetAssignModal'
import AssetTransferModal from '@/components/assets/AssetTransferModal'
import AssetDetailModal from '@/components/assets/AssetDetailModal'
import DecommissionModal from '@/components/assets/DecommissionModal'
import AssetsImportModal from '@/components/assets/AssetsImportModal'
import SearchableSelect from '@/components/common/SearchableSelect'
import {
  ASSET_CATEGORIES,
  ASSET_CATEGORY_LABELS,
  ASSET_STATUS,
  ASSET_STATUS_LABELS,
  ASSET_CONDITIONS,
  ASSET_CONDITION_LABELS,
  ASSET_VIEW_MODES
} from '@/utils/constants'
import { formatCurrency, formatDate, calculateTotalAssetValue } from '@/utils/helpers'

const AssetsPage = () => {
  const { station, user, getEffectiveStationId } = useAuth()
  const { notify } = useNotification()

  // Estado
  const [assets, setAssets] = useState([])
  const [areas, setAreas] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState(ASSET_VIEW_MODES.LIST)
  const [selectedStationId, setSelectedStationId] = useState(station?.id || '') // For Global Admin station selection

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterCondition, setFilterCondition] = useState('ALL')
  const [filterArea, setFilterArea] = useState('ALL')
  const [filterOrganization, setFilterOrganization] = useState('ALL')
  const [filterAssigned, setFilterAssigned] = useState('ALL')

  // Modales
  const [showFormModal, setShowFormModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDecommissionModal, setShowDecommissionModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingAsset, setEditingAsset] = useState(null)
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [showMobileFilters, setShowMobileFilters] = useState(false) // Mobile filters toggle

  // Cargar datos
  useEffect(() => {
    if (station?.id) {
      fetchData()
    }
  }, [station?.id])

  // Sync selectedStationId when station changes in header (Global Admin selects station)
  useEffect(() => {
    if (station?.id && station.id !== selectedStationId) {
      setSelectedStationId(station.id)
    }
  }, [station?.id])

  const fetchData = async () => {
    try {
      setLoading(true)
      const targetStationId = getEffectiveStationId(selectedStationId)
      const [assetsData, areasData, orgsData] = await Promise.all([
        assetService.getAll(targetStationId),
        areaService.getAll(targetStationId, true),
        organizationService.getAll(true)
      ])

      setAssets(assetsData || [])
      setAreas(areasData || [])
      setOrganizations(orgsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
      notify.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar activos
  const filteredAssets = assets.filter(asset => {
    const matchesSearch =
      asset.asset_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.imei?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = filterCategory === 'ALL' || asset.asset_category === filterCategory
    const matchesStatus = filterStatus === 'ALL' || asset.status === filterStatus
    const matchesCondition = filterCondition === 'ALL' || asset.condition === filterCondition
    const matchesArea = filterArea === 'ALL' || asset.area_id === filterArea
    const matchesOrganization = filterOrganization === 'ALL' || asset.organization_id === filterOrganization
    const matchesAssigned =
      filterAssigned === 'ALL' ||
      (filterAssigned === 'ASSIGNED' && asset.assigned_to_employee_id) ||
      (filterAssigned === 'AVAILABLE' && !asset.assigned_to_employee_id)

    return matchesSearch && matchesCategory && matchesStatus && matchesCondition &&
      matchesArea && matchesOrganization && matchesAssigned
  })

  // Estadísticas
  const stats = {
    total: filteredAssets.length,
    available: filteredAssets.filter(a => a.status === 'DISPONIBLE').length,
    in_use: filteredAssets.filter(a => a.status === 'EN_USO').length,
    maintenance: filteredAssets.filter(a => a.status === 'MANTENIMIENTO').length,
    total_value: calculateTotalAssetValue(filteredAssets)
  }

  // Handlers
  const handleCreate = () => {
    setEditingAsset(null)
    setShowFormModal(true)
  }

  const handleEdit = (asset) => {
    setEditingAsset(asset)
    setShowFormModal(true)
  }

  const handleView = (asset) => {
    setSelectedAsset(asset)
    setShowDetailModal(true)
  }

  const handleDelete = async (asset) => {
    if (!confirm(`¿Estás seguro de archivar el activo ${asset.asset_code}?`)) return

    try {
      await assetService.softDelete(asset.id, user.id)
      await fetchData()
      notify.success('Activo archivado correctamente')
    } catch (error) {
      notify.error(error.message)
    }
  }

  const handleDecommission = (asset) => {
    setSelectedAsset(asset)
    setShowDecommissionModal(true)
  }

  const handleConfirmDecommission = async (assetId, reason, notes) => {
    try {
      await assetService.decommission(assetId, reason, notes, user.id)
      fetchData()
      notify.success('Activo dado de baja correctamente')
    } catch (error) {
      notify.error(error.message)
    }
  }

  const handleAssign = (asset) => {
    setSelectedAsset(asset)
    setShowAssignModal(true)
  }

  const handleTransfer = (asset) => {
    setSelectedAsset(asset)
    setShowTransferModal(true)
  }

  const handleExport = () => {
    try {
      // Prepare data for export
      const dataToExport = filteredAssets.map(asset => {
        // Parse specs if string, or use as object if already object
        const specs = typeof asset.specifications === 'string'
          ? JSON.parse(asset.specifications || '{}')
          : (asset.specifications || {})

        return {
          'Código Activo': asset.asset_code,
          'Código Inventario': asset.inventory_code || '-',
          'Nombre': asset.asset_name,
          'Categoría': ASSET_CATEGORY_LABELS[asset.asset_category] || asset.asset_category,
          'Subcategoría': asset.asset_subcategory || '-',
          'Marca': asset.brand || '-',
          'Modelo': asset.model || '-',
          'Serie': asset.serial_number || '-',
          'Estado': ASSET_STATUS_LABELS[asset.status] || asset.status,
          'Condición': ASSET_CONDITION_LABELS[asset.condition] || asset.condition,
          'Área': asset.area?.name || '-',
          'Ubicación Específica': asset.location_detail || '-',
          'Asignado A': asset.assigned_employee?.full_name || 'Sin Asignar',
          'F. Adquisición': asset.acquisition_date ? new Date(asset.acquisition_date).toLocaleDateString() : '-',
          'Valor Actual': asset.current_value || 0,
          'Proveedor': asset.supplier || '-',
          'Nro. Factura': asset.invoice_number || '-',
          'Orden Compra': asset.purchase_order || '-',
          // Technical Specs
          'Procesador': specs.processor || '-',
          'RAM': specs.ram || '-',
          'Almacenamiento': specs.storage || '-',
          'Sistema Operativo': specs.operating_system || '-',
          'IP': specs.ip_address || '-',
          'MAC': specs.mac_address || '-',
          'AnyDesk': specs.anydesk_id || '-',
          'Observaciones': asset.notes || '-'
        }
      })

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(dataToExport)

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario')

      // Save file
      const fileName = `Inventario_${station?.code || 'General'}_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)

      notify.success('Archivo exportado correctamente')
    } catch (error) {
      console.error('Export error:', error)
      notify.error('Error al exportar datos')
    }
  }

  const handleModalSuccess = async () => {
    await fetchData()
    setShowFormModal(false)
    setShowAssignModal(false)
    setShowTransferModal(false)
    setEditingAsset(null)
    setSelectedAsset(null)
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setFilterCategory('ALL')
    setFilterStatus('ALL')
    setFilterCondition('ALL')
    setFilterArea('ALL')
    setFilterOrganization('ALL')
    setFilterAssigned('ALL')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Cargando activos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Inventario de Activos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestión completa de activos - {station?.name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchData()}
            className="btn btn-secondary p-2"
            title="Refrescar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <div className="hidden sm:flex gap-2">
            <button
              onClick={handleExport}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="btn btn-secondary flex items-center gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-900/10 dark:text-emerald-400 dark:border-emerald-800"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Importar</span>
            </button>
          </div>

          <button
            onClick={handleCreate}
            className="btn btn-primary flex items-center gap-2 flex-1 sm:flex-none justify-center"
          >
            <Plus className="w-4 h-4" />
            <span className="whitespace-nowrap">Nuevo Activo</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Activos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Package className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Disponibles</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.available}</p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">En Uso</p>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{stats.in_use}</p>
            </div>
            <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Mantenimiento</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.maintenance}</p>
            </div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Valor Total</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.total_value)}
              </p>
            </div>
            <Package className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div
          className="flex items-center justify-between cursor-pointer lg:cursor-default"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
        >
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Filtros</h3>
            {(searchTerm || filterCategory !== 'ALL' || filterStatus !== 'ALL' ||
              filterCondition !== 'ALL' || filterArea !== 'ALL' || filterOrganization !== 'ALL' ||
              filterAssigned !== 'ALL') && (
                <span className="text-xs bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 px-2 py-0.5 rounded-full lg:hidden">
                  Activos
                </span>
              )}
          </div>
          <div className="flex items-center gap-2">
            {(searchTerm || filterCategory !== 'ALL' || filterStatus !== 'ALL' ||
              filterCondition !== 'ALL' || filterArea !== 'ALL' || filterOrganization !== 'ALL' ||
              filterAssigned !== 'ALL') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClearFilters()
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 hidden lg:block"
                >
                  Limpiar filtros
                </button>
              )}
            <button className="lg:hidden p-1 text-gray-500">
              {showMobileFilters ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 ${showMobileFilters ? 'block' : 'hidden lg:grid'}`}>
          {/* Búsqueda */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por código, nombre, marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <SearchableSelect
              options={[
                { value: 'ALL', label: 'Todas las categorías' },
                ...Object.entries(ASSET_CATEGORY_LABELS).map(([value, label]) => ({
                  value,
                  label
                }))
              ]}
              value={filterCategory}
              onChange={setFilterCategory}
              placeholder="Categoría"
            />
          </div>

          {/* Estado */}
          <div>
            <SearchableSelect
              options={[
                { value: 'ALL', label: 'Todos los estados' },
                ...Object.entries(ASSET_STATUS_LABELS).map(([value, label]) => ({
                  value,
                  label
                }))
              ]}
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="Estado"
            />
          </div>

          {/* Condición */}
          <div>
            <SearchableSelect
              options={[
                { value: 'ALL', label: 'Todas las condiciones' },
                ...Object.entries(ASSET_CONDITION_LABELS).map(([value, label]) => ({
                  value,
                  label
                }))
              ]}
              value={filterCondition}
              onChange={setFilterCondition}
              placeholder="Condición"
            />
          </div>

          {/* Área */}
          <div>
            <SearchableSelect
              options={[
                { value: 'ALL', label: 'Todas las áreas' },
                ...areas.map(area => ({
                  value: area.id,
                  label: area.name
                }))
              ]}
              value={filterArea}
              onChange={setFilterArea}
              placeholder="Área"
            />
          </div>

          {/* Organización */}
          <div>
            <SearchableSelect
              options={[
                { value: 'ALL', label: 'Todas las organizaciones' },
                ...organizations.map(org => ({
                  value: org.id,
                  label: org.name
                }))
              ]}
              value={filterOrganization}
              onChange={setFilterOrganization}
              placeholder="Organización"
            />
          </div>

          {/* Asignación */}
          <div>
            <SearchableSelect
              options={[
                { value: 'ALL', label: 'Todos' },
                { value: 'ASSIGNED', label: 'Asignados' },
                { value: 'AVAILABLE', label: 'Sin asignar' }
              ]}
              value={filterAssigned}
              onChange={setFilterAssigned}
              placeholder="Asignación"
            />
          </div>

          {/* Mobile Clear Filters Button */}
          {(searchTerm || filterCategory !== 'ALL' || filterStatus !== 'ALL' ||
            filterCondition !== 'ALL' || filterArea !== 'ALL' || filterOrganization !== 'ALL' ||
            filterAssigned !== 'ALL') && (
              <button
                onClick={handleClearFilters}
                className="btn btn-secondary w-full lg:hidden mt-2 text-primary-600"
              >
                Limpiar filtros activos
              </button>
            )}
        </div>
      </div>

      {/* Barra de herramientas */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {filteredAssets.length} activo(s) encontrado(s)
        </p>

        {/* Toggle de vista */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode(ASSET_VIEW_MODES.LIST)}
            className={`p-2 rounded ${viewMode === ASSET_VIEW_MODES.LIST
              ? 'bg-white dark:bg-gray-700 text-primary-600 shadow'
              : 'text-gray-600 dark:text-gray-400'
              }`}
            title="Vista de lista"
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode(ASSET_VIEW_MODES.CATALOG)}
            className={`p-2 rounded ${viewMode === ASSET_VIEW_MODES.CATALOG
              ? 'bg-white dark:bg-gray-700 text-primary-600 shadow'
              : 'text-gray-600 dark:text-gray-400'
              }`}
            title="Vista de catálogo"
          >
            <Grid3x3 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Contenido */}
      {filteredAssets.length === 0 ? (
        <div className="card text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchTerm || filterCategory !== 'ALL' || filterStatus !== 'ALL'
              ? 'No se encontraron activos con los filtros aplicados'
              : 'No hay activos registrados'}
          </p>
          {!searchTerm && filterCategory === 'ALL' && (
            <button onClick={handleCreate} className="btn btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Crear Primer Activo
            </button>
          )}
        </div>
      ) : viewMode === ASSET_VIEW_MODES.CATALOG ? (
        // Vista de Catálogo
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map(asset => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onView={handleView}
              onEdit={handleEdit}
              onAssign={handleAssign}
              onTransfer={handleTransfer}
            />
          ))}
        </div>
      ) : (
        // Vista de Lista
        <>
          {/* Mobile Card View (Visible on mobile only) */}
          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {filteredAssets.map(asset => (
              <div key={asset.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-3">
                {/* Header: Code & Status */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                      {asset.asset_code}
                    </span>
                    <h3 className="font-bold text-gray-900 dark:text-white mt-1">
                      {asset.asset_name}
                    </h3>
                    {(asset.brand || asset.model) && (
                      <p className="text-xs text-gray-500">
                        {[asset.brand, asset.model].filter(Boolean).join(' - ')}
                      </p>
                    )}
                  </div>
                  <AssetStatusBadge status={asset.status} />
                </div>

                {/* Meta Info Grid */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Categoría</span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {ASSET_CATEGORY_LABELS[asset.asset_category]}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Área</span>
                    <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300 font-medium">
                      <MapPin className="w-3 h-3" /> {asset.area?.name || '-'}
                    </div>
                  </div>
                  <div className="flex flex-col col-span-2">
                    <span className="text-xs text-gray-500">Responsable</span>
                    {asset.assigned_employee ? (
                      <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300 font-medium">
                        <User className="w-3 h-3" /> {asset.assigned_employee.full_name}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Sin asignar</span>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 mt-1">
                  <AssetConditionBadge condition={asset.condition} />

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleView(asset)}
                      className="p-2 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg dark:bg-gray-700 dark:text-gray-300"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(asset)}
                      className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg dark:bg-blue-900/20 dark:text-blue-400"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAssign(asset)}
                      className="p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg dark:bg-purple-900/20 dark:text-purple-400"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleTransfer(asset)}
                      className="p-2 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg dark:bg-orange-900/20 dark:text-orange-400"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (Hidden on mobile) */}
          <div className="card overflow-x-auto hidden lg:block">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Activo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Condición
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Asignado a
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Área
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAssets.map(asset => (
                  <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-900 dark:text-white">
                        {asset.asset_code}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {asset.asset_name}
                        </div>
                        {(asset.brand || asset.model) && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {[asset.brand, asset.model].filter(Boolean).join(' - ')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {ASSET_CATEGORY_LABELS[asset.asset_category]}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <AssetStatusBadge status={asset.status} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <AssetConditionBadge condition={asset.condition} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {asset.assigned_employee ? (
                        <div className="text-sm">
                          <div className="text-gray-900 dark:text-white">
                            {asset.assigned_employee.full_name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {asset.assigned_employee.dni}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {asset.area?.name || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {asset.current_value ? formatCurrency(asset.current_value) : '-'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleView(asset)}
                          className="p-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(asset)}
                          className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAssign(asset)}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                          title="Asignar"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleTransfer(asset)}
                          className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors"
                          title="Transferir"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                        {asset.status !== ASSET_STATUS.BAJA && (
                          <button
                            onClick={() => handleDecommission(asset)}
                            className="p-1.5 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900/20 rounded transition-colors"
                            title="Dar de Baja"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(asset)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Archivar (Eliminar)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modales */}
      <AssetDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedAsset(null)
        }}
        asset={selectedAsset}
      />

      <AssetFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false)
          setEditingAsset(null)
        }}
        asset={editingAsset}
        onSuccess={handleModalSuccess}
        stationId={station?.id}
        stationCode={station?.code}
      />

      <AssetAssignModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false)
          setSelectedAsset(null)
        }}
        asset={selectedAsset}
        onSuccess={handleModalSuccess}
        stationId={station?.id}
      />

      <AssetTransferModal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false)
          setSelectedAsset(null)
        }}
        asset={selectedAsset}
        onSuccess={handleModalSuccess}
      />

      <DecommissionModal
        isOpen={showDecommissionModal}
        onClose={() => {
          setShowDecommissionModal(false)
          setSelectedAsset(null)
        }}
        asset={selectedAsset}
        onConfirm={handleConfirmDecommission}
      />

      <AssetsImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleModalSuccess}
        stationId={station?.id}
      />
    </div>
  )
}

export default AssetsPage
