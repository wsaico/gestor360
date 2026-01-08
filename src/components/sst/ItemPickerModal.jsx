import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Package, Filter, AlertTriangle, Plus, PlusCircle, Star, Briefcase } from 'lucide-react'

const ItemPickerModal = ({
    show,
    onClose,
    onSelect,
    items = [],
    areas = [],
    recommendedAreaId = null,
    cartItems = [], // Items already in the delivery cart
    onCreateItem,
    onAddStock
}) => {
    const [searchTerm, setSearchTerm] = useState('')
    // Initialize filter with recommended area to enforce default filtering
    const [filterArea, setFilterArea] = useState(recommendedAreaId || '')

    console.log('ItemPickerModal Props:', { onCreateItem: !!onCreateItem, onAddStock: !!onAddStock, recommendedAreaId })

    // Update filterArea when recommendedAreaId changes (e.g., when picking a different employee)
    useMemo(() => {
        if (recommendedAreaId) {
            setFilterArea(recommendedAreaId)
        }
    }, [recommendedAreaId])

    // Filter and Sort Items
    const filteredItems = useMemo(() => {
        let result = items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.sap_code && item.sap_code.includes(searchTerm))

            // STRICT FILTERING LOGIC:
            // 1. If filterArea is set (defaulting to employee's area), show only matches OR generic items (area_id is null)
            // 2. However, the user specifically requested: "If it's RAMPA, don't show to PAX".
            //    So if item has an specific area that is DIFFERENT from the employee's area, it should generally be hidden unless "All Areas" is explicitly selected.

            let matchesArea = true
            if (filterArea) {
                // Show matched area OR global items (null area_id)
                // NOTE: We assume null area_id means 'General' available to all. 
                // If the item belongs to ANOTHER specific area, it will fail this check.
                matchesArea = (item.area_id === filterArea) || (!item.area_id)
            }

            return matchesSearch && matchesArea
        })

        // Sort by relevance: Recommended Area first
        if (recommendedAreaId) {
            result.sort((a, b) => {
                const aIsRec = a.area_id === recommendedAreaId ? 1 : 0
                const bIsRec = b.area_id === recommendedAreaId ? 1 : 0
                return bIsRec - aIsRec
            })
        }

        return result
    }, [items, searchTerm, filterArea, recommendedAreaId])

    if (!show) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Package className="text-blue-600" size={20} />
                                Seleccionar Item
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {recommendedAreaId ? 'Mostrando sugeridos para el área del colaborador' : 'Busca en el inventario disponible'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Search & Filters */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 space-y-3 bg-white dark:bg-gray-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                autoFocus
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                placeholder="Buscar por nombre, código SAP..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-2">
                            <select
                                className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                                value={filterArea}
                                onChange={(e) => setFilterArea(e.target.value)}
                            >
                                <option value="">Todas las Áreas</option>
                                {areas.map(area => (
                                    <option key={area.id} value={area.id}>{area.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-gray-50 dark:bg-gray-900/50">
                        {filteredItems.length > 0 ? (
                            filteredItems.map((item) => {
                                const isRecommended = recommendedAreaId && item.area_id === recommendedAreaId

                                // Calculate Virtual Stock
                                const qtyInCart = cartItems
                                    .filter(ci => ci.item_id === item.id)
                                    .reduce((sum, ci) => sum + ci.quantity, 0)

                                const effectiveStock = item.stock_current - qtyInCart
                                const hasStock = effectiveStock > 0

                                const areaName = areas.find(a => a.id === item.area_id)?.name || 'General'

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => hasStock && onSelect(item)}
                                        className={`group relative flex items-center gap-4 p-3 rounded-xl border transition-all ${hasStock
                                            ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md cursor-pointer'
                                            : 'bg-gray-50 dark:bg-gray-800/50 border-transparent' // Removed opacity-75
                                            }`}
                                    >
                                        {/* Icon Box */}
                                        <div className={`p-3 rounded-lg shrink-0 ${hasStock
                                            ? isRecommended ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                            : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                                            }`}>
                                            <Package size={24} />
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`font-medium truncate pr-2 ${hasStock ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                                                    {item.name}
                                                </h4>
                                                {isRecommended && (
                                                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wide border border-amber-200 dark:border-amber-800/50">
                                                        <Star size={10} fill="currentColor" />
                                                        Sugerido
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <Briefcase size={12} />
                                                    {areaName}
                                                </span>
                                                {item.size && (
                                                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded font-mono">
                                                        {item.size}
                                                    </span>
                                                )}
                                                {item.sap_code && (
                                                    <span className="font-mono opacity-70">SAP: {item.sap_code}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stock Status & Actions */}
                                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                            {hasStock ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-lg font-bold text-gray-900 dark:text-white font-mono leading-none">
                                                        {effectiveStock}
                                                    </span>
                                                    <span className="text-[10px] uppercase text-gray-400 font-medium">
                                                        Disponible
                                                    </span>
                                                    {qtyInCart > 0 && (
                                                        <span className="text-[10px] text-blue-500 font-bold">
                                                            ({qtyInCart} en carrito)
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end">
                                                    <span className="flex items-center gap-1 text-red-500 font-medium text-xs bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full border border-red-100 dark:border-red-800/50">
                                                        <AlertTriangle size={12} />
                                                        Sin Stock
                                                    </span>
                                                    {/* ALWAYS SHOW BUTTON FOR DEBUGGING */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            if (onAddStock) onAddStock(item)
                                                            else console.warn('onAddStock is missing')
                                                        }}
                                                        className="mt-1 text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer z-10"
                                                    >
                                                        <PlusCircle size={12} />
                                                        Reponer
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                                <Package size={48} className="text-gray-300 mb-3" />
                                <p className="text-gray-900 dark:text-white font-medium">No se encontraron items</p>
                                <p className="text-sm text-gray-500 mb-4">Intenta con otro término de búsqueda.</p>
                                {/* ALWAYS SHOW BUTTON FOR DEBUGGING */}
                                <button
                                    onClick={onCreateItem}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2"
                                >
                                    <Plus size={16} />
                                    Crear Nuevo Item
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Footer / Global Quick Actions */}
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center text-xs text-gray-500">
                        <span>{filteredItems.length} items encontrados</span>
                        <div className="flex gap-2">
                            {/* ALWAYS SHOW BUTTON FOR DEBUGGING */}
                            <button
                                onClick={onCreateItem}
                                className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                                <Plus size={14} />
                                Nuevo Item Manual
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}

export default ItemPickerModal
