import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@contexts/AuthContext'
import { useNotification } from '@contexts/NotificationContext'
import transportService from '@services/transportService'
import employeeService from '@services/employeeService'
import {
    CheckCircle,
    X,
    Clock,
    Play,
    Square,
    Calendar,
    Moon,
    Sun,
    UserCircle,
    WifiOff,
    Map as MapIcon,
    List,
    Camera,
    Car,
    LogOut,
    Zap,
    ZapOff
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Swal from 'sweetalert2'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Html5Qrcode } from 'html5-qrcode'

// Fix Leaflet Default Icon in Vite/Webpack
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;


// --- HELPER COMPONENTS ---

const MapView = ({ location, destination }) => {
    const mapRef = useRef(null)

    // Component to update map center when location changes
    const RecenterMap = ({ lat, lng }) => {
        const map = useMap();
        useEffect(() => {
            if (lat && lng) {
                map.setView([lat, lng], map.getZoom());
            }
        }, [lat, lng, map]);
        return null;
    }

    // Default to Jauja / Aeropuerto area if location is practically null
    const displayLoc = location || { lat: -11.7752, lng: -75.4983 }

    return (
        <div className="h-full w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
            <MapContainer
                center={[displayLoc.lat, displayLoc.lng]}
                zoom={15}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                ref={mapRef}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[displayLoc.lat, displayLoc.lng]}>
                    <Popup>{location ? "Tu Ubicación" : "Ubicación Estimada (Esperando GPS...)"}</Popup>
                </Marker>
                <RecenterMap lat={displayLoc.lat} lng={displayLoc.lng} />
            </MapContainer>
        </div>
    )
}

const SlideButton = ({ onComplete, label, icon: Icon, colorClass = "bg-primary-600", disabled = false }) => {
    const [dragX, setDragX] = useState(0)
    const containerRef = useRef(null)
    const [completed, setCompleted] = useState(false)

    const handleDrag = (event, info) => {
        if (!containerRef.current) return
        const width = containerRef.current.offsetWidth - 56 // button width
        if (info.point.x > width - 20) {
            if (!completed) {
                setCompleted(true)
                if (navigator.vibrate) navigator.vibrate(50)
                onComplete()
            }
        }
        setDragX(info.point.x)
    }

    const handleDragEnd = () => {
        if (!completed) setDragX(0)
    }

    // Reset button if action cancelled
    useEffect(() => {
        if (completed) {
            const timer = setTimeout(() => {
                setCompleted(false)
                setDragX(0)
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [completed])

    return (
        <div ref={containerRef} className={`relative h-16 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden shadow-inner flex items-center ${disabled ? 'opacity-50' : ''}`}>
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-bold uppercase tracking-wider text-sm pointer-events-none">
                {label} &gt;&gt;&gt;
            </div>
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: containerRef.current ? containerRef.current.offsetWidth - 60 : 200 }}
                dragElastic={0}
                dragMomentum={false}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                animate={{ x: completed ? (containerRef.current ? containerRef.current.offsetWidth - 60 : 200) : dragX }}
                className={`absolute left-1 top-1 w-14 h-14 rounded-full ${colorClass} text-white flex items-center justify-center shadow-lg z-10 cursor-grab active:cursor-grabbing`}
            >
                <Icon className="w-6 h-6" />
            </motion.div>
        </div>
    )
}

const DriverSelector = ({ onSelect, providerId }) => {
    const [drivers, setDrivers] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const data = await transportService.getDrivers(providerId)
                setDrivers(data)
            } finally { setLoading(false) }
        }
        load()
    }, [providerId])

    return (
        <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center p-6 text-white text-center">
            <h1 className="text-3xl font-bold mb-2">🚗 Gestor360°</h1>
            <p className="text-gray-400 mb-8">¿Quién está conduciendo hoy?</p>

            {loading ? (
                <div className="loading loading-spinner loading-lg text-primary-500"></div>
            ) : (
                <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                    {drivers.map(d => (
                        <button
                            key={d.id}
                            onClick={() => onSelect(d)}
                            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl p-6 flex flex-col items-center gap-3 transition-all active:scale-95"
                        >
                            <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center text-2xl font-bold">
                                {d?.first_name?.charAt(0) || '?'}
                            </div>
                            <span className="font-medium text-lg">{d.first_name}</span>
                        </button>
                    ))}
                    {drivers.length === 0 && (
                        <div className="col-span-2 text-gray-500 bg-slate-800 p-4 rounded-xl">
                            No hay conductores registrados. Contacte al administrador.
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

const CameraScannerModal = ({ onClose, onScan, darkMode }) => {
    const [scannerError, setScannerError] = useState(null)
    const [torch, setTorch] = useState(false)
    const [hasTorch, setHasTorch] = useState(false)
    const scannerRef = useRef(null)
    const onScanRef = useRef(onScan)

    // Sincronizar el ref con el callback más reciente sin disparar el effect
    useEffect(() => {
        onScanRef.current = onScan
    }, [onScan])

    useEffect(() => {
        const scannerId = "reader"
        const html5QrCode = new Html5Qrcode(scannerId)
        scannerRef.current = html5QrCode

        const startScanner = async () => {
            try {
                // Configuración de ALTO RENDIMIENTO
                const config = {
                    fps: 20, // Más frames para detección rápida
                    qrbox: (viewWidth, viewHeight) => {
                        // Área de escaneo más grande y flexible
                        const size = Math.min(viewWidth, viewHeight) * 0.8
                        return { width: size, height: size }
                    },
                    aspectRatio: 1.0,
                    // Solicitar resolución HD explícitamente para nitidez
                    videoConstraints: {
                        facingMode: "environment",
                        width: { min: 1280, ideal: 1920 },
                        height: { min: 720, ideal: 1080 },
                        frameRate: { ideal: 30 }
                    }
                }

                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        if (onScanRef.current) onScanRef.current(decodedText)
                    },
                    () => { /* Frame fail flow */ }
                )

                // Aplicar capacidades avanzadas (Foco y Flash) tras un breve delay
                setTimeout(() => {
                    try {
                        const capabilities = html5QrCode.getRunningTrackCapabilities()
                        console.log("Scanner Capabilities:", capabilities)

                        if (capabilities.torch) setHasTorch(true)

                        // Forzar Auto-Enfoque Continuo si está disponible
                        if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                            html5QrCode.applyVideoConstraints({
                                focusMode: 'continuous'
                            }).catch(e => console.error("Error setting focus mode:", e))
                        }
                    } catch (e) {
                        console.warn("Advanced constraints not supported on this device", e)
                    }
                }, 2000)

            } catch (err) {
                console.error("Error al iniciar el escáner:", err)
                let msg = "Error al acceder a la cámara"
                if (err.name === 'NotAllowedError') msg = "Permiso de cámara denegado"
                if (err.name === 'NotFoundError') msg = "No se encontró ninguna cámara HD"
                setScannerError(msg)
            }
        }

        const timer = setTimeout(startScanner, 400)

        return () => {
            clearTimeout(timer)
            if (html5QrCode.isScanning) {
                html5QrCode.stop()
                    .then(() => html5QrCode.clear())
                    .catch(e => console.error("Error al detener el escáner:", e))
            }
        }
    }, []) // Solo se ejecuta al montar

    const toggleTorch = async () => {
        if (!scannerRef.current || !scannerRef.current.isScanning) return
        try {
            const newState = !torch
            await scannerRef.current.applyVideoConstraints({
                advanced: [{ torch: newState }]
            })
            setTorch(newState)
        } catch (e) {
            console.error("Error toggling torch:", e)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/98 flex flex-col items-center justify-center p-4 backdrop-blur-xl">
            {/* Botón de cierre superior */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
                <button
                    onClick={onClose}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all active:scale-90"
                >
                    <X className="w-8 h-8" />
                </button>

                {hasTorch && (
                    <button
                        onClick={toggleTorch}
                        className={`p-3 rounded-2xl transition-all active:scale-90 ${torch ? 'bg-yellow-400 text-black' : 'bg-white/10 text-white'}`}
                    >
                        {torch ? <Zap className="w-8 h-8" /> : <ZapOff className="w-8 h-8" />}
                    </button>
                )}
            </div>

            <div className="text-center mb-10 relative">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
                <h2 className="text-white text-3xl font-bold mb-3 tracking-tight">Escaneo Activo</h2>
                <p className="text-gray-400 text-base max-w-[280px] mx-auto leading-relaxed">
                    Coloque el código de barras o QR dentro del recuadro para registrarlo.
                </p>
            </div>

            <div className="relative w-full max-w-[340px] aspect-square bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] border-[6px] border-slate-800">
                <div id="reader" className="w-full h-full"></div>

                {/* Overlay dinámico */}
                <div className="absolute inset-0 pointer-events-none">
                    {/* Esquineras */}
                    <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-primary-500 rounded-tl-lg"></div>
                    <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-primary-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-primary-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-primary-500 rounded-br-lg"></div>

                    {/* Línea de escaneo */}
                    {!scannerError && (
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-400 to-transparent shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-scan"></div>
                    )}
                </div>

                {scannerError && (
                    <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                            <Camera className="w-8 h-8 text-red-500" />
                        </div>
                        <p className="text-white font-bold text-lg mb-2">Cámara no disponible</p>
                        <p className="text-red-400/80 text-sm mb-8 leading-relaxed">{scannerError}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold transition-colors shadow-lg shadow-primary-900/40 active:scale-95"
                        >
                            Reintentar Conexión
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-16 text-primary-500/50 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">
                Auto-enfoque habilitado
            </div>
        </div>
    )
}

const TripSummaryModal = ({ schedule, passengers, onClose, darkMode }) => {
    const exec = schedule.execution || {}
    const checkIns = exec.check_ins || [] // Array of { employee_id, timestamp }
    const startTime = exec.start_time ? new Date(exec.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'
    const endTime = exec.end_time ? new Date(exec.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={onClose} />
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className={`relative w-full max-w-md ${darkMode ? 'bg-slate-900 border-t border-slate-700' : 'bg-white'} rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl pointer-events-auto max-h-[90vh] flex flex-col`}
            >
                <div className="p-6 shrink-0 border-b border-gray-100 dark:border-slate-800">
                    <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-6" />
                    <h2 className="text-2xl font-bold">Resumen de Viaje</h2>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{schedule.route?.name}</p>

                    {/* Driver & Vehicle Info */}
                    <div className="flex gap-4 mt-4">
                        <div className={`flex-1 p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-gray-50'} flex items-center gap-3`}>
                            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
                                {schedule.driver?.first_name?.charAt(0) || '?'}
                            </div>
                            <div>
                                <p className="text-[10px] uppercase opacity-50 font-bold">Conductor</p>
                                <p className="font-bold text-sm truncate">{schedule.driver?.first_name || 'Desconocido'}</p>
                            </div>
                        </div>
                        <div className={`flex-1 p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-gray-50'} flex items-center gap-3`}>
                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold">
                                <Car className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase opacity-50 font-bold">Vehículo</p>
                                <p className="font-bold text-sm truncate">{schedule.vehicle?.plate_number || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                        <div className="text-center">
                            <p className="text-xs text-gray-500 uppercase">Inicio</p>
                            <p className="font-mono font-bold text-lg">{startTime}</p>
                        </div>
                        <div className="text-gray-300">➜</div>
                        <div className="text-center">
                            <p className="text-xs text-gray-500 uppercase">Fin</p>
                            <p className="font-mono font-bold text-lg">{endTime}</p>
                        </div>
                        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-2" />
                        <div className="text-center">
                            <p className="text-xs text-gray-500 uppercase">Asistencia</p>
                            <p className="font-mono font-bold text-lg text-primary-500">
                                {checkIns.length}/{schedule.passengers_manifest?.length || 0}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {passengers.map(p => {
                        const checkInRecord = checkIns.find(c => c.employee_id === p.id)
                        const isPresent = !!checkInRecord
                        const time = checkInRecord ? new Date(checkInRecord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'

                        return (
                            <div key={p.id} className={`p-3 rounded-xl flex items-center justify-between ${darkMode ? 'bg-slate-800' : 'bg-gray-50'} ${!isPresent ? 'opacity-50' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isPresent ? 'bg-green-500 text-white' : 'bg-gray-300 dark:bg-gray-700'}`}>
                                        {isPresent ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{p.full_name}</p>
                                        <p className="text-xs opacity-60">{p.dni}</p>
                                    </div>
                                </div>
                                {isPresent && (
                                    <div className="text-right">
                                        <p className="text-[10px] opacity-50 uppercase font-bold">Subió</p>
                                        <p className="font-mono font-bold text-sm text-green-500">{time}</p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                <div className="p-4 shrink-0">
                    <button onClick={onClose} className="w-full py-4 rounded-xl font-bold bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                        Cerrar
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

const DriverDashboard = () => {
    const { user, loading: authLoading } = useAuth()
    const { notify } = useNotification()
    const [activeDriver, setActiveDriver] = useState(null)
    const [kioskMode, setKioskMode] = useState(false)
    const [viewMode, setViewMode] = useState('list') // 'list', 'detail', 'map'
    const [schedules, setSchedules] = useState([])
    const [activeSchedule, setActiveSchedule] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [location, setLocation] = useState(null) // { lat, lng }
    const [darkMode, setDarkMode] = useState(true)
    const [showScanner, setShowScanner] = useState(false)
    const [checkedPax, setCheckedPax] = useState([])
    const [passengers, setPassengers] = useState([]) // For current trip

    // GPS Watch ID
    const watchIdRef = useRef(null)
    const lastServerUpdate = useRef(0)

    // Kiosk Session Check
    useEffect(() => {
        const checkSession = () => {
            const stored = localStorage.getItem('kiosk_driver')
            if (stored) {
                try {
                    const driver = JSON.parse(stored)
                    setActiveDriver(driver)
                    setKioskMode(true)
                } catch (e) {
                    console.error("Invalid kiosk session", e)
                    localStorage.removeItem('kiosk_driver')
                }
            }
        }
        checkSession()
    }, [])

    // Legacy Auth Check (if not kiosk)
    useEffect(() => {
        if (!authLoading && !user && !kioskMode) {
            // If strictly protected route, this might redirect, 
            // but for kiosk flow we handle it gracefully or let AppRoutes handle redirect if needed.
        }
    }, [authLoading, user, kioskMode])

    const handleLogout = () => {
        if (kioskMode) {
            localStorage.removeItem('kiosk_driver')
            window.location.href = '/transport/driver-login'
        }
    }
    const [summarySchedule, setSummarySchedule] = useState(null)
    const [summaryPax, setSummaryPax] = useState([]) // Pax details for summary

    // UI State
    // const [darkMode, setDarkMode] = useState(true) // Default to dark for drivers - already declared above
    // const [loading, setLoading] = useState(false) - already declared above
    const [gpsActive, setGpsActive] = useState(false)
    const [currentLocation, setCurrentLocation] = useState(null)
    const [offlineQueueSize, setOfflineQueueSize] = useState(0)

    // Refs
    // const watchId = useRef(null) - changed to watchIdRef
    // const lastServerUpdate = useRef(0) - already declared above

    // --- INITIALIZATION ---
    useEffect(() => {
        // Dark Mode Injection
        if (darkMode) document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
    }, [darkMode])

    useEffect(() => {
        if (!activeDriver) return

        const fetchSchedules = async () => {
            try {
                setLoading(true)
                // If Kiosk/Driver Mode, fetch ALL todays trips for this driver
                // Filter is handled in getSchedules mostly, but we need robust check
                const today = new Date().toISOString().split('T')[0]

                // We use the general `getSchedules` but filtered by date and provider? 
                // Wait, `get_transport_schedules` filters by `auth.uid()`. 
                // Kiosk user is NOT auth.uid(). Kiosk user is ANON or GENERIC.
                // We need `transportService` to handle "fetch my trips" by DriverID.
                // Currently `getSchedules` uses `p_provider_id` but RPC filters `s.provider_id = auth.uid()`.
                // WE NEED TO UPDATE THE RPC to allow fetching by DriverID if passed, OR create new RPC.
                // ACTUALLY: The user asked for practical. 
                // FASTEST PATH: `transport_schedules` has `driver_id`.
                // We can just query supabase table directly here IF RLS allows it.
                // Or update `getSchedules` RPC to allow `p_driver_id`.

                // Let's try direct query for now or check RPC. RPC enforces `auth.uid()`.
                // Kiosk runs as ANON/Public? No, Kiosk routes probably need key or anon access.
                // Update: I will use a direct query here for simplicity if RLS allows public read (it might not).
                // BETTER: I'll use a new specific lightweight RPC `get_driver_schedules(driver_id)` or 
                // just assume the `transportService.getSchedules` handles it?
                // `transportService.getSchedules` calls RPC `get_transport_schedules`.

                // FIX: I will add `getDriverSchedules` to `transportService` which queries `transport_schedules` directly 
                // assuming we opened up RLS for "public/anon" or "authenticated" (if header persists).
                // Since Kiosk might be unauthenticated, we need RLS policy or RPC with Security Definer.

                const data = await transportService.getDriverSchedules(activeDriver.id)
                setSchedules(data)

                // Check for In Progress
                const active = data.find(s => s.status === 'IN_PROGRESS')
                if (active) {
                    // Auto-restore
                    await restoreSession(active)
                }
            } catch (err) {
                console.error(err)
                // setError('Error cargando viajes')
            } finally {
                setLoading(false)
            }
        }

        fetchSchedules()

        // Polling every 30s
        const interval = setInterval(fetchSchedules, 30000)
        return () => clearInterval(interval)
    }, [activeDriver])

    const restoreSession = async (schedule) => {
        setActiveSchedule(schedule)
        setViewMode('active')
        // Load Pax using RPC (Safe for drivers)
        try {
            const rawData = await transportService.getPassengersForSchedule(schedule.id)
            // Map RPC pax_id back to id for UI compatibility
            const paxData = rawData.map(p => ({ ...p, id: p.pax_id }))
            setPassengers(paxData)
        } catch (e) {
            console.error("Error loading passengers via RPC:", e)
            // Fallback to manual manifest fetch if RPC fails
            if (schedule.passengers_manifest?.length) {
                try {
                    const results = await Promise.allSettled(schedule.passengers_manifest.map(id => employeeService.getById(id)))
                    const validPax = results
                        .filter(r => r.status === 'fulfilled' && r.value)
                        .map(r => r.value)
                    setPassengers(validPax)
                } catch (e2) { console.error("Critical manifest failure:", e2) }
            }
        }
        startGpsTracking(schedule.execution.id)
    }

    // --- LOGIC ---

    const startGpsTracking = (executionId) => {
        if (!navigator.geolocation) return
        setGpsActive(true)
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const loc = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    speed: pos.coords.speed,
                    timestamp: pos.timestamp
                }
                setCurrentLocation(loc)

                // Throttle Server Updates (10s)
                const now = Date.now()
                if (now - lastServerUpdate.current > 10000) {
                    transportService.updateLocation(executionId, loc).catch(e => console.error(e))
                    lastServerUpdate.current = now
                }
            },
            (err) => {
                // Silenciar timeout errors en desarrollo (localhost no siempre tiene GPS)
                if (err.code !== 3) { // 3 = TIMEOUT
                    console.warn('GPS Error:', err.message)
                }
            },
            { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 }
        )
    }

    const stopGpsTracking = () => {
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
        setGpsActive(false)
    }

    const handleStartTrip = async (schedule) => {
        // Premium Confirmation
        const result = await Swal.fire({
            title: '¿Iniciar Ruta?',
            text: `Destino: ${schedule.route?.name}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3b82f6', // Primary Blue
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, Iniciar',
            cancelButtonText: 'Cancelar',
            background: darkMode ? '#1e293b' : '#fff',
            color: darkMode ? '#fff' : '#000',
            reverseButtons: true
        })

        if (!result.isConfirmed) return

        try {
            // Show Loading Toast
            const loadingToast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timerProgressBar: true,
                background: darkMode ? '#1e293b' : '#fff',
                color: darkMode ? '#fff' : '#000',
            })
            loadingToast.fire({ icon: 'info', title: 'Iniciando GPS...' })

            navigator.geolocation.getCurrentPosition(async (pos) => {
                const startLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: pos.timestamp }
                const execution = await transportService.startExecution(schedule.id, startLoc)

                const updatedSchedule = { ...schedule, status: 'IN_PROGRESS', execution }
                setActiveSchedule(updatedSchedule)
                setViewMode('active')

                // Load Pax via RPC
                try {
                    const paxData = await transportService.getPassengersForSchedule(updatedSchedule.id)
                    setPassengers(paxData)
                } catch (e) {
                    console.error("Error fetching passengers on start:", e)
                }

                startGpsTracking(execution.id)

                // Success Toast
                loadingToast.fire({ icon: 'success', title: '¡Ruta Iniciada!', timer: 2000 })
            }, (error) => {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de GPS',
                    text: 'No se pudo obtener la ubicación. Activelo e intente nuevamente.',
                    background: darkMode ? '#1e293b' : '#fff',
                    color: darkMode ? '#fff' : '#000',
                })
            })
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo iniciar el despacho.',
                background: darkMode ? '#1e293b' : '#fff',
                color: darkMode ? '#fff' : '#000',
            })
        }
    }

    const handleFinishTrip = async () => {
        const result = await Swal.fire({
            title: '¿Finalizar Ruta?',
            text: "Se registrará el cierre del viaje.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444', // Red for stop
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, Finalizar',
            cancelButtonText: 'Cancelar',
            background: darkMode ? '#1e293b' : '#fff',
            color: darkMode ? '#fff' : '#000',
            reverseButtons: true
        })

        if (!result.isConfirmed) return

        try {
            stopGpsTracking()

            // We send the enriched checkedPax objects directly
            const res = await transportService.finishExecutionOfflineSafe(activeSchedule.id, checkedPax)

            if (res.offline) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Modo Offline',
                    text: 'Viaje guardado localmente. Se subirá cuando recupere conexión.',
                    timer: 3000,
                    background: darkMode ? '#1e293b' : '#fff',
                    color: darkMode ? '#fff' : '#000',
                })
            } else {
                Swal.fire({
                    icon: 'success',
                    title: '¡Viaje Finalizado!',
                    timer: 2000,
                    showConfirmButton: false,
                    background: darkMode ? '#1e293b' : '#fff',
                    color: darkMode ? '#fff' : '#000',
                })
            }

            setActiveSchedule(null)
            setViewMode('list')
            setCheckedPax([])
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Hubo un problema al finalizar el viaje.',
                background: darkMode ? '#1e293b' : '#fff',
                color: darkMode ? '#fff' : '#000',
            })
        }
    }

    const processCheckIn = useCallback((pax, status = 'BOARDED') => {
        if (!pax) return

        const alreadyChecked = checkedPax.find(c => c.employee_id === pax.id)
        if (alreadyChecked && alreadyChecked.status === status) return

        const newRecord = {
            employee_id: pax.id,
            status: status,
            timestamp: new Date().toISOString(),
            lat: currentLocation?.lat || null,
            lng: currentLocation?.lng || null
        }

        setCheckedPax(prev => {
            const filtered = prev.filter(c => c.employee_id !== pax.id)
            return [...filtered, newRecord]
        })

        if (status === 'BOARDED') {
            if (navigator.vibrate) navigator.vibrate(200)
            const Toast = Swal.mixin({
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 2000,
                background: '#22c55e',
                color: '#fff'
            })
            Toast.fire({ icon: 'success', title: `REGISTRADO: ${pax.first_name}` })
        } else {
            const Toast = Swal.mixin({
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 2000,
                background: '#f59e0b',
                color: '#fff'
            })
            Toast.fire({ icon: 'info', title: `NO SHOW: ${pax.first_name}` })
        }
    }, [checkedPax, currentLocation])

    const handlePaxAction = (pax) => {
        const record = checkedPax.find(c => c.employee_id === pax.id)

        Swal.fire({
            title: pax.full_name,
            text: 'Seleccione una acción para el pasajero',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Abordó (Check-in)',
            denyButtonText: 'No Show (Faltó)',
            cancelButtonText: 'Cerrar',
            confirmButtonColor: '#22c55e',
            denyButtonColor: '#f59e0b',
            background: darkMode ? '#1e293b' : '#fff',
            color: darkMode ? '#fff' : '#000',
        }).then((result) => {
            if (result.isConfirmed) {
                processCheckIn(pax, 'BOARDED')
            } else if (result.isDenied) {
                processCheckIn(pax, 'NO_SHOW')
            }
        })
    }

    const handleCameraScan = useCallback((code) => {
        if (!code) return
        console.log("Scanner detectó:", code)

        // Buscar pasajero
        const pax = passengers.find(p => p.dni === code)

        if (!pax) {
            console.warn("DNI no encontrado en la lista de pasajeros:", code)
            const Toast = Swal.mixin({
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 2000,
                background: '#4b5563',
                color: '#fff'
            })
            Toast.fire({ icon: 'warning', title: `DNI ${code} no agendado` })
            return
        }

        processCheckIn(pax, 'BOARDED')
    }, [passengers, processCheckIn])


    const handleViewSummary = async (schedule) => {
        if (schedule.status !== 'COMPLETED') return

        // Load Pax Details
        const loadingToast = Swal.mixin({ toast: true, position: 'center', showConfirmButton: false, timerProgressBar: true })
        loadingToast.fire({ icon: 'info', title: 'Cargando detalles...' })

        try {
            let paxData = []
            if (schedule.passengers_manifest?.length) {
                paxData = await Promise.all(schedule.passengers_manifest.map(id => employeeService.getById(id)))
            }
            setSummaryPax(paxData)
            setSummarySchedule(schedule)
            Swal.close() // Close loading toast
        } catch (error) {
            console.error(error)
            Swal.fire('Error', 'No se pudieron cargar los detalles', 'error')
        }
    }

    // --- RENDER ---

    // 1. Selector Overlay
    if (!activeDriver && !kioskMode) {
        if (!user) return <div className="p-10 text-center">Inicie sesión como proveedor para activar el dashboard.</div>
        return <DriverSelector onSelect={setActiveDriver} providerId={user.id} />
    }

    if (!activeDriver && kioskMode) {
        return <div className="p-10 text-center">Error de sesión. <a href="/transport/driver-login" className="underline">Reiniciar</a></div>
    }

    // 2. Main Dashboard
    return (
        <div className={`min-h-screen ${darkMode ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'} transition-colors duration-300 pb-20`}>

            {/* Header / Top Bar */}
            <div className={`p-6 flex justify-between items-center ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        🚗 Hola, {activeDriver.first_name}
                    </h1>
                    <p className="text-xs opacity-60">
                        {kioskMode ? 'Modo Kiosco (DNI)' : 'Portal Conductor'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-gray-200'} transition-all`}>
                        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    {kioskMode && (
                        <button onClick={handleLogout} className="p-2 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                            <LogOut className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content Active vs List */}
            <div className="px-4 mt-4 h-[85vh] flex flex-col">
                <AnimatePresence mode="wait">
                    {(viewMode === 'list' && !activeSchedule) && (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-4"
                        >
                            <h3 className="text-lg font-bold opacity-80">Rutas de Hoy</h3>
                            {schedules.map((schedule, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    key={schedule.id}
                                    onClick={() => handleViewSummary(schedule)}
                                    className={`relative p-5 rounded-[1.5rem] overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-white'} shadow-lg border-l-4 transition-transform active:scale-[0.98] ${schedule.status === 'COMPLETED' ? 'border-gray-500 opacity-60 cursor-pointer' : 'border-primary-500'}`}
                                >
                                    {schedule.status === 'COMPLETED' && (
                                        <div className="absolute right-0 top-0 bg-gray-600 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-lg">Finalizado</div>
                                    )}

                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 text-primary-500 font-bold mb-1">
                                                <Clock className="w-4 h-4" />
                                                {schedule.departure_time.substring(0, 5)}
                                            </div>
                                            <h2 className="text-xl font-bold leading-tight">{schedule.route?.name}</h2>
                                            <p className="text-sm opacity-60 mt-1">{schedule.route?.organization?.name}</p>
                                        </div>
                                    </div>

                                    {schedule.status !== 'COMPLETED' && schedule.status !== 'CANCELLED' && (
                                        <SlideButton
                                            label="Deslizar para Iniciar"
                                            icon={Play}
                                            colorClass="bg-primary-500"
                                            onComplete={() => handleStartTrip(schedule)}
                                        />
                                    )}
                                </motion.div>
                            ))}
                            {schedules.length === 0 && !loading && (
                                <div className="text-center py-20 opacity-40">
                                    <Calendar className="w-20 h-20 mx-auto mb-4" />
                                    <p>No tienes rutas programadas</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {viewMode === 'active' && activeSchedule && (
                        <motion.div
                            key="active"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex flex-col h-full"
                        >
                            {/* Hero active card */}
                            <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden mb-4 shrink-0">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div>
                                        <p className="text-primary-200 text-sm font-medium tracking-wider">RUTAS EN CURSO</p>
                                        <h1 className="text-3xl font-bold mt-1">{activeSchedule.route?.name}</h1>
                                    </div>
                                    {/* Scan Camera Button */}
                                    <div
                                        onClick={() => setShowScanner(true)}
                                        className="bg-white text-primary-600 p-3 rounded-xl shadow-lg cursor-pointer active:scale-95 transition-transform flex items-center gap-2"
                                    >
                                        <Camera className="w-6 h-6" />
                                        <span className="font-bold text-sm">ESCANEAR</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 relative z-10">
                                    <div className="bg-black/20 rounded-xl p-3 flex justify-between items-center group">
                                        <div>
                                            <p className="text-xs text-primary-200">PASAJEROS</p>
                                            <p className="text-2xl font-bold font-mono">{checkedPax.length}/{passengers.length}</p>
                                        </div>
                                    </div>
                                    <div className="bg-black/20 rounded-xl p-3">
                                        <p className="text-xs text-primary-200">HORA SALIDA</p>
                                        <p className="text-2xl font-bold font-mono">{activeSchedule.departure_time.substring(0, 5)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* MAIN CONTENT: MAP OR LIST */}
                            <div className="flex-1 overflow-hidden relative rounded-xl border border-gray-200 dark:border-slate-800">
                                {/* Map/List Toggle Button */}
                                <div className="absolute top-2 right-2 z-10 flex bg-white/90 dark:bg-slate-900/90 p-1 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 backdrop-blur-sm">
                                    <button
                                        onClick={() => setViewMode('active')}
                                        className={`p-2 rounded-lg transition-all ${viewMode === 'active' ? 'bg-primary-500 text-white' : 'text-gray-500'}`}
                                    >
                                        <List className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('map')}
                                        className={`p-2 rounded-lg transition-all ${viewMode === 'map' ? 'bg-primary-500 text-white' : 'text-gray-500'}`}
                                    >
                                        <MapIcon className="w-5 h-5" />
                                    </button>
                                </div>

                                {viewMode === 'map' ? (
                                    <div className="h-full w-full min-h-[400px]">
                                        <MapView
                                            location={currentLocation || { lat: -11.775, lng: -75.500 }} // Fallback to Jauja area if null
                                            destination={null}
                                        />
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col">
                                        <h3 className="text-sm font-bold opacity-60 uppercase tracking-widest mb-3 px-2 pt-2">Manifiesto de Pasajeros</h3>
                                        <div className="flex-1 overflow-y-auto space-y-3 pb-4 noscrollbar px-2">
                                            {passengers.map(p => {
                                                const record = checkedPax.find(c => c.employee_id === p.id)
                                                const isBoarded = record?.status === 'BOARDED'
                                                const isNoShow = record?.status === 'NO_SHOW'

                                                let cardStyle = darkMode ? 'bg-slate-800 border-slate-700 opacity-70' : 'bg-white border-gray-100 opacity-70'
                                                if (isBoarded) cardStyle = 'bg-green-500/10 border-green-500/50'
                                                if (isNoShow) cardStyle = 'bg-amber-500/10 border-amber-500/50'

                                                return (
                                                    <motion.div
                                                        layout
                                                        key={p.id}
                                                        onClick={() => handlePaxAction(p)}
                                                        className={`p-4 rounded-xl border flex items-center justify-between transition-all active:scale-[0.98] ${cardStyle}`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${isBoarded ? 'bg-green-500 text-white' :
                                                                isNoShow ? 'bg-amber-500 text-white' :
                                                                    'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                                                }`}>
                                                                {isBoarded ? <CheckCircle className="w-6 h-6" /> :
                                                                    isNoShow ? <X className="w-6 h-6" /> :
                                                                        <UserCircle className="w-6 h-6" />}
                                                            </div>
                                                            <div>
                                                                <p className={`font-bold text-sm ${isBoarded ? 'text-green-500' : isNoShow ? 'text-amber-500' : ''}`}>
                                                                    {p.full_name}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <p className="text-[10px] opacity-50 font-mono tracking-tighter">
                                                                        {record ? record.timestamp.split('T')[1].substring(0, 5) : '---'}
                                                                    </p>
                                                                    {record?.status && (
                                                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${isBoarded ? 'bg-green-500/20 text-green-500' : 'bg-amber-500/20 text-amber-500'
                                                                            }`}>
                                                                            {isBoarded ? 'Subió' : 'No Show'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {!record && (
                                                            <div className="text-[10px] font-bold opacity-30 uppercase">Pendiente</div>
                                                        )}
                                                    </motion.div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Slide to Finish */}
                            <div className="mt-4 shrink-0">
                                <SlideButton
                                    label="Deslizar para Finalizar"
                                    icon={Square}
                                    colorClass="bg-red-600"
                                    onComplete={handleFinishTrip}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Camera Modal Overlay */}
            {showScanner && (
                <CameraScannerModal
                    onClose={() => setShowScanner(false)}
                    onScan={handleCameraScan}
                    darkMode={darkMode}
                />
            )}

            {/* Trip Summary Modal */}
            <AnimatePresence>
                {summarySchedule && (
                    <TripSummaryModal
                        schedule={summarySchedule}
                        passengers={summaryPax}
                        onClose={() => setSummarySchedule(null)}
                        darkMode={darkMode}
                    />
                )}
            </AnimatePresence>

            {/* Offline Indicator */}
            {offlineQueueSize > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-bold animate-pulse z-50">
                    <WifiOff className="w-4 h-4" />
                    {offlineQueueSize} viajes por subir
                </div>
            )}
        </div>
    )
}

export default DriverDashboard
