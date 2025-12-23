import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@contexts/AuthContext'
import transportService from '@services/transportService'
import transportReportService from '@services/transportReportService'
import { Map, RefreshCw, FileText, Download } from 'lucide-react'

const TransportAuditPage = () => {
    const { station } = useAuth()
    const [vehicles, setVehicles] = useState([])
    const [loading, setLoading] = useState(true)
    const [generatingReport, setGeneratingReport] = useState(false)

    // Map Config
    const mapContainerRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const markersRef = useRef({}) // Store markers by scheduleId
    const polylinesRef = useRef({}) // Store paths by scheduleId

    // ... (useEffect remains same) ...

    useEffect(() => {
        if (!station) return

        // Initialize Map
        if (!mapInstanceRef.current && mapContainerRef.current && window.L) {
            const map = window.L.map(mapContainerRef.current).setView([-12.0464, -77.0428], 12)

            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map)

            mapInstanceRef.current = map
        }

        loadActiveTrips()

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove()
                mapInstanceRef.current = null
            }
        }
    }, [station])

    const loadActiveTrips = async () => {
        try {
            setLoading(true)
            // Fetch IN_PROGRESS schedules
            const schedules = await transportService.getSchedules({
                stationId: station.id,
                dateFrom: new Date().toISOString().split('T')[0], // Only today
                dateTo: new Date().toISOString().split('T')[0]
            })

            const active = schedules.filter(s => s.status === 'IN_PROGRESS')
            setVehicles(active)

            // Initial Plot
            active.forEach(trip => {
                updateMapForTrip(trip.id, trip.execution?.gps_track, trip.provider?.username || 'Conductor')
                subscribeToTrip(trip.id)
            })

            setLoading(false)
        } catch (error) {
            console.error('Error loading trips:', error)
            setLoading(false)
        }
    }

    const handleDownloadReport = async () => {
        try {
            setGeneratingReport(true)
            const today = new Date().toISOString().split('T')[0]

            // Fetch ALL schedules for today (Completed included)
            const schedules = await transportService.getSchedules({
                stationId: station.id,
                dateFrom: today,
                dateTo: today
            })

            // Filter for display in report (Completed usually, but maybe all?)
            // Doc says "Liquidación", implying completed. But showing all is better for audit.
            // Let's pass all to the service.

            transportReportService.generateDailyReport(schedules, station, new Date())

            setGeneratingReport(false)
        } catch (error) {
            console.error("Error generating report", error)
            alert("Error al generar reporte")
            setGeneratingReport(false)
        }
    }

    // ... (subscribeToTrip and updateMapForTrip remain same) ...

    // ... (updateMapForTrip implementation) ...

    // Re-inserting the missing helper functions to ensure file integrity since we are responding to a large block
    const subscribeToTrip = (scheduleId) => {
        transportService.subscribeToExecution(scheduleId, (newExecutionData) => {
            if (newExecutionData.gps_track) {
                const trip = vehicles.find(v => v.id === scheduleId)
                const name = trip?.provider?.username || 'Conductor'
                updateMapForTrip(scheduleId, newExecutionData.gps_track, name)
            }
        })
    }

    const updateMapForTrip = (id, track = [], name) => {
        if (!mapInstanceRef.current || !window.L) return
        if (!track || track.length === 0) return

        const lastPoint = track[track.length - 1]
        const latLng = [lastPoint.lat, lastPoint.lng]

        if (markersRef.current[id]) {
            markersRef.current[id].setLatLng(latLng)
        } else {
            const marker = window.L.marker(latLng)
                .addTo(mapInstanceRef.current)
                .bindPopup(`<b>${name}</b><br>En Ruta`)
            markersRef.current[id] = marker
        }

        const path = track.map(p => [p.lat, p.lng])
        if (polylinesRef.current[id]) {
            polylinesRef.current[id].setLatLngs(path)
        } else {
            const polyline = window.L.polyline(path, { color: 'blue' }).addTo(mapInstanceRef.current)
            polylinesRef.current[id] = polyline
        }
    }


    if (!station) return <div>Seleccione una estación</div>

    return (
        <div className="flex flex-col h-[calc(100vh-100px)]">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Map className="w-6 h-6 text-primary-600" />
                        Auditoría en Vivo
                    </h1>
                    <p className="text-sm text-gray-500">
                        {vehicles.length} vehículos en ruta
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleDownloadReport}
                        disabled={generatingReport}
                        className="btn btn-sm btn-outline gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        {generatingReport ? 'Generando...' : 'Reporte Diario'}
                    </button>
                    <button
                        onClick={loadActiveTrips}
                        className="btn btn-sm btn-ghost gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                </div>
            </div>

            <div className="flex-1 card p-0 overflow-hidden relative border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
                {!window.L && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                        Cargando mapa... (Si no carga, verifique su conexión a internet)
                    </div>
                )}
                <div
                    ref={mapContainerRef}
                    className="w-full h-full z-0"
                    style={{ minHeight: '400px' }}
                />

                {/* Overlay List */}
                <div className="absolute top-4 right-4 w-64 bg-white/90 backdrop-blur dark:bg-gray-800/90 p-4 rounded-lg shadow-xl z-[1000] max-h-[80%] overflow-y-auto">
                    <h3 className="font-bold text-sm mb-2 text-gray-700 dark:text-gray-300">Vehículos Activos</h3>
                    {vehicles.length === 0 ? (
                        <p className="text-xs text-gray-500">No hay vehículos en movimiento.</p>
                    ) : (
                        <ul className="space-y-2">
                            {vehicles.map(v => (
                                <li key={v.id} className="text-xs p-2 bg-white dark:bg-gray-700 rounded border border-gray-100 dark:border-gray-600">
                                    <div className="font-bold text-primary-600">{v.provider?.username}</div>
                                    <div className="text-gray-500 truncate">{v.route?.name}</div>
                                    <div className="mt-1 flex justify-between items-center">
                                        <span className="bg-green-100 text-green-800 px-1.5 rounded-[4px] text-[10px] font-bold">EN RUTA</span>
                                        {v.execution?.gps_track?.length > 0 && (
                                            <span className="text-[10px] text-gray-400">
                                                {new Date(v.execution.gps_track[v.execution.gps_track.length - 1].timestamp).toLocaleTimeString()}
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}

export default TransportAuditPage
