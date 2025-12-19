import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@contexts/AuthContext'
import { useNotification } from '@contexts/NotificationContext'

import eppInventoryService from '@services/eppInventoryService'

import masterProductService from '@services/masterProductService'
import employeeService from '@services/employeeService'
import areaService from '@services/areaService'

import supabase from '@services/supabase'
import AddStockModal from '@components/sst/AddStockModal'
import SearchableSelect from '@components/common/SearchableSelect'
import * as XLSX from 'xlsx'
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
  Map, // Imported Map icon
  Upload,
  Download,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { EPP_ITEM_TYPES } from '@utils/constants'

const InventoryPage = () => {
  const { station, user } = useAuth()
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

  // States for Add Stock Modal
  const [showStockModal, setShowStockModal] = useState(false)
  const [stockItem, setStockItem] = useState(null)

  // Settings State
  const [valuationEnabled, setValuationEnabled] = useState(false)
  const [currencySymbol, setCurrencySymbol] = useState('S/')

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

  // Master Search State
  const [masterSearchTerm, setMasterSearchTerm] = useState('')
  const [masterSearchResults, setMasterSearchResults] = useState([])
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
    setFormData({
      ...formData,
      name: product.name,
      sap_code: product.sap_code,
      description: product.description || '',
      master_product_id: product.id,
      unit_price: product.base_price || 0,
      unit: product.unit_measurement || 'UNIDAD',
      item_type: 'EPP', // Default strict type
      responsible: formData.responsible || ''
    })
    setShowMasterResults(false)
    setMasterSearchTerm('')
    notify.success('Datos cargados del Catálogo Maestro. Campos bloqueados para mantener estándar.')
  }

  useEffect(() => {
    if (station?.id) {
      fetchData()
      fetchSettings()
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
    if (!station?.id) return

    try {
      setLoading(true)
      const [inventoryData, areasData, categoriesData, employeesData] = await Promise.all([
        eppInventoryService.getAll(station.id),
        areaService.getAll(station.id, true),
        masterProductService.getCategories(),
        employeeService.getAll(station.id, { activeOnly: true })
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

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de eliminar este item?')) return

    try {
      await eppInventoryService.delete(id)
      await fetchData()
      notify.success('Item eliminado correctamente')
    } catch (error) {
      console.error('Error deleting item:', error)
      notify.error('Error al eliminar el item')
    }
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

  const handleExport = () => {
    try {
      if (items.length === 0) {
        notify.info('No hay items para exportar')
        return
      }

      const exportData = items.map(item => ({
        'NOMBRE': item.name,
        'CODIGO SAP': item.sap_code || '',
        'TIPO': item.item_type,
        'AREA': areas.find(a => a.id === item.area_id)?.name || 'General / Planta',
        'DESCRIPCION': item.description || '',
        'TALLA': item.size || '',
        'UNIDAD': item.unit,
        'VIDA UTIL (MESES)': item.useful_life_months,
        'STOCK ACTUAL': item.stock_current,
        'STOCK MIN': item.stock_min,
        'STOCK MAX': item.stock_max,
        'RESPONSABLE': item.responsible || '',
        ...(valuationEnabled ? { [`PRECIO (${currencySymbol})`]: item.unit_price } : {})
      }))

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario_SST')
      XLSX.writeFile(wb, `Inventario_SST_${new Date().toISOString().split('T')[0]}.xlsx`)
      notify.success('Exportación completada')
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
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" />
          <button onClick={handleExport} className="btn btn-secondary btn-sm inline-flex items-center space-x-2">
            <Download className="w-4 h-4" /><span>Exportar</span>
          </button>
          <button onClick={handleDownloadTemplate} className="btn btn-secondary btn-sm inline-flex items-center space-x-2">
            <Download className="w-4 h-4" /><span className="hidden sm:inline">Plantilla</span>
          </button>
          <button onClick={() => fileInputRef.current.click()} className="btn btn-secondary btn-sm inline-flex items-center space-x-2">
            <Upload className="w-4 h-4" /><span>Carga Masiva</span>
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

      {/* Modal Edit/Create - IMPROVED GRID UX */}
      {showModal && (
        <div className="gestor-modal-backdrop">
          <div className="gestor-modal-content max-w-4xl">
            <div className="gestor-modal-header">
              <h3 className="gestor-modal-title">
                {editingItem ? 'Editar Item' : 'Agregar Nuevo Item'}
              </h3>
              <button type="button" onClick={handleCloseModal} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="gestor-modal-body overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">

                {/* Master Product Autocomplete - Full Width */}
                {!editingItem && (
                  <div className="relative bg-blue-50 p-4 rounded-xl border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800">
                    <label className="block text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                      1️⃣ Buscar en Catálogo Maestro (Opcional)
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-5 w-5 text-blue-500" />
                      <input
                        type="text"
                        placeholder="Buscar producto oficial..."
                        value={masterSearchTerm}
                        onChange={(e) => handleMasterSearch(e.target.value)}
                        className="pl-10 input w-full border-blue-300 focus:border-blue-500 focus:ring-blue-500 py-2.5"
                      />
                    </div>
                    {/* Results Dropdown */}
                    {showMasterResults && masterSearchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-60 overflow-auto border border-gray-200">
                        {masterSearchResults.map(product => (
                          <button key={product.id} type="button" onClick={() => selectMasterProduct(product)} className="w-full text-left px-4 py-3 hover:bg-blue-50 flex justify-between items-center border-b last:border-0 border-gray-100">
                            <div>
                              <div className="font-semibold text-gray-800">{product.name}</div>
                              <div className="text-xs text-gray-500">SAP: {product.sap_code}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                  {/* Section: Basic Info */}
                  <div className="lg:col-span-3 pb-2 border-b border-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider">
                    Información General
                  </div>

                  <div className="lg:col-span-1">
                    <label className="label">Nombre del Item *</label>
                    <input
                      type="text"
                      required
                      readOnly={!!formData.master_product_id}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`input w-full ${formData.master_product_id ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="label">Código SAP</label>
                    <input
                      type="text"
                      readOnly={!!formData.master_product_id}
                      value={formData.sap_code}
                      onChange={(e) => setFormData({ ...formData, sap_code: e.target.value })}
                      className={`input w-full ${formData.master_product_id ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="label">Tipo de Item *</label>
                    <select
                      required
                      value={formData.item_type}
                      onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                      className="input w-full"
                    >
                      <option value="EPP">EPP</option>
                      <option value="UNIFORME">Uniforme</option>
                      <option value="EQUIPO_EMERGENCIA">Equipo Emergencia</option>
                    </select>
                  </div>

                  <div className="lg:col-span-3">
                    <label className="label">Descripción</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input w-full"
                      placeholder="Detalles adicionales..."
                    />
                  </div>

                  {/* Section: Classification */}
                  <div className="lg:col-span-3 mt-2 pb-2 border-b border-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider">
                    Clasificación y Detalles
                  </div>

                  <div>
                    <label className="label">Área Operativa</label>
                    <select
                      value={formData.area_id}
                      onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
                      className="input w-full"
                    >
                      <option value="">-- General / Sin Área --</option>
                      {areas.map(area => (
                        <option key={area.id} value={area.id}>{area.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Talla / Medida</label>
                    <input
                      type="text"
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                      className="input w-full"
                      placeholder="Ej: L, 42, Unico"
                    />
                  </div>

                  <div>
                    <label className="label">Unidad de Medida *</label>
                    <select
                      required
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="input w-full"
                    >
                      <option value="UNIDAD">Unidad</option>
                      <option value="PAR">Par</option>
                      <option value="KIT">Kit</option>
                      <option value="JUEGO">Juego</option>
                      <option value="CAJA">Caja</option>
                    </select>
                  </div>

                  {/* Section: Helper Fields */}
                  <div className="lg:col-span-3 mt-2 pb-2 border-b border-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider">
                    Control y Stock
                  </div>

                  <div>
                    <label className="label">Vida Útil (Meses) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.useful_life_months}
                      onChange={(e) => setFormData({ ...formData, useful_life_months: parseInt(e.target.value) })}
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <SearchableSelect
                      label="Responsable de Registro"
                      placeholder="Buscar responsable..."
                      options={employees.map(emp => ({ label: emp.full_name, value: emp.full_name }))}
                      value={formData.responsible}
                      onChange={(val) => setFormData({ ...formData, responsible: val })}
                    />
                  </div>

                  {valuationEnabled && (
                    <div>
                      <label className="label">Precio Unitario ({currencySymbol})</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.unit_price}
                        onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
                        className="input w-full"
                      />
                    </div>
                  )}

                  <div>
                    <label className="label">Stock Mínimo</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.stock_min}
                      onChange={(e) => setFormData({ ...formData, stock_min: parseInt(e.target.value) })}
                      className="input w-full text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900/30 font-bold"
                    />
                  </div>

                  <div>
                    <label className="label">Stock Máximo</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.stock_max}
                      onChange={(e) => setFormData({ ...formData, stock_max: parseInt(e.target.value) })}
                      className="input w-full text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30 font-bold"
                    />
                  </div>

                  <div>
                    <label className="label">Stock Actual Inicial *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.stock_current}
                      onChange={(e) => setFormData({ ...formData, stock_current: parseInt(e.target.value) })}
                      className="input w-full bg-gray-50 dark:bg-gray-800 font-bold dark:text-white"
                      title="Para ajustes posteriores usa el botón '+' en la tabla"
                    />
                  </div>

                </div>
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
                  <Save className="w-5 h-5 mr-2" />
                  {editingItem ? 'Guardar Cambios' : 'Registrar Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

// Utility styling class for labels
const labelStyle = "block text-sm font-semibold text-gray-700 mb-1.5"

export default InventoryPage
