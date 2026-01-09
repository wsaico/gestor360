import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@contexts/AuthContext'
import supabase from '@services/supabase'
import { ArrowLeft, UserPlus, Mail, Lock, User, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'

const RegisterPage = () => {
    const navigate = useNavigate()
    const { register } = useAuth()

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    })

    const [loading, setLoading] = useState(false)
    const [checking, setChecking] = useState(true)
    const [isEnabled, setIsEnabled] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        const checkRegisterStatus = async () => {
            try {
                const { data } = await supabase
                    .from('app_settings')
                    .select('value')
                    .eq('key', 'ENABLE_PUBLIC_REGISTRATION')
                    .single()

                if (data) {
                    setIsEnabled(data.value === 'true')
                }
            } catch (err) {
                console.error('Error checking register status:', err)
            } finally {
                setChecking(false)
            }
        }
        checkRegisterStatus()
    }, [])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (error) setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden')
            return
        }

        if (formData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres')
            return
        }

        setLoading(true)
        try {
            const result = await register(formData.email, formData.password, formData.username)

            if (result.success) {
                setSuccess(true)
                setTimeout(() => navigate('/login'), 3000)
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('Ocurrió un error inesperado. Intente de nuevo.')
        } finally {
            setLoading(false)
        }
    }

    if (checking) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#fbfbff]">
                <div className="w-10 h-10 border-4 border-secondary-600/30 border-t-secondary-600 rounded-full animate-spin" />
            </div>
        )
    }

    if (!isEnabled) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#fbfbff] p-6">
                <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl text-center">
                    <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-[#1e1b4b] mb-4">Registro Deshabilitado</h1>
                    <p className="text-gray-500 mb-8 font-medium">
                        El sistema de registro autónomo no está disponible en este momento. Por favor, contacte con el administrador de su estación.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full flex items-center justify-center gap-2 bg-secondary-600 hover:bg-secondary-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-secondary-200"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Volver al Login
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen flex items-center justify-center bg-[#fbfbff] p-6 font-sans">
            <div className="max-w-lg w-full bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl shadow-secondary-100 overflow-hidden relative">
                {/* Decoración */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-50 rounded-full -mr-16 -mt-16 z-0" />

                <div className="relative z-10">
                    {success ? (
                        <div className="text-center py-8 animate-in fade-in zoom-in duration-500">
                            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
                                <CheckCircle2 className="w-12 h-12 text-green-500" />
                            </div>
                            <h2 className="text-3xl font-extrabold text-[#1e1b4b] mb-4">¡Registro Exitoso!</h2>
                            <p className="text-gray-500 mb-8 font-medium">Su cuenta ha sido creada. Redirigiendo al inicio de sesión...</p>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full animate-progress-fast" />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-10">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-secondary-50 rounded-2xl">
                                        <UserPlus className="w-6 h-6 text-secondary-600" />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-extrabold text-[#1e1b4b]">Crear Cuenta</h1>
                                        <p className="text-gray-400 font-medium">Únete a Gestor360°</p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {error && (
                                    <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-center gap-3 animate-head-shake">
                                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                        <p className="text-sm text-red-700 font-bold">{error}</p>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {/* Username */}
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-secondary-600 transition-colors">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <input
                                            name="username"
                                            required
                                            value={formData.username}
                                            onChange={handleChange}
                                            className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 focus:bg-white focus:ring-4 focus:ring-secondary-50 transition-all outline-none font-medium"
                                            placeholder="Nombre Completo"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-secondary-600 transition-colors">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <input
                                            name="email"
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 focus:bg-white focus:ring-4 focus:ring-secondary-50 transition-all outline-none font-medium"
                                            placeholder="Correo electrónico"
                                        />
                                    </div>

                                    {/* Password */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-secondary-600 transition-colors">
                                                <Lock className="w-5 h-5" />
                                            </div>
                                            <input
                                                name="password"
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                value={formData.password}
                                                onChange={handleChange}
                                                className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-10 py-4 focus:bg-white focus:ring-4 focus:ring-secondary-50 transition-all outline-none font-medium text-sm"
                                                placeholder="Contraseña"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-secondary-600"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-secondary-600 transition-colors">
                                                <Lock className="w-5 h-5" />
                                            </div>
                                            <input
                                                name="confirmPassword"
                                                type="password"
                                                required
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 focus:bg-white focus:ring-4 focus:ring-secondary-50 transition-all outline-none font-medium text-sm"
                                                placeholder="Repetir"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex flex-col gap-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-secondary-600 hover:bg-secondary-700 text-white font-extrabold py-5 rounded-2xl shadow-xl shadow-secondary-100 transition-all transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3 text-lg"
                                    >
                                        {loading ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : 'Crear mi cuenta'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/login')}
                                        className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-secondary-600 transition-colors font-bold py-2"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Volver al login
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default RegisterPage
