import { useState, useEffect } from 'react'
import { useAuth } from '@contexts/AuthContext'
import { useNotification } from '@contexts/NotificationContext'
import transportService from '@services/transportService'
import { Car, User, Plus, Trash2, Edit2, Save, X, Search, ShieldCheck, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Modal from '@components/Modal'

const TransportFleetPage = () => {
    const { user, station } = useAuth()
    const { notify } = useNotification()
    const isProvider = user?.role === 'PROVIDER' || user?.role_name === 'PROVIDER'

    const [activeTab, setActiveTab] = useState('drivers')
    const [drivers, setDrivers] = useState([])
    const [vehicles, setVehicles] = useState([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // UI States
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(null) // ID of item to delete
    const [editingItem, setEditingItem] = useState(null)
    const [formData, setFormData] = useState({})
    const [providers, setProviders] = useState([]) // For Admin selection

    useEffect(() => {
        if (user) {
            loadData()
            if (!isProvider) loadProviders()
        }
    }, [user, activeTab])

    const loadProviders = async () => {
        try {
            const data = await transportService.getProviders()
            setProviders(data)
        } catch (error) { console.error(error) }
    }

    const loadData = async () => {
        setLoading(true)
        try {
            const filters = {
                providerId: isProvider ? user.id : undefined,
                stationId: station?.id
            }

            if (activeTab === 'drivers') {
                const data = await transportService.getDrivers(filters)
                setDrivers(data)
            } else {
                const data = await transportService.getVehicles(filters)
                setVehicles(data)
            }
        } catch (error) {
            notify.error("Error cargando datos de flota")
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const payload = {
                ...formData,
                provider_id: isProvider ? user.id : formData.provider_id,
                station_id: formData.station_id || station?.id
            }

            if (activeTab === 'drivers') {
                if (editingItem) {
                    await transportService.updateDriver(editingItem.id, payload)
                    notify.success("Conductor actualizado correctamente")
                } else {
                    await transportService.createDriver(payload)
                    notify.success("Conductor creado correctamente")
                }
            } else {
                if (editingItem) {
                    await transportService.updateVehicle(editingItem.id, payload)
                    notify.success("Vehículo actualizado correctamente")
                } else {
                    await transportService.createVehicle(payload)
                    notify.success("Vehículo creado correctamente")
                }
            }

            closeModal()
            loadData()
        } catch (error) {
            notify.error("Error al guardar cambios")
        }
    }

    const confirmDelete = async () => {
        if (!deleteConfirm) return
        try {
            if (activeTab === 'drivers') await transportService.deleteDriver(deleteConfirm)
            else await transportService.deleteVehicle(deleteConfirm)

            notify.success("Registro eliminado")
            setDeleteConfirm(null)
            loadData()
        } catch (error) {
            notify.error("Error al eliminar")
        }
    }

    const openModal = (item = null) => {
        setEditingItem(item)
        setFormData(item || {})
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setEditingItem(null)
        setFormData({})
    }

    // Filters
    const filteredList = (activeTab === 'drivers' ? drivers : vehicles).filter(item => {
        const term = searchTerm.toLowerCase()
        if (activeTab === 'drivers') {
            return item.first_name?.toLowerCase().includes(term) || item.last_name?.toLowerCase().includes(term) || item.dni?.includes(term)
        } else {
            return item.plate_number?.toLowerCase().includes(term) || item.brand?.toLowerCase().includes(term)
        }
    })

    const variants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                            {activeTab === 'drivers' ? <User className="w-8 h-8 text-primary-600" /> : <Car className="w-8 h-8 text-primary-600" />}
                        </div>
                        Gestión de Flota
                    </h1>
                    <p className="text-gray-500 mt-1 ml-14">Administra tus conductores y vehículos asignados.</p>
                </div>

                <button
                    onClick={() => openModal()}
                    className="btn btn-primary shadow-lg hover:shadow-primary-500/30 transition-all duration-300 gap-2 px-6"
                >
                    <Plus className="w-5 h-5" />
                    {activeTab === 'drivers' ? 'Registrar Conductor' : 'Registrar Vehículo'}
                </button>
            </div>

            {/* Controls & Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg w-full sm:w-auto">
                    <button
                        onClick={() => setActiveTab('drivers')}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 justify-center
                            ${activeTab === 'drivers' ? 'bg-white dark:bg-gray-600 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <User className="w-4 h-4" /> Conductores
                    </button>
                    <button
                        onClick={() => setActiveTab('vehicles')}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 justify-center
                            ${activeTab === 'vehicles' ? 'bg-white dark:bg-gray-600 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Car className="w-4 h-4" /> Vehículos
                    </button>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="input input-bordered input-sm w-full pl-9 bg-transparent"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="loading loading-spinner loading-lg text-primary-500"></div>
                </div>
            ) : (
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                        visible: { transition: { staggerChildren: 0.05 } }
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                    <AnimatePresence mode="popLayout">
                        {filteredList.map(item => (
                            <motion.div
                                key={item.id}
                                variants={variants}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-gray-700 overflow-hidden"
                            >
                                {/* Active Indicator Strip */}
                                <div className={`absolute top-0 left-0 w-full h-1 ${item.status === 'INACTIVE' ? 'bg-gray-300' : 'bg-gradient-to-r from-primary-400 to-primary-600'}`} />

                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors">
                                            {activeTab === 'drivers' ? <User className="w-6 h-6 text-gray-600 group-hover:text-primary-600" /> : <Car className="w-6 h-6 text-gray-600 group-hover:text-primary-600" />}
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                            <button onClick={() => openModal(item)} className="p-2 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors" title="Editar">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setDeleteConfirm(item.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Eliminar">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {activeTab === 'drivers' ? (
                                        <>
                                            <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-1">{item.first_name} {item.last_name}</h3>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">DNI</p>
                                                <p className="text-sm font-mono bg-gray-50 dark:bg-gray-700 inline-block px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600">{item.dni}</p>
                                            </div>
                                            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                                                <ShieldCheck className="w-4 h-4 text-green-500" />
                                                <span>Licencia: <span className="text-gray-700 dark:text-gray-300 font-medium">{item.license_number || 'N/A'}</span></span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <h3 className="font-bold text-2xl tracking-tight text-gray-900 dark:text-white mb-1 font-mono uppercase">{item.plate_number}</h3>
                                            <p className="text-sm text-gray-500 mb-4">{item.brand} {item.model} • {item.year || '2024'}</p>

                                            <div className="flex items-center justify-between">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${item.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    item.status === 'MAINTENANCE' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                                                    }`}>
                                                    {item.status === 'ACTIVE' ? 'ACTIVO' : item.status === 'MAINTENANCE' ? 'TALLER' : 'INACTIVO'}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {!loading && filteredList.length === 0 && (
                        <div className="col-span-full py-20 text-center">
                            <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-10 h-10 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No se encontraron resultados</h3>
                            <p className="text-gray-500">Intenta ajustar tu búsqueda o crea un nuevo registro.</p>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={`${editingItem ? 'Editar' : 'Registrar'} ${activeTab === 'drivers' ? 'Conductor' : 'Vehículo'}`}
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    {activeTab === 'drivers' ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-control col-span-2">
                                <label className="label-text font-medium mb-1">Empresa Proveedora</label>
                                {isProvider ? (
                                    <input type="text" className="input input-bordered w-full bg-gray-100" value={user.username || 'Mi Empresa'} disabled />
                                ) : (
                                    <select required className="select select-bordered w-full"
                                        value={formData.provider_id || ''} onChange={e => setFormData({ ...formData, provider_id: e.target.value })}>
                                        <option value="">Seleccione Empresa...</option>
                                        {providers.map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
                                    </select>
                                )}
                            </div>
                            <div className="form-control col-span-1">
                                <label className="label-text font-medium mb-1">Nombres</label>
                                <input required placeholder="Ej: Juan Carlos" className="input input-bordered w-full focus:ring-2 ring-primary-500/20"
                                    value={formData.first_name || ''} onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
                            </div>
                            <div className="form-control col-span-1">
                                <label className="label-text font-medium mb-1">Apellidos</label>
                                <input required placeholder="Ej: Pérez Lopez" className="input input-bordered w-full focus:ring-2 ring-primary-500/20"
                                    value={formData.last_name || ''} onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
                            </div>
                            <div className="form-control col-span-2">
                                <label className="label-text font-medium mb-1">DNI / Documento</label>
                                <input required placeholder="12345678" className="input input-bordered w-full font-mono"
                                    value={formData.dni || ''} onChange={e => setFormData({ ...formData, dni: e.target.value })} />
                            </div>
                            <div className="form-control col-span-2">
                                <label className="label-text font-medium mb-1">Licencia de Conducir</label>
                                <input placeholder="A-IIb" className="input input-bordered w-full"
                                    value={formData.license_number || ''} onChange={e => setFormData({ ...formData, license_number: e.target.value })} />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {!isProvider && (
                                <div className="form-control col-span-2">
                                    <label className="label-text font-medium mb-1">Empresa Proveedora</label>
                                    <select required className="select select-bordered w-full"
                                        value={formData.provider_id || ''} onChange={e => setFormData({ ...formData, provider_id: e.target.value })}>
                                        <option value="">Seleccione Empresa...</option>
                                        {providers.map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="form-control col-span-2">
                                <label className="label-text font-medium mb-1">Placa / Patente</label>
                                <input required placeholder="ABC-123" className="input input-bordered w-full font-mono text-lg uppercase tracking-widest text-center"
                                    value={formData.plate_number || ''} onChange={e => setFormData({ ...formData, plate_number: e.target.value })} />
                            </div>
                            <div className="form-control col-span-1">
                                <label className="label-text font-medium mb-1">Marca</label>
                                <input placeholder="Toyota" className="input input-bordered w-full"
                                    value={formData.brand || ''} onChange={e => setFormData({ ...formData, brand: e.target.value })} />
                            </div>
                            <div className="form-control col-span-1">
                                <label className="label-text font-medium mb-1">Modelo</label>
                                <input placeholder="Yaris" className="input input-bordered w-full"
                                    value={formData.model || ''} onChange={e => setFormData({ ...formData, model: e.target.value })} />
                            </div>
                            <div className="form-control col-span-2">
                                <label className="label-text font-medium mb-1">Estado</label>
                                <select className="select select-bordered w-full"
                                    value={formData.status || 'ACTIVE'} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                    <option value="ACTIVE">✅ Activo (Disponible)</option>
                                    <option value="MAINTENANCE">🔧 En Taller / Mantenimiento</option>
                                    <option value="INACTIVE">🔴 Inactivo (Fuera de servicio)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="modal-action pt-4">
                        <button type="button" onClick={closeModal} className="btn btn-ghost hover:bg-gray-100 dark:hover:bg-gray-700">Cancelar</button>
                        <button type="submit" className="btn btn-primary px-8">
                            <Save className="w-4 h-4 mr-2" /> Guardar
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Delete Modal */}
            <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Eliminación" maxWidth="max-w-sm">
                <div className="text-center p-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">¿Estás seguro?</h3>
                    <p className="text-gray-500 text-sm mb-6">Esta acción no se puede deshacer. Se eliminará el registro permanentemente.</p>

                    <div className="flex gap-3 justify-center">
                        <button onClick={() => setDeleteConfirm(null)} className="btn btn-ghost w-full">Cancelar</button>
                        <button onClick={confirmDelete} className="btn btn-error w-full text-white">Eliminar</button>
                    </div>
                </div>
            </Modal>
        </div >
    )
}

export default TransportFleetPage
