import { useState, useRef, useEffect } from 'react'
import {
    X,
    CheckCircle,
    Loader,
    Search,
    Package,
    ChevronRight,
    Filter,
    Layers,
    Sparkles,
    Save,
    ClipboardList,
    TrendingDown,
    MapPin,
    Infinity,
    AlertCircle,
    Check
} from 'lucide-react'
import eppInventoryService from '@services/eppInventoryService'
import masterProductService from '@services/masterProductService'
import areaService from '@services/areaService'
import { useNotification } from '@contexts/NotificationContext'
import { useAuth } from '@contexts/AuthContext'

const mapMasterTypeToEnum = (masterType, masterCategory) => {
    const typeStr = (masterType || '').toUpperCase()
    const catStr = (masterCategory || '').toUpperCase()
    const combined = `${typeStr} ${catStr}`

    if (combined.includes('UNIFORM') || combined.includes('ROPA') || combined.includes('TEXTIL') || combined.includes('VESTIMENTA') || combined.includes('CAMISA') || combined.includes('PANTALON')) return 'UNIFORME'
    if (combined.includes('HERRAMIENTA')) return 'HERRAMIENTA'
    if (combined.includes('EQUIPO') && combined.includes('EQUIPO_EMERGENCIA')) return 'EQUIPO_EMERGENCIA'
    if (combined.includes('EXTINTOR') || combined.includes('BOTIQUIN')) return 'EQUIPO_EMERGENCIA'

    return 'EPP'
}

const InventoryImportModal = ({ isOpen, onClose, onSuccess }) => {
    const { notify } = useNotification()
    const { station } = useAuth()

    const [loadingCatalog, setLoadingCatalog] = useState(false)
    const [catalogProducts, setCatalogProducts] = useState([])
    const [localAreas, setLocalAreas] = useState([])

    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState('ALL')
    const [selectedIds, setSelectedIds] = useState([])

    const [productConfigs, setProductConfigs] = useState({})
    const [importing, setImporting] = useState(false)
    const [globalAreaId, setGlobalAreaId] = useState('')

    useEffect(() => {
        if (isOpen) {
            fetchInitialData()
        }
    }, [isOpen])

    const fetchInitialData = async () => {
        if (!station?.id) return
        try {
            setLoadingCatalog(true)
            const [cat, inv, ars] = await Promise.all([
                masterProductService.getProducts({ limit: 1000 }),
                eppInventoryService.getAll(station.id),
                areaService.getAll(station.id, true)
            ])

            const availableProducts = (cat.data || []).filter(p =>
                !inv.some(item => item.master_product_id === p.id)
            )

            setCatalogProducts(availableProducts)
            setLocalAreas(ars || [])
            setProductConfigs({})
            setSelectedIds([])
            setGlobalAreaId('')
        } catch (error) {
            notify.error('Error al cargar datos del catálogo')
        } finally {
            setLoadingCatalog(false)
        }
    }

    const toggleSelection = (product) => {
        const id = product.id
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                const newIds = prev.filter(i => i !== id)
                const newConfigs = { ...productConfigs }
                delete newConfigs[id]
                setProductConfigs(newConfigs)
                return newIds
            } else {
                let suggestedAreaId = globalAreaId
                if (!suggestedAreaId && product.area?.name) {
                    const match = localAreas.find(a => a.name.toLowerCase() === product.area.name.toLowerCase())
                    if (match) suggestedAreaId = match.id
                }

                setProductConfigs(prevC => ({
                    ...prevC,
                    [id]: { stock: 0, minStock: 5, areaId: suggestedAreaId }
                }))
                return [...prev, id]
            }
        })
    }

    const updateConfig = (id, field, value) => {
        setProductConfigs(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }))
    }

    const applyGlobalArea = (areaId) => {
        setGlobalAreaId(areaId)
        if (areaId) {
            setProductConfigs(prev => {
                const next = { ...prev }
                selectedIds.forEach(id => {
                    next[id] = { ...next[id], areaId }
                })
                return next
            })
        }
    }

    const handleSync = async () => {
        if (selectedIds.length === 0) return
        try {
            setImporting(true)
            const newItems = selectedIds.map(id => {
                const p = catalogProducts.find(prod => prod.id === id)
                const config = productConfigs[id]

                return {
                    station_id: station.id,
                    master_product_id: p.id,
                    name: p.name,
                    sap_code: p.sap_code || '',
                    description: p.description || '',
                    item_type: mapMasterTypeToEnum(p.type?.name, p.category?.name),
                    size: p.size || 'STD',
                    unit: p.unit_measurement || 'UNIDAD',
                    unit_price: p.base_price || 0,
                    stock_current: parseInt(config.stock || 0),
                    stock_min: parseInt(config.minStock || 5),
                    stock_max: 100,
                    useful_life_months: 12,
                    area_id: config.areaId || null,
                    is_active: true
                }
            })

            await eppInventoryService.createBulk(newItems)
            notify.success(`¡Sincronización Exitosa! ${newItems.length} productos añadidos.`)
            onSuccess(); onClose()
        } catch (error) {
            notify.error('Error al sincronizar: ' + error.message)
        } finally {
            setImporting(false)
        }
    }

    const filteredCatalog = catalogProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sap_code?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesType = filterType === 'ALL' || p.type?.name === filterType
        return matchesSearch && matchesType
    })

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">

                {/* Header Compacto */}
                <div className="shrink-0 px-6 py-5 bg-white dark:bg-slate-900 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Sincronizador Maestro</h2>
                            <p className="text-slate-500 text-[11px] font-bold flex items-center gap-2 mt-0.5">
                                <MapPin className="w-3 h-3 text-primary-500" />
                                Estación: <span className="text-primary-600">{station?.name || '---'}</span>
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Filtros Compactos */}
                <div className="shrink-0 bg-slate-50/50 dark:bg-slate-950/20 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar en catálogo (Nombre o SAP)..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary-500 text-sm font-semibold shadow-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            className="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border-none ring-1 ring-slate-200 dark:ring-slate-700 text-xs font-bold"
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                        >
                            <option value="ALL">Todo</option>
                            {[...new Set(catalogProducts.map(p => p.type?.name))].filter(Boolean).map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => {
                                const allIds = filteredCatalog.map(p => p.id)
                                if (selectedIds.length === allIds.length) {
                                    setSelectedIds([])
                                    setProductConfigs({})
                                } else {
                                    const newConfigs = { ...productConfigs }
                                    allIds.forEach(id => {
                                        if (!newConfigs[id]) {
                                            const p = filteredCatalog.find(prod => prod.id === id)
                                            let suggestedAreaId = globalAreaId
                                            if (!suggestedAreaId && p.area?.name) {
                                                const match = localAreas.find(a => a.name.toLowerCase() === p.area.name.toLowerCase())
                                                if (match) suggestedAreaId = match.id
                                            }
                                            newConfigs[id] = { stock: 0, minStock: 5, areaId: suggestedAreaId }
                                        }
                                    })
                                    setSelectedIds(allIds)
                                    setProductConfigs(newConfigs)
                                }
                            }}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-black text-[10px] uppercase transition-all"
                        >
                            {selectedIds.length === filteredCatalog.length && filteredCatalog.length > 0 ? 'Limpiar' : 'Todo'}
                        </button>
                    </div>
                </div>

                {/* Contenido Principal */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Panel Izquierdo: Selección (SUPER COMPACTO) */}
                    <div className="w-[45%] flex flex-col border-r border-slate-100 dark:border-slate-800 bg-slate-50/20">
                        <div className="shrink-0 px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white/50 backdrop-blur-sm z-10 sticky top-0">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catálogo ({filteredCatalog.length})</span>
                            {selectedIds.length > 0 && <span className="text-primary-600 text-[10px] font-black">{selectedIds.length} LISTOS</span>}
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                            {loadingCatalog ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                                    <Loader className="w-8 h-8 animate-spin text-primary-600" />
                                    <span className="text-[10px] font-black uppercase">Cargando...</span>
                                </div>
                            ) : filteredCatalog.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full opacity-20 text-center p-8">
                                    <Package className="w-12 h-12 mb-2" />
                                    <p className="text-xs font-bold">Sin resultados</p>
                                </div>
                            ) : (
                                filteredCatalog.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => toggleSelection(p)}
                                        className={`group relative h-[62px] p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3 active:scale-[0.98] ${selectedIds.includes(p.id) ? 'border-primary-600 bg-primary-50/30 dark:bg-primary-900/10' : 'bg-white dark:bg-slate-800 border-transparent hover:border-slate-200 shadow-sm'}`}
                                    >
                                        <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${selectedIds.includes(p.id) ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                            <Package className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`font-black text-xs truncate ${selectedIds.includes(p.id) ? 'text-primary-700' : 'text-slate-800 dark:text-white'}`}>{p.name}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[9px] font-black text-slate-400 py-0.5 px-1.5 bg-slate-100 dark:bg-slate-700 rounded-md">{p.sap_code || 'S/N'}</span>
                                                <span className="text-[9px] font-bold text-slate-500 truncate">{p.type?.name}</span>
                                            </div>
                                        </div>
                                        {selectedIds.includes(p.id) && <CheckCircle className="w-5 h-5 text-primary-600 shrink-0" />}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Panel Derecho: Configuración (DENSIDAD ALTA) */}
                    <div className="w-[55%] flex flex-col bg-white dark:bg-slate-950">
                        <div className="shrink-0 px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-white/80 backdrop-blur-md z-10 sticky top-0 flex items-center justify-between">
                            <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Previsión Local</span>

                            {selectedIds.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Área Masiva:</span>
                                    <select
                                        className="text-[10px] font-black py-1 px-2 bg-slate-100 dark:bg-slate-800 rounded-lg border-none ring-1 ring-slate-200"
                                        value={globalAreaId}
                                        onChange={e => applyGlobalArea(e.target.value)}
                                    >
                                        <option value="">Manual</option>
                                        {localAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {selectedIds.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 gap-4">
                                    <TrendingDown className="w-16 h-16" />
                                    <p className="font-bold text-sm max-w-[200px]">Selecciona ítems a la izquierda para configurar</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {selectedIds.map(id => {
                                        const p = catalogProducts.find(prod => prod.id === id)
                                        const config = productConfigs[id] || { stock: 0, minStock: 5, areaId: '' }
                                        const masterAreaName = p.area?.name
                                        const localAreaMatch = masterAreaName ? localAreas.find(la => la.name.toLowerCase() === masterAreaName.toLowerCase()) : null
                                        const isLinked = localAreaMatch && config.areaId === localAreaMatch.id

                                        return (
                                            <div key={id} className="group bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="font-black text-xs text-slate-900 dark:text-white truncate">{p.name}</span>
                                                        <span className="text-[9px] font-black text-primary-500 bg-primary-50 dark:bg-primary-900/10 px-1.5 py-0.5 rounded-md truncate">TALLA {p.size || 'STD'}</span>
                                                    </div>
                                                    {masterAreaName && (
                                                        <div className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg border ${isLinked ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-100 border-slate-200'}`}>
                                                            <MapPin className={`w-2.5 h-2.5 ${isLinked ? 'text-emerald-600' : 'text-slate-400'}`} />
                                                            <span className={`text-[9px] font-black uppercase ${isLinked ? 'text-emerald-700' : 'text-slate-500'}`}>
                                                                {masterAreaName} {isLinked && '✓'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><Save className="w-2.5 h-2.5" /> Stock</label>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-white dark:bg-slate-800 border-none ring-1 ring-slate-200 rounded-lg px-3 py-1.5 text-xs font-black"
                                                            value={config.stock}
                                                            onChange={e => updateConfig(id, 'stock', Math.max(0, e.target.value))}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" /> Alerta</label>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-white dark:bg-slate-800 border-none ring-1 ring-slate-200 rounded-lg px-3 py-1.5 text-xs font-black"
                                                            value={config.minStock}
                                                            onChange={e => updateConfig(id, 'minStock', Math.max(1, e.target.value))}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Área Local</label>
                                                        <select
                                                            className={`w-full bg-white dark:bg-slate-800 border-none ring-1 rounded-lg px-2 py-1.5 text-[10px] font-black ${isLinked ? 'ring-emerald-500' : 'ring-slate-200'}`}
                                                            value={config.areaId}
                                                            onChange={e => updateConfig(id, 'areaId', e.target.value)}
                                                        >
                                                            <option value="">Elegir...</option>
                                                            {localAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Super Compacto */}
                <div className="shrink-0 px-8 py-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-6">
                    <div className="hidden sm:flex items-center gap-3 opacity-60">
                        <Layers className="w-5 h-5 text-primary-600" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Sincronización Catalítica</span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSync}
                            disabled={importing || selectedIds.length === 0}
                            className="flex-1 sm:flex-none bg-primary-600 text-white px-8 py-3 rounded-xl text-[10px] font-black shadow-lg shadow-primary-500/30 hover:bg-primary-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 active:scale-95 uppercase"
                        >
                            {importing ? <Loader className="w-4 h-4 animate-spin" /> : <Infinity className="w-4 h-4" />}
                            <span>Sincronizar {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default InventoryImportModal
