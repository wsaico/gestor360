import { useState, useEffect } from 'react'
import { Clock, Save, Factory } from 'lucide-react'
import { useAuth } from '@contexts/AuthContext'
import stationService from '@services/stationService'
import { ROLES } from '@utils/constants'

const FoodConfigPage = () => {
    const { user, station, hasRole } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [stations, setStations] = useState([])
    const [selectedStationId, setSelectedStationId] = useState(station?.id || '') // Initialize with current station from header
    const [config, setConfig] = useState({
        order_start_time: '00:00',
        order_end_time: '23:59'
    })

    const isGlobalAdmin = hasRole(ROLES.ADMIN)

    useEffect(() => {
        loadData()
    }, [user])

    // Sync selectedStationId when station changes in header (Global Admin selects station)
    useEffect(() => {
        if (station?.id && station.id !== selectedStationId) {
            handleStationChange(station.id)
        }
    }, [station?.id])

    const loadData = async () => {
        try {
            setLoading(true)
            if (isGlobalAdmin) {
                // Load all stations
                const st = await stationService.getAll()
                setStations(st)
                if (st.length > 0) {
                    setSelectedStationId(st[0].id)
                    // Fetch that station's config
                    const fullStation = await stationService.getById(st[0].id)
                    setConfig({
                        order_start_time: fullStation.order_start_time || '00:00',
                        order_end_time: fullStation.order_end_time || '23:59'
                    })
                }
            } else {
                // Load user's station
                if (user?.station_id) {
                    setSelectedStationId(user.station_id)
                    const fullStation = await stationService.getById(user.station_id)
                    setConfig({
                        order_start_time: fullStation.order_start_time || '00:00',
                        order_end_time: fullStation.order_end_time || '23:59'
                    })
                }
            }
        } catch (error) {
            console.error(error)
            alert('Error al cargar configuración')
        } finally {
            setLoading(false)
        }
    }

    // Effect to reload config when station changes (Only Admin)
    const handleStationChange = async (stationId) => {
        setSelectedStationId(stationId)
        try {
            const fullStation = await stationService.getById(stationId)
            setConfig({
                order_start_time: fullStation.order_start_time || '00:00',
                order_end_time: fullStation.order_end_time || '23:59'
            })
        } catch (error) {
            console.error(error)
        }
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            await stationService.update(selectedStationId, {
                order_start_time: config.order_start_time,
                order_end_time: config.order_end_time
            })
            alert('Configuración guardada correctamente')
        } catch (error) {
            console.error(error)
            alert('Error al guardar configuración')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-medium">Cargando configuración...</div>

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-8 h-8 text-primary-600" />
                    Configuración de Alimentación
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    Define los horarios de atención para la toma de pedidos por estación.
                </p>
            </div>

            <div className="card p-6 md:p-8">

                {/* Station Selection */}
                <div className="mb-8">
                    <label className="label">Estación de Trabajo</label>
                    {isGlobalAdmin ? (
                        <div className="relative mt-2">
                            <Factory className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <select
                                className="input pl-10"
                                value={selectedStationId}
                                onChange={(e) => handleStationChange(e.target.value)}
                            >
                                {stations.map(st => (
                                    <option key={st.id} value={st.id}>{st.name}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold mt-2">
                            <Factory className="w-5 h-5 mr-3 text-primary-500" />
                            {user?.station?.name || 'Estación Asignada'}
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700 my-8"></div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="label">Hora de Apertura</label>
                            <input
                                type="time"
                                className="input mt-1"
                                value={config.order_start_time}
                                onChange={e => setConfig({ ...config, order_start_time: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                                Hora a partir de la cual se pueden realizar pedidos.
                            </p>
                        </div>
                        <div>
                            <label className="label">Hora de Cierre</label>
                            <input
                                type="time"
                                className="input mt-1"
                                value={config.order_end_time}
                                onChange={e => setConfig({ ...config, order_end_time: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                                Hora límite diaria para la toma de pedidos.
                            </p>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-xl text-sm border border-blue-100 dark:border-blue-800/50 flex items-start gap-3">
                        <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p>
                            <strong>Nota importante:</strong> Los horarios se validan según la zona horaria de Lima (UTC-5).
                            Asegúrese de ingresar el formato de 24 horas correcto.
                        </p>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={saving} className="btn btn-primary btn-lg flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default FoodConfigPage
