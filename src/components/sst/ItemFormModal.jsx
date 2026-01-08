import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, Save, CheckCircle, Trash2, Sparkles, ChevronRight,
    Map, Search, Package
} from 'lucide-react'
import SearchableSelect from '@components/common/SearchableSelect'
import eppInventoryService from '@services/eppInventoryService'
import masterProductService from '@services/masterProductService'
import { useNotification } from '@contexts/NotificationContext'

// Helper to map master types to local enums
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

const ItemFormModal = ({
    isOpen,
    onClose,
    onSuccess,
    editingItem = null,
    stationId,
    areas = [],
    employees = [],
    valuationEnabled = false,
    currencySymbol = 'S/',
    initialAreaId = null // Allow pre-selecting an area
}) => {
    const { notify } = useNotification()
    const [activeTab, setActiveTab] = useState('general')

    // Master Search Types
    const [masterSearchTerm, setMasterSearchTerm] = useState('')
    const [masterSearchResults, setMasterSearchResults] = useState([])
    const [showMasterSearch, setShowMasterSearch] = useState(false)

    // Form State
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
        area_id: initialAreaId || '',
        master_product_id: null,
        responsible: ''
    })

    // Initialize/Reset form when opening
    useEffect(() => {
        if (isOpen) {
            if (editingItem) {
                setFormData({
                    name: editingItem.name,
                    description: editingItem.description || '',
                    item_type: editingItem.item_type,
                    size: editingItem.size || '',
                    useful_life_months: editingItem.useful_life_months,
                    unit_price: editingItem.unit_price || 0,
                    stock_current: editingItem.stock_current || 0,
                    stock_min: editingItem.stock_min || 0,
                    stock_max: editingItem.stock_max || 0,
                    unit: editingItem.unit || 'UNIDAD',
                    area_id: editingItem.area_id || '',
                    master_product_id: editingItem.master_product_id,
                    sap_code: editingItem.sap_code || '',
                    responsible: editingItem.responsible || ''
                })
            } else {
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
                    area_id: initialAreaId || '',
                    master_product_id: null,
                    responsible: ''
                })
            }
            setActiveTab('general')
        }
    }, [isOpen, editingItem, initialAreaId])

    const handleMasterSearch = async (term) => {
        setMasterSearchTerm(term)
        if (term.length > 2) {
            const results = await masterProductService.search(term)
            setMasterSearchResults(results)
        } else {
            setMasterSearchResults([])
        }
    }

    const selectMasterProduct = (product) => {
        setFormData(prev => {
            // Intentar encontrar el área local que coincida por nombre con el área sugerida del maestro
            let suggestedAreaId = prev.area_id
            if (product.area?.name) {
                const localArea = areas.find(a => a.name.toLowerCase() === product.area.name.toLowerCase())
                if (localArea) suggestedAreaId = localArea.id
            } else if (product.area_id) {
                // Fallback si por alguna razón ya coincide el ID
                suggestedAreaId = product.area_id
            }

            return {
                ...prev,
                name: product.name,
                sap_code: product.sap_code,
                description: product.description || '',
                master_product_id: product.id,
                unit_price: product.base_price || 0,
                unit: product.unit_measurement || 'UNIDAD',
                size: product.size || prev.size,
                area_id: suggestedAreaId,
                item_type: mapMasterTypeToEnum(product.type?.name, product.category?.name),
                responsible: prev.responsible || ''
            }
        })
        setShowMasterSearch(false)
        setMasterSearchTerm('')
        notify.success('Datos cargados y área sincronizada')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const itemData = {
                ...formData,
                station_id: stationId,
                area_id: formData.area_id || null
            }

            if ('base_price' in itemData) delete itemData.base_price

            if (editingItem) {
                await eppInventoryService.update(editingItem.id, itemData)
            } else {
                await eppInventoryService.create(itemData)
            }

            notify.success(editingItem ? 'Item actualizado correctamente' : 'Item creado correctamente')
            if (onSuccess) onSuccess()
            onClose()
        } catch (error) {
            console.error('Error saving item:', error)
            notify.error(error.message || 'Error al guardar el item')
        }
    }

    if (!isOpen) return null

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Header */}
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
                                    onClick={onClose}
                                    className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="px-6 pt-4 flex gap-6 border-b border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={() => setActiveTab('general')}
                                    className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'general' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Información Básica
                                    {activeTab === 'general' && <motion.div layoutId="tab-underline-item" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />}
                                </button>
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'details' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Clasificación
                                    {activeTab === 'details' && <motion.div layoutId="tab-underline-item" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />}
                                </button>
                                <button
                                    onClick={() => setActiveTab('stock')}
                                    className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'stock' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Control de Stock
                                    {activeTab === 'stock' && <motion.div layoutId="tab-underline-item" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />}
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
                                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                                    {/* GENERAL TAB */}
                                    {activeTab === 'general' && (
                                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }} className="space-y-5">
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
                                                    {formData.master_product_id && (
                                                        <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
                                                    )}
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
                                                                <Sparkles size={14} />
                                                                <span>CATÁLOGO</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
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

                                    {/* DETAILS TAB */}
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

                                    {/* STOCK TAB */}
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
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center z-10">
                                    <p className="text-xs text-gray-400 hidden sm:block">
                                        * Campos obligatorios
                                    </p>
                                    <div className="flex gap-3 w-full sm:w-auto">
                                        <button
                                            type="button"
                                            onClick={onClose}
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

            {/* MASTER SEARCH OVERLAY - INTEGRATED */}
            <AnimatePresence>
                {isOpen && showMasterSearch && (
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
                                        <p className="text-gray-500 mt-1 max-w-xs mx-auto">Intenta con otro término.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                            <Search className="w-10 h-10 text-blue-500/50" />
                                        </div>
                                        <h3 className="text-xl font-medium text-gray-900 dark:text-white">Buscador Inteligente</h3>
                                        <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                                            Busca EPPs o herramientas para sincronizar con el catálogo oficial.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

export default ItemFormModal
