import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@contexts/AuthContext'
import transportService from '@services/transportService'
import organizationService from '@services/organizationService'
import Modal from '@components/Modal'
import {
    Map as MapIcon,
    Plus,
    Edit,
    Trash2,
    Bus,
    Building2,
    DollarSign,
    Search,
    MapPin
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Polyline } from 'react-leaflet'
import L from 'leaflet'

// Fix Leaflet Icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper: Handle Map Clicks
const LocationMarker = ({ position, setPosition, color = 'blue' }) => {
    // ... logic needed to only handle click if "active" mode matches? 
    // Actually, we'll pass the handler from parent to control which state updates.
    return position === null ? null : (
        <Marker position={position}></Marker>
    )
}

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
        active: true,
        // Destination
        destination_lat: null,
        destination_lng: null,
        destination_address: '',
        // Origin
        origin_lat: null,
        origin_lng: null,
        origin_address: ''
    })

    // Map Editing State
    const [activeField, setActiveField] = useState('destination') // 'origin' or 'destination'
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearching, setIsSearching] = useState(false)

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
                organizationService.getAll()
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

    // Click Handler Wrapper
    const MapClickHandler = () => {
        const map = useMap()
        useMapEvents({
            click(e) {
                const { lat, lng } = e.latlng
                if (activeField === 'origin') {
                    setFormData(prev => ({ ...prev, origin_lat: lat, origin_lng: lng }))
                } else {
                    setFormData(prev => ({ ...prev, destination_lat: lat, destination_lng: lng }))
                }
                map.flyTo(e.latlng, map.getZoom())
            },
        })

        useEffect(() => {
            // Adjust map view to fit both markers if both are set
            if (formData.origin_lat && formData.destination_lat) {
                const bounds = L.latLngBounds(
                    [formData.origin_lat, formData.origin_lng],
                    [formData.destination_lat, formData.destination_lng]
                );
                map.fitBounds(bounds, { padding: [50, 50] });
            } else if (formData.origin_lat) {
                map.flyTo([formData.origin_lat, formData.origin_lng], map.getZoom());
            } else if (formData.destination_lat) {
                map.flyTo([formData.destination_lat, formData.destination_lng], map.getZoom());
            }
        }, [formData.origin_lat, formData.origin_lng, formData.destination_lat, formData.destination_lng, map]);

        return null
    }

    const handleSearchAddress = async () => {
        if (!searchQuery) return
        setIsSearching(true)
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`)
            const data = await response.json()
            if (data && data.length > 0) {
                const first = data[0]
                const lat = parseFloat(first.lat)
                const lng = parseFloat(first.lon)

                if (activeField === 'origin') {
                    setFormData(prev => ({
                        ...prev,
                        origin_lat: lat,
                        origin_lng: lng,
                        origin_address: first.display_name
                    }))
                } else {
                    setFormData(prev => ({
                        ...prev,
                        destination_lat: lat,
                        destination_lng: lng,
                        destination_address: first.display_name
                    }))
                }
            } else {
                alert('No se encontraron resultados')
            }
        } catch (e) {
            alert('Error buscando dirección')
        } finally {
            setIsSearching(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            setLoading(true)
            const data = {
                ...formData,
                station_id: station.id
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
            active: true,
            destination_lat: -11.7752, // Default Jauja
            destination_lng: -75.4983,
            destination_address: '',
            origin_lat: -11.7752,
            origin_lng: -75.4983,
            origin_address: ''
        })
        setSearchQuery('')
        setEditingRoute(null)
        setActiveField('destination') // Reset active field
    }

    const openModal = (route = null) => {
        if (route) {
            setEditingRoute(route)
            setFormData({
                name: route.name,
                organization_id: route.organization_id,
                billing_type: route.billing_type,
                base_price: route.base_price,
                active: route.active,
                destination_lat: route.destination_lat || -11.7752,
                destination_lng: route.destination_lng || -75.4983,
                destination_address: route.destination_address || '',
                origin_lat: route.origin_lat || -11.7752,
                origin_lng: route.origin_lng || -75.4983,
                origin_address: route.origin_address || ''
            })
            setSearchQuery(route.destination_address || '') // Default search to destination
            setActiveField('destination') // Default active field to destination
        } else {
            resetForm()
        }
        setShowModal(true)
    }

    // Custom icons for origin and destination
    const originIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const destinationIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

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
                        <MapIcon className="w-8 h-8 text-primary-600" />
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
                                    <MapPin className="w-4 h-4" />
                                    <span className="truncate max-w-[200px]" title={route.destination_address}>
                                        {route.destination_address || 'Sin Dirección'}
                                    </span>
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
                            <MapIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>No hay rutas configuradas</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal - Wide for Map */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingRoute ? 'Editar Ruta' : 'Nueva Ruta'}
                maxWidth="max-w-6xl"
            >
                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* LEFT: Form Inputs */}
                    <div className="space-y-4">
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

                        {/* Address Search & Toggles */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">

                            {/* Toggle Origin/Destination */}
                            <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                                <button
                                    type="button"
                                    onClick={() => { setActiveField('origin'); setSearchQuery(formData.origin_address || '') }}
                                    className={`flex-1 py-1 px-3 rounded-md text-sm font-bold transition-all ${activeField === 'origin' ? 'bg-white text-green-600 shadow' : 'text-gray-500'}`}
                                >
                                    Punto A (Origen)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setActiveField('destination'); setSearchQuery(formData.destination_address || '') }}
                                    className={`flex-1 py-1 px-3 rounded-md text-sm font-bold transition-all ${activeField === 'destination' ? 'bg-white text-blue-600 shadow' : 'text-gray-500'}`}
                                >
                                    Punto B (Destino)
                                </button>
                            </div>

                            <label className="label flex items-center gap-2">
                                <Search className="w-4 h-4" />
                                {activeField === 'origin' ? 'Buscar Dirección de Origen' : 'Buscar Dirección de Destino'}
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="input flex-1"
                                    placeholder={activeField === 'origin' ? "Ej: Hotel Laguna" : "Ej: Aeropuerto Jauja"}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    // Update address text on type (don't wait for search)
                                    onBlur={e => {
                                        if (activeField === 'origin') setFormData(p => ({ ...p, origin_address: e.target.value }))
                                        else setFormData(p => ({ ...p, destination_address: e.target.value }))
                                    }}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearchAddress())}
                                />
                                <button
                                    type="button"
                                    onClick={handleSearchAddress}
                                    disabled={isSearching}
                                    className="btn btn-secondary px-4"
                                >
                                    {isSearching ? '...' : 'Buscar'}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">
                                {activeField === 'origin' ?
                                    'Click en el mapa para fijar el PUNTO DE RECOJO (Pin Verde)' :
                                    'Click en el mapa para fijar el PUNTO DE DESTINO (Pin Azul)'}
                            </p>
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
                    </div>

                    {/* RIGHT: Map Picker */}
                    <div className="h-[400px] lg:h-auto min-h-[400px] bg-gray-100 rounded-xl overflow-hidden relative border border-gray-300 shadow-inner">
                        <MapContainer
                            center={[formData.destination_lat || -11.7752, formData.destination_lng || -75.4983]}
                            zoom={14}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer
                                attribution='&copy; OpenStreetMap contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <MapClickHandler />

                            {/* Origin Marker (Greenish?) - Leaflet default is Blue, we might need a custom icon or just use distinct popups */}
                            {formData.origin_lat && (
                                <Marker position={[formData.origin_lat, formData.origin_lng]} icon={originIcon}>
                                    <L.Popup>ORIGEN: {formData.origin_address}</L.Popup>
                                </Marker>
                            )}

                            {/* Destination Marker */}
                            {formData.destination_lat && (
                                <Marker position={[formData.destination_lat, formData.destination_lng]} icon={destinationIcon}>
                                    <L.Popup>DESTINO: {formData.destination_address}</L.Popup>
                                </Marker>
                            )}

                            {/* Polyline between origin and destination */}
                            {formData.origin_lat && formData.destination_lat && (
                                <Polyline
                                    positions={[
                                        [formData.origin_lat, formData.origin_lng],
                                        [formData.destination_lat, formData.destination_lng]
                                    ]}
                                    color="purple"
                                    weight={3}
                                    opacity={0.7}
                                />
                            )}
                        </MapContainer>

                        <div className="absolute top-2 right-2 flex flex-col gap-2 z-[1000] pointer-events-none">
                            <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold shadow text-green-700">
                                {formData.origin_lat ? "Origen Fijado" : "Falta Origen"}
                            </div>
                            <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold shadow text-blue-700">
                                {formData.destination_lat ? "Destino Fijado" : "Falta Destino"}
                            </div>
                        </div>
                    </div>

                    <div className="col-span-full border-t border-gray-100 dark:border-gray-700 pt-6 flex justify-end gap-3">
                        <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary px-8" disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Ruta'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

export default RoutesPage
