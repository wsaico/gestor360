import { useState, useEffect } from 'react'
import { useAuth } from '@contexts/AuthContext'
import { useNotification } from '@contexts/NotificationContext'
import masterProductService from '@services/masterProductService'
import areaService from '@services/areaService'
import * as XLSX from 'xlsx'
import MasterProductImportModal from '@components/admin/MasterProductImportModal'
import Pagination from '@components/common/Pagination'
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Upload,
    Download,
    Filter,
    Package,
    Save,
    X,
    Tag,
    Layers
} from 'lucide-react'
import { ROLES } from '@utils/constants'

const MasterCatalogPage = () => {
    const { notify } = useNotification()
    const { user } = useAuth()
    const isAdmin = user?.role === ROLES.ADMIN

    const [products, setProducts] = useState([])
    const [types, setTypes] = useState([])
    const [areas, setAreas] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Filters
    const [filterType, setFilterType] = useState('ALL')

    // Pagination
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(20)
    const [totalItems, setTotalItems] = useState(0)

    // Product Modal State
    const [showModal, setShowModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [formData, setFormData] = useState({
        name: '',
        sap_code: '',
        description: '',
        type_id: '',
        base_price: 0,
        unit_measurement: 'UNIDAD',
        size: '',
        area_id: '',
        image_url: ''
    })

    // Import Modal State
    const [showImportModal, setShowImportModal] = useState(false)

    // Type Modal
    const [showTypeModal, setShowTypeModal] = useState(false)
    const [typeForm, setTypeForm] = useState({ name: '', description: '' })

    useEffect(() => {
        fetchMetadata()
    }, [])

    useEffect(() => {
        fetchProducts()
    }, [page, filterType])

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (page === 1) fetchProducts()
            else setPage(1)
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm])

    const fetchMetadata = async () => {
        try {
            const typs = await masterProductService.getTypes()
            setTypes(typs)
            const ars = await areaService.getAll()
            // Eliminar duplicados por nombre para el Catálogo Maestro global
            const uniqueAreas = ars.reduce((acc, current) => {
                const x = acc.find(item => item.name === current.name);
                if (!x) return acc.concat([current]);
                else return acc;
            }, []);
            setAreas(uniqueAreas)
        } catch (error) {
            console.error('Error fetching metadata', error)
        }
    }

    const fetchProducts = async () => {
        try {
            setLoading(true)
            const { data, count } = await masterProductService.getProducts({
                page,
                limit: itemsPerPage,
                search: searchTerm,
                typeId: filterType
            })
            setProducts(data || [])
            setTotalItems(count || 0)
            setTotalPages(Math.ceil((count || 0) / itemsPerPage))
        } catch (error) {
            console.error('Fetch products error:', error)
            if (error.message && error.message.includes('404')) {
                notify.warning('Tablas no encontradas. Ejecute el script SQL.')
            }
            setProducts([])
        } finally {
            setLoading(false)
        }
    }

    // --- PRODUCT HANDLERS ---
    const handleOpenModal = (product = null) => {
        if (product) {
            setEditingProduct(product)
            setFormData({
                name: product.name,
                sap_code: product.sap_code,
                description: product.description || '',
                type_id: product.type_id || '',
                base_price: product.base_price || 0,
                unit_measurement: product.unit_measurement || 'UNIDAD',
                size: product.size || '',
                area_id: product.area_id || '',
                image_url: product.image_url || ''
            })
        } else {
            setEditingProduct(null)
            setFormData({
                name: '',
                sap_code: '',
                description: '',
                type_id: '',
                base_price: 0,
                unit_measurement: 'UNIDAD',
                size: '',
                area_id: '',
                image_url: ''
            })
        }
        setShowModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!isAdmin) {
            notify.error('No tiene permisos para realizar esta acción')
            return
        }
        try {
            if (editingProduct) {
                await masterProductService.updateProduct(editingProduct.id, formData)
                notify.success('Producto actualizado')
            } else {
                await masterProductService.createProduct(formData)
                notify.success('Producto creado')
            }
            setShowModal(false)
            fetchProducts()
        } catch (error) {
            notify.error('Error: ' + error.message)
        }
    }

    const handleDelete = async (id) => {
        if (!isAdmin) {
            notify.error('No tiene permisos para realizar esta acción')
            return
        }
        if (!window.confirm('¿Está seguro de eliminar este producto?')) return
        try {
            await masterProductService.deleteProduct(id)
            notify.success('Producto eliminado')
            fetchProducts()
        } catch (error) {
            notify.error(error.message)
        }
    }

    // --- TYPE HANDLERS ---
    const handleCreateType = async (e) => {
        e.preventDefault()
        if (!isAdmin) {
            notify.error('No tiene permisos para realizar esta acción')
            return
        }
        try {
            const newType = await masterProductService.createType(typeForm)
            notify.success('Tipo creado')
            setShowTypeModal(false)
            setTypeForm({ name: '', description: '' })
            fetchMetadata() // Refresh lists
            setFormData(prev => ({ ...prev, type_id: newType.id })) // Auto-select
        } catch (error) {
            notify.error('Error: ' + error.message)
        }
    }

    // KEPT FOR COMPATIBILITY / FALLBACK
    const handleDownloadTemplate = () => {
        const template = [
            {
                'CODIGO_SAP': '1001',
                'NOMBRE': 'Ejemplo Producto',
                'TIPO': 'EPP', // Auto-create
                'AREA': 'RAMPA',
                'TALLA': 'L',
                'PRECIO_BASE': 10.50,
                'UNIDAD': 'UNIDAD',
                'DESCRIPCION': 'Descripción del producto'
            }
        ]
        const ws = XLSX.utils.json_to_sheet(template)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
        XLSX.writeFile(wb, 'Plantilla_Catalogo_Maestro.xlsx')
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Package className="w-8 h-8 text-primary-600" />
                        Catálogo Maestro
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Gestión centralizada de productos, precios y clasificaciones.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o código SAP..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="flex gap-2">
                        {isAdmin && (
                            <>
                                <button
                                    onClick={() => setShowImportModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm"
                                >
                                    <Upload className="w-5 h-5" />
                                    <span className="hidden sm:inline">Importar</span>
                                </button>

                                <button
                                    onClick={() => handleOpenModal()}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span className="hidden sm:inline">Nuevo Producto</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="input w-full"
                        >
                            <option value="ALL">Todos los Tipos</option>
                            {types.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">SKU / SAP</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Producto</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Área / Talla</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Precio</th>
                                {isAdmin && <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-8 text-gray-500">Cargando catálogo...</td></tr>
                            ) : products.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-gray-500">No se encontraron productos</td></tr>
                            ) : (
                                products.map(product => (
                                    <tr key={product.id} className="hover:bg-blue-50/50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{product.sap_code || '-'}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-gray-900 dark:text-white">{product.name}</div>
                                            <div className="text-xs text-gray-500">{product.description}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 text-xs rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 font-medium">
                                                {product.type?.name || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-xs font-medium text-gray-900 dark:text-white">{product.area?.name || 'Gral.'}</div>
                                            <div className="text-[10px] text-gray-500">{product.size || '-'}</div>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                                            S/ {Number(product.base_price).toFixed(2)}
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenModal(product)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product.id)}
                                                        className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && totalItems > 0 && (
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        onPageChange={(newPage) => setPage(newPage)}
                        onItemsPerPageChange={(newItemsPerPage) => {
                            setItemsPerPage(newItemsPerPage)
                            setPage(1)
                        }}
                    />
                )}
            </div>

            {/* PRODUCT MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Basic Info */}
                                <div className="col-span-2 md:col-span-1">
                                    <label className="label">Código SAP / SKU</label>
                                    <input
                                        type="text"
                                        value={formData.sap_code}
                                        onChange={e => setFormData({ ...formData, sap_code: e.target.value })}
                                        className="input w-full font-mono"
                                        placeholder="Ej: 100456"
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="label">Unidad de Medida</label>
                                    <select
                                        value={formData.unit_measurement}
                                        onChange={e => setFormData({ ...formData, unit_measurement: e.target.value })}
                                        className="input w-full"
                                    >
                                        <option value="UNIDAD">Unidad</option>
                                        <option value="PAR">Par</option>
                                        <option value="KIT">Kit</option>
                                        <option value="METRO">Metro</option>
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="label">Nombre del Producto *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="input w-full font-medium"
                                        required
                                        placeholder="Ej: Guante Hyflex 11-800"
                                    />
                                </div>

                                {/* Classifications with Quick Create */}
                                <div className="col-span-2 md:col-span-1">
                                    <label className="label flex justify-between">
                                        Tipo
                                        {isAdmin && <button type="button" onClick={() => setShowTypeModal(true)} className="text-xs text-primary-600 hover:underline font-bold">+ Crear Nuevo</button>}
                                    </label>
                                    <select
                                        value={formData.type_id}
                                        onChange={e => setFormData({ ...formData, type_id: e.target.value })}
                                        className="input w-full"
                                        required
                                    >
                                        <option value="">-- Seleccionar Tipo --</option>
                                        {types.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <label className="label">Área Sugerida</label>
                                    <select
                                        value={formData.area_id}
                                        onChange={e => setFormData({ ...formData, area_id: e.target.value })}
                                        className="input w-full"
                                    >
                                        <option value="">-- Sin Área Específica --</option>
                                        {areas.map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <label className="label">Talla / Medida</label>
                                    <input
                                        type="text"
                                        value={formData.size}
                                        onChange={e => setFormData({ ...formData, size: e.target.value })}
                                        className="input w-full"
                                        placeholder="Ej: L, 42, 10 pies"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="label">Descripción</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="input w-full"
                                        rows="2"
                                    />
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <label className="label">Precio Base (S/)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.base_price}
                                        onChange={e => setFormData({ ...formData, base_price: parseFloat(e.target.value) })}
                                        className="input w-full text-lg font-bold text-gray-800"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary px-8">
                                    Guardar Producto
                                </button>
                            </div>
                        </form>
                    </div>
                </div >
            )}

            {/* CREATE TYPE MODAL */}
            {
                showTypeModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-xl border-t-4 border-purple-500">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Nuevo Tipo de Producto</h3>
                            <form onSubmit={handleCreateType} className="space-y-4">
                                <div>
                                    <label className="label">Nombre (Ej: EPP, Uniforme)</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={typeForm.name}
                                        onChange={e => setTypeForm({ ...typeForm, name: e.target.value.toUpperCase() })}
                                        className="input w-full uppercase"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label">Descripción</label>
                                    <input
                                        type="text"
                                        value={typeForm.description}
                                        onChange={e => setTypeForm({ ...typeForm, description: e.target.value })}
                                        className="input w-full"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={() => setShowTypeModal(false)} className="btn btn-secondary btn-sm">Cancelar</button>
                                    <button type="submit" className="btn btn-primary btn-sm">Crear Tipo</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            <MasterProductImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onSuccess={() => {
                    fetchProducts()
                    // Modal handles its own success notification
                }}
                types={types}
                areas={areas}
            />

        </div >
    )
}

export default MasterCatalogPage
