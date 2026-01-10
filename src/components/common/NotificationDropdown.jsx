import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Cake, AlertTriangle, FileText, Package, ChevronRight, X } from 'lucide-react'
import { useAuth } from '@contexts/AuthContext'
import notificationService from '@services/notificationService'

const NotificationDropdown = () => {
    const { station } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState({ birthdays: [], docs: [], epps: [] })
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('vencimientos') // 'vencimientos' | 'cumpleanos'
    const dropdownRef = useRef(null)

    const fetchNotifications = async () => {
        if (!station?.id) return
        setLoading(true)
        try {
            const data = await notificationService.getNotifications(station.id)
            setNotifications(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchNotifications()
        // Refresh every 5 minutes
        const interval = setInterval(fetchNotifications, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [station?.id])

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const totalAlerts = (notifications.docs?.length || 0) + (notifications.epps?.length || 0) + (notifications.birthdays?.length || 0)
    const vencimientosCount = (notifications.docs?.length || 0) + (notifications.epps?.length || 0)

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 opacity-70 hover:opacity-100 focus:outline-none rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                title="Notificaciones"
            >
                <Bell className="w-5 h-5" />
                {totalAlerts > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900 border-2 border-transparent animate-pulse" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden transform origin-top-right transition-all">
                    {/* Header */}
                    <div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100">Notificaciones</h3>
                        <button onClick={() => fetchNotifications()} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                            Actualizar
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-100 dark:border-gray-700">
                        <button
                            onClick={() => setActiveTab('vencimientos')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'vencimientos'
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50/10'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            Alertas ({vencimientosCount})
                        </button>
                        <button
                            onClick={() => setActiveTab('cumpleanos')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'cumpleanos'
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50/10'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            Cumpleaños ({notifications.birthdays?.length || 0})
                        </button>
                    </div>

                    {/* Content */}
                    <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                        {loading ? (
                            <div className="p-8 text-center text-gray-400 text-sm">Cargando...</div>
                        ) : (
                            <>
                                {activeTab === 'vencimientos' && (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {vencimientosCount === 0 && (
                                            <div className="p-8 text-center">
                                                <div className="w-12 h-12 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <AlertTriangle className="w-6 h-6" />
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">Todo en orden.<br />No hay vencimientos próximos.</p>
                                            </div>
                                        )}

                                        {/* Documentos */}
                                        {notifications.docs?.map((doc, i) => (
                                            <div key={`doc-${i}`} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <div className="flex gap-3">
                                                    <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${doc.status === 'expired' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                                                        }`}>
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                                                            {doc.document_type === 'FOTOCHECK' ? 'Fotocheck' : 'Examen Médico'}
                                                        </p>
                                                        <p className="text-xs text-gray-500 truncate mb-1">{doc.full_name}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${doc.status === 'expired' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                                                                }`}>
                                                                {doc.status === 'expired' ? 'VENCIDO' : `Vence en ${doc.days_remaining} días`}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400">{doc.expiry_date_fmt}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* EPPs */}
                                        {notifications.epps?.map((epp, i) => (
                                            <div key={`epp-${i}`} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                                <div className="flex gap-3">
                                                    <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${epp.status === 'expired' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                                                        }`}>
                                                        <Package className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate pr-2">
                                                                    Renovación EPP
                                                                </p>
                                                                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">{epp.item_name}</p>
                                                            </div>
                                                            <Link
                                                                to="/sst/renovaciones"
                                                                onClick={() => setIsOpen(false)}
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-primary-50 text-primary-600 rounded"
                                                                title="Ir a renovar"
                                                            >
                                                                <ChevronRight className="w-4 h-4" />
                                                            </Link>
                                                        </div>
                                                        <p className="text-xs text-gray-500 truncate mb-1">{epp.full_name}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${epp.status === 'expired' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'
                                                                }`}>
                                                                {epp.status === 'expired' ? 'VENCIDO' : `Vence en ${epp.days_remaining} días`}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400">{epp.renewal_date_fmt}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'cumpleanos' && (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {notifications.birthdays?.length === 0 && (
                                            <div className="p-8 text-center">
                                                <div className="w-12 h-12 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <Cake className="w-6 h-6" />
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">No hay cumpleaños próximos.</p>
                                            </div>
                                        )}
                                        {notifications.birthdays?.map((bd, i) => (
                                            <div key={i} className="p-4 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-400 to-purple-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                                                    <Cake className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{bd.full_name}</p>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="text-pink-600 font-medium">
                                                            {bd.days_until === 0 ? '¡Es Hoy!' :
                                                                bd.days_until === 1 ? '¡Es Mañana!' :
                                                                    `En ${bd.days_until} días`}
                                                        </span>
                                                        <span className="text-gray-400">•</span>
                                                        <span className="text-gray-500">{bd.birth_day_str}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default NotificationDropdown
