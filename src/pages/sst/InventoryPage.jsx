import { useState, useEffect, useRef } from 'react'
import InventoryImportModal from '@components/sst/InventoryImportModal'

import { EPP_ITEM_TYPES } from '@utils/constants'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@contexts/AuthContext'
import { useNotification } from '@contexts/NotificationContext'

import eppInventoryService from '@services/eppInventoryService'

import masterProductService from '@services/masterProductService'
import employeeService from '@services/employeeService'
import areaService from '@services/areaService'

import supabase from '@services/supabase'
import AddStockModal from '@components/sst/AddStockModal'
import ConfirmDialog from '@components/ConfirmDialog'
import SearchableSelect from '@components/common/SearchableSelect'
import * as XLSX from 'xlsx-js-style'
import {
  Plus,
  Search,
  AlertTriangle,
  Package,
  TrendingDown,
  Edit,
  Trash2,
  X,
  Save,
  Filter,
  Map,
  Upload,
  Download,
  User,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Sparkles
} from 'lucide-react'

// Helper to map master types to local enums
const mapMasterTypeToEnum = (masterType, masterCategory) => {
  // Combine both for robust keyword matching
  const typeStr = (masterType || '').toUpperCase()
  const catStr = (masterCategory || '').toUpperCase()
  const combined = `${typeStr} ${catStr}`

  // Mapping logic (Priority: Uniforme -> Herramienta -> Equipo -> EPP)
  if (combined.includes('UNIFORM') || combined.includes('ROPA') || combined.includes('TEXTIL') || combined.includes('VESTIMENTA') || combined.includes('CAMISA') || combined.includes('PANTALON')) return 'UNIFORME'
  if (combined.includes('HERRAMIENTA')) return 'HERRAMIENTA'
  if (combined.includes('EQUIPO') && combined.includes('EMERGENCIA')) return 'EQUIPO_EMERGENCIA'
  if (combined.includes('EXTINTOR') || combined.includes('BOTIQUIN')) return 'EQUIPO_EMERGENCIA'

  // Default to EPP
  return 'EPP'
}

const InventoryPage = () => {
  const { station, user, getEffectiveStationId } = useAuth()
  const { notify } = useNotification()
  const fileInputRef = useRef(null)

  const [items, setItems] = useState([])
  const [areas, setAreas] = useState([]) // State for areas
  const [categories, setCategories] = useState([])
  const [employees, setEmployees] = useState([]) // State for employees

  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [filterArea, setFilterArea] = useState('ALL')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [selectedStationId, setSelectedStationId] = useState(station?.id || '') // For Global Admin station selection

  // States for Add Stock Modal
  const [showStockModal, setShowStockModal] = useState(false)
  const [stockItem, setStockItem] = useState(null)

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false)

  // State for ConfirmDialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'danger'
  })

  // Settings State
  const [valuationEnabled, setValuationEnabled] = useState(false)
  const [currencySymbol, setCurrencySymbol] = useState('S/')
  const [activeTab, setActiveTab] = useState('general') // 'general', 'details', 'stock'

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sap_code: '',
    item_type: 'EPP',
    size: '',
    useful_life_months: 12,
    stock_current: 0,
    stock_min: 10,
    stock_max: 100,
    unit_price: 0,
    unit: 'UNIDAD',
    area_id: '',
    master_product_id: null,
    responsible: '' // New 'Responsable' field
  })

  const [masterProducts, setMasterProducts] = useState([])
  const [masterSearchTerm, setMasterSearchTerm] = useState('')
  const [masterSearchResults, setMasterSearchResults] = useState([])
  const [showMasterSearch, setShowMasterSearch] = useState(false) // Visibility toggle for search
  const [showMasterResults, setShowMasterResults] = useState(false)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Master Search Handler
  const handleMasterSearch = async (term) => {
    setMasterSearchTerm(term)
    if (term.length > 2) {
      const results = await masterProductService.search(term)
      setMasterSearchResults(results)
      setShowMasterResults(true)
    } else {
      setMasterSearchResults([])
      setShowMasterResults(false)
    }
  }

  const selectMasterProduct = (product) => {
    setFormData(prev => ({
      ...prev,
      name: product.name,
      sap_code: product.sap_code,
      description: product.description || '',
      master_product_id: product.id,
      unit_price: product.base_price || 0,
      unit: product.unit_measurement || 'UNIDAD',
      // Auto-complete Item Type using both Type and Category from Master
      item_type: mapMasterTypeToEnum(product.type?.name, product.category?.name),
      responsible: prev.responsible || ''
    }))
    setShowMasterSearch(false)
    setMasterSearchTerm('')
    notify.success('Datos cargados del Catálogo Maestro. Campos bloqueados para mantener estándar.')
  }

  useEffect(() => {
    // Trigger fetch if station changes OR if I am admin (and station might be null)
    if (station?.id || user?.role === 'ADMIN') {
      fetchData()
      fetchSettings()
    }
  }, [station?.id, user?.role])

  // Sync selectedStationId when station changes in header (Global Admin selects station)
  useEffect(() => {
    if (station?.id && station.id !== selectedStationId) {
      setSelectedStationId(station.id)
    }
  }, [station?.id])

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('*')
        .in('key', ['INVENTORY_VALORIZATION_ENABLED', 'CURRENCY_SYMBOL'])

      if (data) {
        const enabledObj = data.find(s => s.key === 'INVENTORY_VALORIZATION_ENABLED')
        const currencyObj = data.find(s => s.key === 'CURRENCY_SYMBOL')

        // Robust check: allows true (boolean) or "true" (string)
        const isEnabled = enabledObj?.value === true || String(enabledObj?.value) === 'true'
        setValuationEnabled(isEnabled)

        if (currencyObj?.value) {
          // Remove extra quotes if present
          setCurrencySymbol(String(currencyObj.value).replace(/['"]+/g, ''))
        }
      }
    } catch (err) {
      console.error('Error loading settings', err)
    }
  }

  const fetchData = async () => {
    // Si no hay estación y NO es admin global, no cargar nada.
    // Si ES admin global, station será null, permitimos carga (getAll sin filtro).
    // Pero espera, si useAuth devuelve station=null, ¿cómo sabemos si es admin? -> user.role
    if (!station?.id && user?.role !== 'ADMIN') return

    try {
      setLoading(true)
      const targetStationId = getEffectiveStationId(selectedStationId)

      const [inventoryData, areasData, categoriesData, employeesData] = await Promise.all([
        eppInventoryService.getAll(targetStationId),
        areaService.getAll(targetStationId, true),
        masterProductService.getCategories(),
        employeeService.getAll(targetStationId, { activeOnly: true }, 1, 1000).then(res => res.data)
      ])


      setItems(inventoryData || [])
      setAreas(areasData || [])
      setCategories(categoriesData || [])
      setEmployees(employeesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      notify.error('Error al cargar datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const itemData = {
        ...formData,
        station_id: station?.id,
        area_id: formData.area_id || null
      }

      // Sanitization
      if ('base_price' in itemData) delete itemData.base_price

      if (editingItem) {
        await eppInventoryService.update(editingItem.id, itemData)
      } else {
        await eppInventoryService.create(itemData)
      }

      await fetchData()
      handleCloseModal()
      notify.success(editingItem ? 'Item actualizado correctamente' : 'Item creado correctamente')
    } catch (error) {
      console.error('Error saving item:', error)
      notify.error(error.message || 'Error al guardar el item')
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description || '',
      item_type: item.item_type,
      size: item.size || '',
      useful_life_months: item.useful_life_months,
      unit_price: item.unit_price || 0,
      stock_current: item.stock_current || 0,
      stock_min: item.stock_min || 0,
      stock_max: item.stock_max || 0,
      unit: item.unit || 'UNIDAD',
      area_id: item.area_id || '',
      master_product_id: item.master_product_id,
      sap_code: item.sap_code || '',
      responsible: item.responsible || ''
    })
    setShowModal(true)
  }

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Item',
      message: '¿Está seguro de eliminar este item? Esta acción no se puede deshacer.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await eppInventoryService.delete(id)
          await fetchData()
          notify.success('Item eliminado correctamente')
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        } catch (error) {
          console.error('Error deleting item:', error)
          notify.error('Error al eliminar el item')
        }
      }
    })
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingItem(null)
    setFormData({
      name: '',
      description: '',
      sap_code: '',
      item_type: 'EPP',
      size: '',
      useful_life_months: 12,
      stock_current: 0,
      stock_min: 10,
      stock_max: 100,
      unit_price: 0,
      unit: 'UNIDAD',
      area_id: '',
      master_product_id: null,
      responsible: ''
    })
  }

  // Stock Modal Helpers
  const handleOpenStockModal = (item) => {
    setStockItem(item)
    setShowStockModal(true)
  }

  const handleStockSuccess = async () => {
    await fetchData()
  }

  const getStockStatus = (item) => {
    if (item.stock_current <= 0) {
      return { status: 'danger', label: 'Sin stock', color: 'red' }
    }
    if (item.stock_current < item.stock_min) {
      return { status: 'warning', label: 'Stock bajo', color: 'yellow' }
    }
    return { status: 'success', label: 'Stock normal', color: 'green' }
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sap_code?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = filterType === 'ALL' || item.item_type === filterType
    const matchesArea = filterArea === 'ALL' || item.area_id === filterArea

    return matchesSearch && matchesType && matchesArea
  })

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  const stats = {
    total: items.length,
    lowStock: items.filter(i => i.stock_current < i.stock_min).length,
    noStock: items.filter(i => i.stock_current <= 0).length,
    totalStock: items.reduce((sum, i) => sum + i.stock_current, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando inventario...</p>
        </div>
      </div>
    )
  }

  // File Upload and Template Handlers (kept same as before)
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    // ... same implementation as before ...
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)
        if (data.length === 0) { alert('Vacio'); return; }
        let successCount = 0; let errors = []
        setLoading(true)
        for (const row of data) {
          try {
            const itemData = {
              station_id: station.id,
              name: row['NOMBRE'] || row['Nombre'],
              sap_code: row['CODIGO SAP'] || '',
              // ... other mapping ...
              item_type: 'EPP', // Default
              is_active: true
            }
            if (!itemData.name) continue
            await eppInventoryService.create(itemData)
            successCount++
          } catch (err) { errors.push(row) }
        }
        await fetchData()
        alert('Carga Completa')
      } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    reader.readAsBinaryString(file)
  }
  const handleDownloadTemplate = () => {
    /* ... same ... */
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet([{ 'NOMBRE': 'GUANTE', 'TIPO': 'EPP' }])
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'Plantilla.xlsx')
  }

  // ==========================================
  // EXPORTACION EXCEL AVANZADA
  // ==========================================
  const STYLE_HEADER = {
    fill: { fgColor: { rgb: "1E3A8A" } }, // Azul Corporativo
    font: { color: { rgb: "FFFFFF" }, bold: true, sz: 12 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
  }

  const STYLE_CELL = {
    font: { sz: 11 },
    alignment: { horizontal: "left", vertical: "center" },
    border: { top: { style: "thin", color: { rgb: "D1D5DB" } }, bottom: { style: "thin", color: { rgb: "D1D5DB" } }, left: { style: "thin", color: { rgb: "D1D5DB" } }, right: { style: "thin", color: { rgb: "D1D5DB" } } }
  }

  const STYLE_CELL_CENTER = { ...STYLE_CELL, alignment: { horizontal: "center", vertical: "center" } }
  const STYLE_NUMBER = { ...STYLE_CELL, alignment: { horizontal: "right", vertical: "center" } }
  const STYLE_TITLE = { font: { bold: true, sz: 16, color: { rgb: "111827" } }, alignment: { horizontal: "left" } }
  const STYLE_SUBTITLE = { font: { sz: 12, color: { rgb: "4B5563" } }, alignment: { horizontal: "left" } }

  const createCell = (v, s = STYLE_CELL) => ({ v, s })

  const handleExport = () => {
    try {
      if (items.length === 0) {
        notify.info('No hay items para exportar')
        return
      }

      // 1. Data Processing
      const dataRows = items.map((item, index) => {
        const areaName = areas.find(a => a.id === item.area_id)?.name || 'General'
        return [
          createCell(index + 1, STYLE_CELL_CENTER),
          createCell(item.name, STYLE_CELL),
          createCell(item.sap_code || '-', STYLE_CELL_CENTER),
          createCell(item.item_type, STYLE_CELL_CENTER),
          createCell(areaName, STYLE_CELL),
          createCell(item.description || '-', STYLE_CELL),
          createCell(item.size || '-', STYLE_CELL_CENTER),
          createCell(item.unit, STYLE_CELL_CENTER),
          createCell(item.useful_life_months, STYLE_CELL_CENTER),
          createCell(item.stock_current, { ...STYLE_CELL_CENTER, font: { bold: true, color: { rgb: item.stock_current <= 0 ? "EF4444" : "000000" } } }),
          createCell(item.stock_min, STYLE_CELL_CENTER),
          createCell(item.responsible || '-', STYLE_CELL),
          ...(valuationEnabled ? [createCell(item.unit_price, STYLE_NUMBER)] : [])
        ]
      })

      // 2. Headers
      const headers = [
        createCell('N°', STYLE_HEADER),
        createCell('NOMBRE DEL ITEM', STYLE_HEADER),
        createCell('CODIGO SAP', STYLE_HEADER),
        createCell('TIPO', STYLE_HEADER),
        createCell('AREA', STYLE_HEADER),
        createCell('DESCRIPCION', STYLE_HEADER),
        createCell('TALLA', STYLE_HEADER),
        createCell('UNIDAD', STYLE_HEADER),
        createCell('VIDA UTIL (Meses)', STYLE_HEADER),
        createCell('STOCK ACTUAL', STYLE_HEADER),
        createCell('STOCK MIN', STYLE_HEADER),
        createCell('RESPONSABLE', STYLE_HEADER),
        ...(valuationEnabled ? [createCell(`PRECIO (${currencySymbol})`, STYLE_HEADER)] : [])
      ]

      // 3. Document Structure
      const wsData = [
        [createCell('REPORTE GENERAL DE INVENTARIO SST', STYLE_TITLE)],
        [createCell(`Estación: ${station?.name || 'Todas'} | Fecha: ${new Date().toLocaleDateString()}`, STYLE_SUBTITLE)],
        [createCell('')], // Spacer
        headers,
        ...dataRows
      ]

      // 4. Workbook Creation
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(wsData)

      // 5. Configs (Column Widths, Merges)
      ws['!cols'] = [
        { wch: 5 },  // N
        { wch: 35 }, // Nombre
        { wch: 15 }, // SAP
        { wch: 15 }, // Tipo
        { wch: 20 }, // Area
        { wch: 30 }, // Descripcion
        { wch: 10 }, // Talla
        { wch: 10 }, // Unidad
        { wch: 12 }, // Vida
        { wch: 12 }, // Stock
        { wch: 12 }, // Min
        { wch: 20 }, // Resp
        ...(valuationEnabled ? [{ wch: 15 }] : []) // Precio
      ]

      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } }
      ]

      XLSX.utils.book_append_sheet(wb, ws, 'Inventario_SST')
      XLSX.writeFile(wb, `Inventario_SST_${new Date().toISOString().split('T')[0]}.xlsx`)
      notify.success('Exportación completada con formato profesional')
    } catch (error) {
      console.error('Error exporting:', error)
      notify.error('Error al exportar inventario')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventario SST</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestión de EPPs, Uniformes y Equipos de Emergencia
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <button onClick={handleExport} className="btn btn-secondary btn-sm inline-flex items-center space-x-2">
            <Download className="w-4 h-4" /><span>Exportar</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="btn btn-secondary btn-sm inline-flex items-center space-x-2 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
          >
            <Upload className="w-4 h-4" /><span>Importar</span>
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm inline-flex items-center space-x-2">
            <Plus className="w-4 h-4" /><span>Agregar Item</span>
          </button>
        </div>
      </div>

      {/* KPI Compact Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Total Items</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p></div><Package className="text-gray-300 dark:text-gray-600 w-8 h-8" /></div></div>
        <div className="card p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Stock Bajo</p><p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.lowStock}</p></div><AlertTriangle className="text-yellow-200 dark:text-yellow-900/40 w-8 h-8" /></div></div>
        <div className="card p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Sin Stock</p><p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.noStock}</p></div><AlertTriangle className="text-red-200 dark:text-red-900/40 w-8 h-8" /></div></div>
        <div className="card p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Unidades Totales</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalStock}</p></div><TrendingDown className="text-green-200 dark:text-green-900/40 w-8 h-8" /></div></div>
      </div>

      {/* Filters Compact */}
      <div className="card p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Buscar por nombre, SAP..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }} className="input pl-9 w-full text-sm py-1.5" />
          </div>
          <div className="flex items-center gap-2">
            <select value={filterArea} onChange={e => { setFilterArea(e.target.value); setCurrentPage(1) }} className="input text-sm py-1.5">
              <option value="ALL">Todas las Áreas</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1) }} className="input text-sm py-1.5">
              <option value="ALL">Todos los tipos</option>
              <option value={EPP_ITEM_TYPES.EPP}>EPP</option>
              <option value={EPP_ITEM_TYPES.UNIFORME}>Uniforme</option>
              <option value={EPP_ITEM_TYPES.EQUIPO_EMERGENCIA}>Eq. Emergencia</option>
            </select>
          </div>
        </div>
      </div>

      {/* COMPACT TABLE */}
      <div className="gestor-table-container">
        <div className="overflow-x-auto">
          <table className="gestor-table">
            <thead className="gestor-thead">
              <tr>
                <th className="gestor-th w-1/3">Item / Descripción</th>
                <th className="gestor-th">Clasificación</th>
                <th className="gestor-th text-center">Stock</th>
                <th className="gestor-th text-center">Estado</th>
                {valuationEnabled && <th className="gestor-th text-right">Valor</th>}
                <th className="gestor-th text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="gestor-tbody uppercase text-[10px] tracking-wider">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No se encontraron items.
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => {
                  const status = getStockStatus(item)
                  const areaName = areas.find(a => a.id === item.area_id)?.name || '-'
                  const totalValue = (item.stock_current * (item.unit_price || 0)).toFixed(2)

                  return (
                    <tr key={item.id} className="gestor-tr-hover">
                      <td className="gestor-td">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800 dark:text-white text-sm">{item.name}</span>
                            {item.sap_code && (
                              <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1 rounded">
                                {item.sap_code}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2 text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {item.description && <span className="truncate max-w-[200px]" title={item.description}>{item.description}</span>}
                            {item.responsible && (
                              <span className="flex items-center text-gray-400 dark:text-gray-500">
                                <User className="w-3 h-3 mr-0.5" /> {item.responsible}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="gestor-td">
                        <div className="flex flex-col text-xs">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">{item.item_type}</span>
                          <span className="text-gray-400 dark:text-gray-500 flex items-center gap-1">
                            <Map className="w-3 h-3" /> {areaName}
                          </span>
                        </div>
                      </td>
                      <td className="gestor-td text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-gray-800 dark:text-white">{item.stock_current}</span>
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase">{item.unit}</span>
                        </div>
                      </td>
                      <td className="gestor-td text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${status.color === 'red' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30' :
                          status.color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900/30' :
                            'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30'
                          }`}>
                          {status.label}
                        </span>
                      </td>

                      {valuationEnabled && (
                        <td className="gestor-td text-right font-mono text-xs text-gray-600 dark:text-gray-400">
                          {currencySymbol} {totalValue}
                        </td>
                      )}

                      <td className="gestor-td text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenStockModal(item)}
                            className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                            title="Ajustar Stock"
                          >
                            <TrendingDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {filteredItems.length > 0 && (
            <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Siguiente
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-gray-700">
                    Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a <span className="font-medium">{Math.min(indexOfLastItem, filteredItems.length)}</span> de <span className="font-medium">{filteredItems.length}</span> resultados
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${currentPage === 1 ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => paginate(i + 1)}
                        className={`relative inline-flex items-center px-4 py-2 border text-xs font-medium ${currentPage === i + 1 ? 'z-10 bg-primary-50 border-primary-500 text-primary-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${currentPage === totalPages ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Edit/Create - IMPROVED MODERN UX */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modern Header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingItem ? 'Editar Item' : 'Nuevo Item'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {editingItem ? 'Actualiza los datos del inventario' : 'Registra un nuevo elemento en tu estación'}
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Tabs Navigation */}
              <div className="px-6 pt-4 flex gap-6 border-b border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'general' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Información Básica
                  {activeTab === 'general' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />}
                </button>
                <button
                  onClick={() => setActiveTab('details')}
                  className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'details' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Clasificación
                  {activeTab === 'details' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />}
                </button>
                <button
                  onClick={() => setActiveTab('stock')}
                  className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'stock' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Control de Stock
                  {activeTab === 'stock' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-6">
                  {/* TAB: GENERAL */}
                  {activeTab === 'general' && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }} className="space-y-5">
                      {/* Name with Master Search Integration */}
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nombre del Item <span className="text-red-500">*</span></label>
                        <div className="relative group">
                          <input
                            type="text"
                            required
                            className={`w-full pl-4 pr-12 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${formData.master_product_id ? 'pl-10 border-blue-200 bg-blue-50/30' : ''}`}
                            value={formData.name}
                            onChange={e => !formData.master_product_id && setFormData({ ...formData, name: e.target.value })}
                            readOnly={!!formData.master_product_id}
                            placeholder="Ej. Guantes de seguridad, Casco..."
                          />

                          {/* Left Icon if linked */}
                          {formData.master_product_id && (
                            <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
                          )}

                          {/* Right Action Button */}
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            {formData.master_product_id ? (
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, name: '', sap_code: '', master_product_id: null }))}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Desvincular"
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setShowMasterSearch(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-lg shadow-blue-500/30 transform transition-all hover:scale-105 active:scale-95 text-xs font-bold"
                                title="Buscar en Catálogo Oficial"
                              >
                                <Sparkles size={14} className="animate-pulse" />
                                <span>CATÁLOGO</span>
                              </button>
                            )}
                          </div>
                        </div>
                        {formData.master_product_id ? (
                          <p className="text-xs text-blue-600 mt-1.5 flex items-center gap-1 font-medium">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                            Vinculado al Catálogo Maestro
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 mt-1.5">
                            Recomendación: Usa la lupa para buscar productos estandarizados.
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Código SAP</label>
                          <input
                            type="text"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            value={formData.sap_code}
                            onChange={e => !formData.master_product_id && setFormData({ ...formData, sap_code: e.target.value })}
                            readOnly={!!formData.master_product_id}
                            placeholder="Opcional"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tipo <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <select
                              required
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 appearance-none"
                              value={formData.item_type}
                              onChange={e => setFormData({ ...formData, item_type: e.target.value })}
                            >
                              <option value="EPP">EPP (Protección Personal)</option>
                              <option value="UNIFORME">Uniforme / Ropa</option>
                              <option value="HERRAMIENTA">Herramienta</option>
                              <option value="EQUIPO_EMERGENCIA">Equipo de Emergencia</option>
                              <option value="CONSUMIBLE">Consumible</option>
                              <option value="OTRO">Otro</option>
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Descripción</label>
                        <textarea
                          rows={3}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                          placeholder="Detalles adicionales, marca, modelo..."
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* TAB: DETAILS */}
                  {activeTab === 'details' && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }} className="space-y-5">
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 flex gap-3 items-start">
                        <Map className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300">Ubicación y Métricas</h4>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Define dónde se usa este item y cómo se mide.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Área Operativa</label>
                          <div className="relative">
                            <select
                              value={formData.area_id}
                              onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 appearance-none"
                            >
                              <option value="">-- General / Planta --</option>
                              {areas.map(area => (
                                <option key={area.id} value={area.id}>{area.name}</option>
                              ))}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Unidad de Medida <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <select
                              required
                              value={formData.unit}
                              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 appearance-none"
                            >
                              <option value="UNIDAD">Unidad</option>
                              <option value="PAR">Par</option>
                              <option value="KIT">Kit</option>
                              <option value="JUEGO">Juego</option>
                              <option value="CAJA">Caja</option>
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Talla / Medida</label>
                          <input
                            type="text"
                            value={formData.size}
                            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            placeholder="Ej: 42, L, XL"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Vida Útil (Meses)</label>
                          <input
                            type="number"
                            min="1"
                            value={formData.useful_life_months}
                            onChange={(e) => setFormData({ ...formData, useful_life_months: parseInt(e.target.value) })}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                          />
                        </div>
                      </div>

                      <div>
                        <SearchableSelect
                          label="Responsable (Opcional)"
                          placeholder="Asignar un responsable..."
                          options={employees.map(emp => ({ label: emp.full_name, value: emp.full_name }))}
                          value={formData.responsible}
                          onChange={(val) => setFormData({ ...formData, responsible: val })}
                        />
                        <p className="text-xs text-gray-400 mt-1">Persona encargada de custodiar este stock.</p>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB: STOCK */}
                  {activeTab === 'stock' && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }} className="space-y-6">

                      <div className="grid grid-cols-2 gap-6">
                        <div className="bg-green-50 dark:bg-green-900/10 p-5 rounded-2xl border border-green-100 dark:border-green-800/30 text-center">
                          <label className="block text-sm font-bold text-green-700 dark:text-green-400 mb-2 uppercase tracking-wide">Stock Inicial</label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={formData.stock_current}
                            onChange={(e) => setFormData({ ...formData, stock_current: parseInt(e.target.value) })}
                            className="w-full text-center text-3xl font-black bg-transparent border-none focus:ring-0 text-green-800 dark:text-green-300 p-0"
                          />
                          <p className="text-xs text-green-600/70 mt-1">Unidades físicas actuales</p>
                        </div>

                        {valuationEnabled && (
                          <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                            <label className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Costo Unit.</label>
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-lg font-medium text-gray-400">{currencySymbol}</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.unit_price}
                                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
                                className="w-24 text-center text-3xl font-black bg-transparent border-none focus:ring-0 text-gray-800 dark:text-gray-300 p-0"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="h-px bg-gray-100 dark:bg-gray-700" />

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex justify-between">
                            <span>Mínimo (Alerta)</span>
                            <span className="text-yellow-500 font-bold">{formData.stock_min}</span>
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={formData.stock_min}
                            onChange={(e) => setFormData({ ...formData, stock_min: parseInt(e.target.value) })}
                            className="w-full accent-yellow-500 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <p className="text-xs text-gray-400 mt-1">Avisar cuando baje de esta cantidad.</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex justify-between">
                            <span>Máximo (Ideal)</span>
                            <span className="text-blue-500 font-bold">{formData.stock_max}</span>
                          </label>
                          <input
                            type="range"
                            min={formData.stock_min}
                            max="500"
                            value={formData.stock_max}
                            onChange={(e) => setFormData({ ...formData, stock_max: parseInt(e.target.value) })}
                            className="w-full accent-blue-500 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <p className="text-xs text-gray-400 mt-1">Meta de inventario para este item.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Footer Fixed */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <p className="text-xs text-gray-400 hidden sm:block">
                    * Campos obligatorios
                  </p>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium shadow-lg shadow-primary-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Save size={18} />
                      {editingItem ? 'Guardar Cambios' : 'Registrar'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AddStockModal
        show={showStockModal}
        onClose={() => setShowStockModal(false)}
        item={stockItem}
        onSuccess={handleStockSuccess}
        userId={user?.id}
      />

      {/* MASTER SEARCH MODAL (Premium Command Palette Style) */}
      <AnimatePresence>
        {showMasterSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-start justify-center pt-24 px-4 bg-gray-900/60 backdrop-blur-sm transition-all"
            onClick={() => setShowMasterSearch(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ring-1 ring-gray-900/5 flex flex-col max-h-[70vh]"
            >
              {/* Premium Search Header */}
              <div className="relative border-b border-gray-100 dark:border-gray-700">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                <input
                  type="text"
                  autoFocus
                  placeholder="¿Qué producto buscas? (Ej: Guantes, Casco...)"
                  className="w-full pl-16 pr-14 py-6 bg-transparent border-none text-xl text-gray-800 dark:text-white placeholder-gray-400 focus:ring-0 font-light"
                  value={masterSearchTerm}
                  onChange={(e) => handleMasterSearch(e.target.value)}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="hidden sm:inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-500 border border-gray-200 dark:border-gray-600 font-mono">ESC</span>
                  <button
                    onClick={() => setShowMasterSearch(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={20} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Results Area */}
              <div className="flex-1 overflow-y-auto bg-gray-50/30 dark:bg-gray-900/30 min-h-[300px]">
                {masterSearchResults.length > 0 ? (
                  <div className="p-3 grid gap-2">
                    <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Resultados ({masterSearchResults.length})</p>
                    {masterSearchResults.map((product, index) => (
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        key={product.id}
                        onClick={() => selectMasterProduct(product)}
                        className="group flex-1 flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:border-blue-500/30 hover:ring-1 hover:ring-blue-500/30 hover:shadow-md transition-all text-left w-full"
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                            <Package size={24} strokeWidth={1.5} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {product.name}
                            </h4>
                            <div className="flex items-center gap-3 mt-1.5 text-sm">
                              {product.sap_code && (
                                <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-mono text-xs border border-gray-200 dark:border-gray-600">
                                  SAP: {product.sap_code}
                                </span>
                              )}
                              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                                {product.type?.name || 'Item General'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                      </motion.button>
                    ))}
                  </div>
                ) : masterSearchTerm.length > 2 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No encontramos "{masterSearchTerm}"</h3>
                    <p className="text-gray-500 mt-1 max-w-xs mx-auto">Intenta con otro término o verifica la ortografía.</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                      <Search className="w-10 h-10 text-blue-500/50" />
                    </div>
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white">Buscador Inteligente</h3>
                    <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                      Escribe el nombre del EPP o herramienta para sincronizarlo con el catálogo oficial y evitar errores manuales.
                    </p>
                    <div className="mt-8 flex gap-2 justify-center text-xs text-gray-400">
                      <span className="px-2 py-1 bg-white dark:bg-gray-800 border rounded">Nombre</span>
                      <span className="px-2 py-1 bg-white dark:bg-gray-800 border rounded">SAP</span>
                      <span className="px-2 py-1 bg-white dark:bg-gray-800 border rounded">Categoría</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs text-gray-500">
                <div className="flex gap-4">
                  <span>Pro tip: Usa palabras clave simples</span>
                </div>
                <div>
                  Catálogo Maestro v1.0
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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

      <InventoryImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          fetchData()
        }}
      />
    </div >
  )
}

// Utility styling class for labels
const labelStyle = "block text-sm font-semibold text-gray-700 mb-1.5"

export default InventoryPage
