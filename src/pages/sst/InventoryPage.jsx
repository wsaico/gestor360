import { useState, useEffect, useRef } from 'react'
import InventoryImportModal from '@components/sst/InventoryImportModal'
import ItemFormModal from '@components/sst/ItemFormModal'

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
  Sparkles,
  Infinity
} from 'lucide-react'



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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

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
      // Optimized: Only select needed fields instead of *
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
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

      // Load inventory and categories (always)
      const [inventoryData, categoriesData] = await Promise.all([
        eppInventoryService.getAll(targetStationId),
        masterProductService.getCategories()
      ])

      // Only load areas and employees if we have a station ID
      let areasData = []
      let employeesData = []

      if (targetStationId) {
        [areasData, employeesData] = await Promise.all([
          areaService.getAll(targetStationId, true),
          employeeService.getAll(targetStationId, { activeOnly: true }, 1, 1000).then(res => res.data)
        ])
      }

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



  const handleEdit = (item) => {
    setEditingItem(item)
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
            className="btn btn-secondary btn-sm inline-flex items-center space-x-2 bg-primary-50 text-primary-600 border-primary-200 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-800 shadow-sm"
          >
            <Sparkles className="w-4 h-4" /><span>Sincronizar Catálogo</span>
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

      {/* Refactored ItemFormModal */}
      <ItemFormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSuccess={fetchData}
        editingItem={editingItem}
        stationId={station?.id}
        areas={areas}
        employees={employees}
        valuationEnabled={valuationEnabled}
        currencySymbol={currencySymbol}
      />

      <AddStockModal
        show={showStockModal}
        onClose={() => setShowStockModal(false)}
        item={stockItem}
        onSuccess={handleStockSuccess}
        userId={user?.id}
      />


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
