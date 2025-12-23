import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { UserCircle, Loader2, ArrowRight, ShieldCheck, Bus } from 'lucide-react'
import transportService from '@services/transportService'
import { useNotification } from '@contexts/NotificationContext'

export default function DriverLoginPage() {
    const [dni, setDni] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const { notify } = useNotification()

    const handleLogin = async (e) => {
        e.preventDefault()
        if (!dni || dni.length < 8) {
            notify.error('Ingrese un DNI válido')
            return
        }

        setLoading(true)
        try {
            const driver = await transportService.validateDriverDni(dni)
            if (driver) {
                // Success - Store Session
                localStorage.setItem('kiosk_driver', JSON.stringify(driver))
                notify.success(`Bienvenido, ${driver.first_name}`)
                navigate('/transport/driver-dashboard')
            } else {
                notify.error('DNI no encontrado en el sistema')
            }
        } catch (error) {
            console.error(error)
            notify.error('Error de conexión')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm"
            >
                {/* Logo / Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-primary-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-primary-500/30 mb-4">
                        <Bus className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Portal Conductor</h1>
                    <p className="text-slate-400">Ingrese su DNI para ver sus viajes</p>
                </div>

                {/* Login Card */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-xl">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-300 uppercase tracking-wider ml-1">
                                Documento de Identidad
                            </label>
                            <div className="relative">
                                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                                <input
                                    type="tel"
                                    value={dni}
                                    onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} // Numeric only
                                    maxLength={15}
                                    placeholder="Ingrese DNI"
                                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-4 pl-12 text-lg font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${loading
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/25 active:scale-95'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    Verificando...
                                </>
                            ) : (
                                <>
                                    Ingresar
                                    <ArrowRight className="w-6 h-6" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 flex items-center justify-center gap-2 text-slate-500 text-sm">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Acceso Seguro</span>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
