import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@contexts/AuthContext'
import { Lock, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react'
import supabase from '@services/supabase'

/**
 * Página de Login
 * Autenticación segura con validación de credenciales
 */
const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRegisterEnabled, setIsRegisterEnabled] = useState(false)

  // Cargar configuración de registro
  useEffect(() => {
    const checkRegisterStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'ENABLE_PUBLIC_REGISTRATION')
          .single()

        if (data) {
          setIsRegisterEnabled(data.value === 'true')
        }
      } catch (err) {
        console.error('Error checking register status:', err)
      }
    }
    checkRegisterStatus()
  }, [])

  // Redirigir si ya está autenticado
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard'
    navigate(from, { replace: true })
    return null
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!formData.email || !formData.password) {
        setError('Por favor, complete todos los campos')
        setLoading(false)
        return
      }

      const result = await login(formData.email, formData.password)

      if (result.success) {
        const from = location.state?.from?.pathname || '/dashboard'
        navigate(from, { replace: true })
      } else {
        setError(result.error || 'Correo o contraseña incorrectos')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Error inesperado. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex bg-[#fbfbff] font-sans overflow-hidden">
      {/* Sección Izquierda: Formulario (Compacto) */}
      <div className="w-full lg:w-[42%] flex flex-col justify-between p-6 md:p-10 xl:p-16 relative z-20 bg-transparent overflow-hidden">
        {/* Header con Logo - Integrado */}
        <div className="flex justify-center lg:justify-start mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="w-28 h-28 flex items-center justify-center bg-transparent transform hover:scale-105 transition-transform duration-300">
            <img
              src="/gestor 360 logo modo claro (1).png"
              alt="Gestor360 Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://ui-avatars.com/api/?name=G&background=6D28D9&color=fff&bold=true";
              }}
            />
          </div>
        </div>

        {/* Cuerpo del Formulario - Compacto */}
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto lg:mx-0 w-full animate-in fade-in slide-in-from-left-2 duration-700">
          <div className="mb-6">
            <h1 className="text-3xl xl:text-4xl font-extrabold text-[#1e1b4b] mb-2 tracking-tight leading-tight">
              Bienvenido a <span className="text-secondary-600">Gestor360°</span>
            </h1>
            <p className="text-gray-400 text-base font-medium">
              Ingrese sus datos para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mensaje de Error */}
            {error && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-700 font-bold">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-secondary-600 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-white border border-gray-100 text-gray-900 rounded-2xl pl-12 pr-4 py-4 shadow-sm outline-none transition-all focus:border-secondary-600 focus:ring-4 focus:ring-secondary-50/50 placeholder:text-gray-300 text-base font-medium"
                  placeholder="Correo electrónico"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-secondary-600 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-white border border-gray-100 text-gray-900 rounded-2xl pl-12 pr-12 py-4 shadow-sm outline-none transition-all focus:border-secondary-600 focus:ring-4 focus:ring-secondary-50/50 placeholder:text-gray-300 text-base font-medium"
                  placeholder="Contraseña"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-secondary-600 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Recover */}
            <div className="flex items-center justify-between text-xs py-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-secondary-600 focus:ring-secondary-500 cursor-pointer" id="remember" />
                <span className="text-gray-400 font-bold group-hover:text-secondary-600 transition-colors">Recordarme</span>
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="font-bold text-gray-300 hover:text-secondary-600 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`flex-[2] bg-secondary-600 hover:bg-secondary-700 text-white font-extrabold py-4 rounded-xl shadow-lg shadow-secondary-200 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 text-base ${!isRegisterEnabled ? 'w-full' : ''}`}
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Ingresar'}
              </button>
              {isRegisterEnabled && (
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="flex-1 bg-white text-secondary-600 font-extrabold rounded-xl border border-secondary-50 hover:border-secondary-200 transition-all text-base"
                >
                  Registrarme
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Footer - Fijo */}
        <div className="mt-8 text-gray-300 font-bold text-xs">
          <p>© 2026 Gestor360°</p>
        </div>
      </div>

      {/* Sección Derecha: Ilustración (Compacta, sin scroll) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-secondary-50 justify-end items-center pr-12 xl:pr-24">
        {/* Curva Suave de Fondo */}
        <div className="absolute right-0 top-0 h-full w-[120%] bg-secondary-600 rounded-l-[100px] xl:rounded-l-[150px] shadow-2xl" />

        {/* Laptop Multi-capa - Posicionada Relativa al Fondo */}
        <div className="relative z-10 animate-float translate-x-12 xl:translate-x-24">
          <div className="laptop-container scale-90 xl:scale-100">
            {/* Capas Decorativas de Sombra/Transparencia */}
            <div className="laptop-decorative-layer -bottom-12 -right-12 opacity-40 bg-white/20" />
            <div className="laptop-decorative-layer -bottom-6 -right-6 opacity-20 bg-white/10" />

            {/* Capa Base Blanca */}
            <div className="laptop-base bg-white rounded-2xl shadow-3xl flex flex-col p-6 overflow-hidden">
              <div className="flex gap-1.5 mb-6">
                <div className="w-2.5 h-2.5 rounded-full bg-secondary-600/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-secondary-600/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-secondary-600/10" />
              </div>
              <div className="flex-1 flex flex-col gap-4">
                <div className="h-2 w-1/4 bg-gray-100 rounded-full" />
                <div className="h-32 bg-secondary-50/50 rounded-xl border border-secondary-100" />
                <div className="flex gap-4">
                  <div className="h-16 flex-1 bg-secondary-50/30 rounded-xl" />
                  <div className="h-16 flex-1 bg-secondary-50/30 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Capa de Pantalla Flotante */}
            <div className="laptop-screen-layer absolute -top-8 -left-8 bg-white/40 backdrop-blur-md border border-white/50 rounded-2xl shadow-xl p-4 flex flex-col gap-3">
              <div className="h-2 w-1/2 bg-white/80 rounded-full" />
              <div className="flex-1 bg-white/20 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
