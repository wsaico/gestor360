import { useState, useEffect } from 'react'
import { useAuth } from '@contexts/AuthContext'
import transportService from '@services/transportService'
import organizationService from '@services/organizationService'
import Modal from '@components/Modal'
import {
    Map,
    Plus,
    Edit,
    Trash2,
    Bus,
    Users,
    Building2,
    DollarSign
} from 'lucide-react'

const RoutesPage = () => {
    const { user, station } = useAuth()

    const [routes, setRoutes] = useState([])
    const [organizations, setOrganizations] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Modal State
    const [showModal, setShowModal] = useState(false)
    const [editingRoute, setEditingRoute] = useState(null)
    const [formData, setFormData] = useState({
        name: '',
        organization_id: '',
        billing_type: 'FIXED_ROUTE',
        base_price: 0,
        active: true
    })

    useEffect(() => {
        if (station?.id) {
            loadData()
        } else {
            setLoading(false)
        }
    }, [station])

    const loadData = async () => {
        try {
            setLoading(true)
            const [routesData, orgsData] = await Promise.all([
                transportService.getRoutes(),
                organizationService.getAll() // Assuming getting all orgs is fine, or filter by station if needed
            ])
            setRoutes(routesData)
            setOrganizations(orgsData)
        } catch (err) {
            console.error('Error loading data:', err)
            setError('Error al cargar la información')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            setLoading(true)
            const data = {
                ...formData,
                station_id: station.id // Force current station
            }

            if (editingRoute) {
                await transportService.updateRoute(editingRoute.id, data)
            } else {
                await transportService.createRoute(data)
            }

            setShowModal(false)
            loadData()
            resetForm()
        } catch (err) {
            console.error('Error saving route:', err)
            alert('Error al guardar la ruta')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('¿Está seguro de eliminar esta ruta?')) return
        try {
            await transportService.deleteRoute(id)
            setRoutes(prev => prev.filter(r => r.id !== id))
        } catch (err) {
            console.error('Error deleting:', err)
            alert('Error al eliminar')
        }
    }

    const resetForm = () => {
        setFormData({
            name: '',
            organization_id: '',
            billing_type: 'FIXED_ROUTE',
            base_price: 0,
            active: true
        })
        setEditingRoute(null)
    }

    const openModal = (route = null) => {
        if (route) {
            setEditingRoute(route)
            setFormData({
                name: route.name,
                organization_id: route.organization_id,
                billing_type: route.billing_type,
                base_price: route.base_price,
                active: route.active
            })
        } else {
            resetForm()
        }
        setShowModal(true)
    }

    if (!station) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <Bus className="w-16 h-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-700">Seleccione una Estación</h2>
            <p className="text-gray-500">Debe seleccionar una sede para gestionar sus rutas.</p>
        </div>
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Map className="w-8 h-8 text-primary-600" />
                        Rutas de Transporte
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Tarifario y configuración de rutas para {station.name}
                    </p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="btn btn-primary flex items-center gap-2 shadow-lg"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Ruta
                </button>
            </div>

            {/* Content */}
            {loading && !showModal ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {routes.map(route => (
                        <div key={route.id} className="card p-5 hover:shadow-lg transition-all border-l-4 border-primary-500">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-primary-50 dark:bg-primary-900/20 p-2 rounded-lg text-primary-600 dark:text-primary-400">
                                    <Bus className="w-6 h-6" />
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openModal(route)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(route.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                {route.name}
                            </h3>

                            <div className="space-y-2 mt-4 text-sm">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <Building2 className="w-4 h-4" />
                                    <span className="font-medium">{route.organization?.name || 'Sin Organización'}</span>
                                </div>

                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <DollarSign className="w-4 h-4" />
                                    <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200">
                                        {route.billing_type === 'FIXED_ROUTE' ?
                                            `S/ ${route.base_price} (Fijo)` :
                                            `S/ ${route.base_price} x Pasajero`
                                        }
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                                <span>{route.billing_type === 'FIXED_ROUTE' ? 'Ruta Fija' : 'Por Demanda'}</span>
                                <span className={`px-2 py-0.5 rounded-full ${route.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {route.active ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                        </div>
                    ))}

                    {routes.length === 0 && (
                        <div className="col-span-full card p-12 text-center text-gray-400">
                            <Map className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>No hay rutas configuradas</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingRoute ? 'Editar Ruta' : 'Nueva Ruta'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Nombre de la Ruta</label>
                        <input
                            type="text"
                            className="input"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ej: Jauja - Aeropuerto (Mañana)"
                        />
                    </div>

                    <div>
                        <label className="label">Organización / Cliente</label>
                        <select
                            className="input"
                            required
                            value={formData.organization_id}
                            onChange={e => setFormData({ ...formData, organization_id: e.target.value })}
                        >
                            <option value="">Seleccione...</option>
                            {organizations.map(org => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Tipo de Cobro</label>
                            <select
                                className="input"
                                value={formData.billing_type}
                                onChange={e => setFormData({ ...formData, billing_type: e.target.value })}
                            >
                                <option value="FIXED_ROUTE">Precio Fijo (Por Ruta)</option>
                                <option value="PER_PASSENGER">Por Pasajero</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">
                                {formData.billing_type === 'FIXED_ROUTE' ? 'Costo Total (S/)' : 'Costo x Persona (S/)'}
                            </label>
                            <input
                                type="number"
                                step="0.10"
                                className="input"
                                required
                                min="0"
                                value={formData.base_price}
                                onChange={e => setFormData({ ...formData, base_price: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                        <input
                            type="checkbox"
                            id="active"
                            className="w-4 h-4 text-primary-600 rounded"
                            checked={formData.active}
                            onChange={e => setFormData({ ...formData, active: e.target.checked })}
                        />
                        <label htmlFor="active" className="text-gray-700 dark:text-gray-300 font-medium select-none">
                            Ruta Activa
                        </label>
                    </div>

                    <div className="modal-actions">
                        <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Ruta'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

export default RoutesPage
