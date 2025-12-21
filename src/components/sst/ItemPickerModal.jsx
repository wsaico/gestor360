import { useState, useMemo } from 'react'
import { Search, X, Package, Ruler, AlertCircle, Check, Map } from 'lucide-react'

const ItemPickerModal = ({
    show,
    onClose,
    items = [],
    areas = [],
    onSelect
}) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterArea, setFilterArea] = useState('')

    // Reset filters when modal opens/closes

    const filteredItems = useMemo(() => {
        if (!Array.isArray(items)) return []

        return items.filter(item => {
            if (!item) return false

            const name = item.name || ''
            const code = item.code || ''
            const searchLower = searchTerm.toLowerCase()

            const matchesSearch =
                name.toLowerCase().includes(searchLower) ||
                code.toLowerCase().includes(searchLower)

            const matchesArea = filterArea ? item.area_id === filterArea : true

            return matchesSearch && matchesArea
        })
    }, [items, searchTerm, filterArea])

    if (!show) return null

    return (
        <div className="gestor-modal-backdrop">
            <div className="gestor-modal-content max-w-2xl">
                {/* Header */}
                <div className="gestor-modal-header">
                    <h3 className="gestor-modal-title flex items-center">
                        <Package className="w-5 h-5 mr-2 text-primary-600" />
                        Seleccionar Producto
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col md:flex-row gap-3">
                        {/* Search */}
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, código..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input pl-10 w-full"
                                autoFocus
                            />
                        </div>

                        {/* Area Filter */}
                        <div className="relative md:w-1/3">
                            <Map className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <select
                                value={filterArea}
                                onChange={(e) => setFilterArea(e.target.value)}
                                className="input pl-9 w-full"
                            >
                                <option value="">Todas las Áreas</option>
                                {areas.map(area => (
                                    <option key={area.id} value={area.id}>{area.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* List Summary */}
                <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 flex justify-between uppercase font-bold tracking-wider">
                    <span>{filteredItems.length} resultados encontrados</span>
                    {filterArea && <span>Filtrado por área</span>}
                </div>

                <div className="max-h-[60vh] overflow-y-auto gestor-tbody">
                    {filteredItems.length === 0 ? (
                        <div className="py-12 text-center">
                            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400">No se encontraron productos</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredItems.map(item => {
                                const hasStock = item.stock_current > 0
                                const itemArea = areas.find(a => a.id === item.area_id)
                                const areaName = itemArea ? itemArea.name : null // Only show if specific area

                                return (
                                    <div
                                        key={item.id}
                                        className={`p-4 gestor-tr-hover cursor-pointer flex items-center justify-between group ${!hasStock ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                        onClick={() => onSelect(item)}
                                    >
                                        <div className="flex-grow">
                                            <div className="flex items-center mb-1">
                                                <h4 className={`font-medium text-sm ${!hasStock ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-gray-200'}`}>
                                                    {item.name}
                                                </h4>
                                                {item.size && (
                                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300">
                                                        <Ruler className="w-3 h-3 mr-1" />
                                                        {item.size}
                                                    </span>
                                                )}
                                                {areaName && (
                                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                        <Map className="w-3 h-3 mr-1" />
                                                        {areaName}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                                <span className="mr-3 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                                    {item.item_type}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-right pl-4">
                                            <div className={`text-sm font-bold ${hasStock ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-500'}`}>
                                                Stock: {item.stock_current}
                                            </div>
                                            {!hasStock && (
                                                <div className="text-xs text-red-500 flex items-center justify-end mt-1">
                                                    <AlertCircle className="w-3 h-3 mr-1" />
                                                    Agotado
                                                </div>
                                            )}
                                        </div>

                                        <div className="ml-4 text-primary-600 dark:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Check className="w-5 h-5" />
                                        </div>
                                    </div>
                                )
                            })
                            }
                        </div>
                    )}
                </div>

                <div className="gestor-modal-footer">
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div >
    )
}

export default ItemPickerModal
