import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Search, Settings, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import assetConfigService from '@/services/assetConfigService'

const TABS = {
    CATEGORIES: 'CATEGORIES',
    SUBCATEGORIES: 'SUBCATEGORIES',
    BRANDS: 'BRANDS',
    MODELS: 'MODELS'
}

export default function AssetConfigPage() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState(TABS.CATEGORIES)
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [currentItem, setCurrentItem] = useState(null)

    // Auxiliary data for dropdowns (e.g., categories when creating subcategory)
    const [auxData, setAuxData] = useState([])

    const [error, setError] = useState(null)

    useEffect(() => {
        loadItems()
    }, [activeTab])

    const loadItems = async () => {
        setLoading(true)
        setError(null)
        try {
            
            let data = []
            if (activeTab === TABS.CATEGORIES) {
                // Verify service exists
                if (!assetConfigService) throw new Error("Service not loaded")
                data = await assetConfigService.getCategories()
            } else if (activeTab === TABS.SUBCATEGORIES) {
                data = await assetConfigService.getSubcategories()
                const cats = await assetConfigService.getCategories()
                setAuxData(cats || [])
            } else if (activeTab === TABS.BRANDS) {
                data = await assetConfigService.getBrands()
            } else if (activeTab === TABS.MODELS) {
                data = await assetConfigService.getModels()
                const brands = await assetConfigService.getBrands()
                setAuxData(brands || [])
            }
            
            setItems(data || [])
        } catch (error) {
            console.error('Error loading config items:', error)
            setError(error.message)
            setItems([])
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este elemento?')) return
        try {
            if (activeTab === TABS.CATEGORIES) await assetConfigService.deleteCategory(id)
            else if (activeTab === TABS.SUBCATEGORIES) await assetConfigService.deleteSubcategory(id)
            else if (activeTab === TABS.BRANDS) await assetConfigService.deleteBrand(id)
            else if (activeTab === TABS.MODELS) await assetConfigService.deleteModel(id)
            loadItems()
        } catch (error) {
            console.error('Error deleting item:', error)
            alert('Error al eliminar. Es posible que esté en uso.')
        }
    }

    const renderModal = () => {
        if (!showModal) return null
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                    <h3 className="text-lg font-bold mb-4 dark:text-white">
                        {currentItem ? 'Editar' : 'Crear'} {
                            activeTab === TABS.CATEGORIES ? 'Categoría' :
                                activeTab === TABS.SUBCATEGORIES ? 'Subcategoría' :
                                    activeTab === TABS.BRANDS ? 'Marca' : 'Modelo'
                        }
                    </h3>

                    <form onSubmit={async (e) => {
                        e.preventDefault()
                        const formData = new FormData(e.target)
                        const data = Object.fromEntries(formData.entries())

                        try {
                            if (activeTab === TABS.CATEGORIES) {
                                if (currentItem) await assetConfigService.updateCategory(currentItem.id, data)
                                else await assetConfigService.createCategory(data)
                            } else if (activeTab === TABS.SUBCATEGORIES) {
                                if (currentItem) await assetConfigService.updateSubcategory(currentItem.id, data)
                                else await assetConfigService.createSubcategory(data)
                            } else if (activeTab === TABS.BRANDS) {
                                if (currentItem) await assetConfigService.updateBrand(currentItem.id, data)
                                else await assetConfigService.createBrand(data)
                            } else if (activeTab === TABS.MODELS) {
                                if (currentItem) await assetConfigService.updateModel(currentItem.id, data)
                                else await assetConfigService.createModel(data)
                            }
                            setShowModal(false)
                            loadItems()
                        } catch (err) {
                            console.error(err)
                            alert('Error al guardar')
                        }
                    }}>
                        <div className="space-y-4">
                            {/* Common Name Field */}
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Nombre</label>
                                <input name="name" defaultValue={currentItem?.name} required className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            </div>

                            {/* Specific Fields */}
                            {activeTab === TABS.CATEGORIES && (
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Código (Único)</label>
                                    <input name="code" defaultValue={currentItem?.code} required className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                </div>
                            )}

                            {activeTab === TABS.SUBCATEGORIES && (
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Categoría Padre</label>
                                    <select name="category_id" defaultValue={currentItem?.category_id} required className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                        <option value="">Seleccione...</option>
                                        {auxData && auxData.length > 0 && auxData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {activeTab === TABS.MODELS && (
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Marca</label>
                                    <select name="brand_id" defaultValue={currentItem?.brand_id} required className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                        <option value="">Seleccione...</option>
                                        {auxData && auxData.length > 0 && auxData.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold dark:text-white">Configuración de Activos</h1>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar Tabs */}
                {/* Use optional chaining just in case */}
                <div className="w-full md:w-64 space-y-2">
                    {[
                        { id: TABS.CATEGORIES, label: 'Categorías', icon: Settings },
                        { id: TABS.SUBCATEGORIES, label: 'Subcategorías', icon: Settings },
                        { id: TABS.BRANDS, label: 'Marcas', icon: Search },
                        { id: TABS.MODELS, label: 'Modelos', icon: Settings },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === tab.id
                                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold dark:text-white">
                            {activeTab === TABS.CATEGORIES && 'Gestionar Categorías'}
                            {activeTab === TABS.SUBCATEGORIES && 'Gestionar Subcategorías'}
                            {activeTab === TABS.BRANDS && 'Gestionar Marcas'}
                            {activeTab === TABS.MODELS && 'Gestionar Modelos'}
                        </h2>
                        <button
                            onClick={() => { setCurrentItem(null); setShowModal(true) }}
                            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                        >
                            <Plus className="w-4 h-4" /> Nuevo
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
                            Error: {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-10 text-gray-500">Cargando...</div>
                    ) : (!items || items.length === 0) ? (
                        <div className="text-center py-10 text-gray-500">No hay elementos registrados</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="border-b dark:border-gray-700">
                                    <tr>
                                        <th className="pb-3 text-sm font-medium text-gray-500">Nombre</th>
                                        {activeTab === TABS.CATEGORIES && <th className="pb-3 text-sm font-medium text-gray-500">Código</th>}
                                        {activeTab === TABS.SUBCATEGORIES && <th className="pb-3 text-sm font-medium text-gray-500">Categoría Padre</th>}
                                        {activeTab === TABS.MODELS && <th className="pb-3 text-sm font-medium text-gray-500">Marca</th>}
                                        <th className="pb-3 text-sm font-medium text-gray-500 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-gray-700">
                                    {items.map(item => (
                                        <tr key={item.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="py-3 text-gray-900 dark:text-gray-200">{item.name}</td>

                                            {activeTab === TABS.CATEGORIES && (
                                                <td className="py-3 text-sm font-mono text-gray-500">{item.code}</td>
                                            )}

                                            {activeTab === TABS.SUBCATEGORIES && (
                                                <td className="py-3 text-gray-500">{item.category?.name}</td>
                                            )}

                                            {activeTab === TABS.MODELS && (
                                                <td className="py-3 text-gray-500">{item.brand?.name}</td>
                                            )}

                                            <td className="py-3 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => { setCurrentItem(item); setShowModal(true) }}
                                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-blue-600"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-red-600"
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
                    )}
                </div>
            </div>
            {renderModal()}
        </div>
    )
}
