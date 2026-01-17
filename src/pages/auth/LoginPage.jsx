import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@contexts/AuthContext'
import { Lock, Mail, AlertCircle, Eye, EyeOff, CheckCircle2, Zap, BarChart3, Bus, Users, ShieldCheck, ClipboardCheck, LayoutGrid, Leaf, Utensils, Package, Globe, QrCode } from 'lucide-react'
import supabase from '@services/supabase'

// Datos de los Slides (Actualizados: Eco-Friendly + Módulos Específicos)
const slides = [
  {
    id: 1,
    title: "Eco-Digitalización Corporativa",
    description: "Sistema Todo en Uno Multi-sucursal. Automatiza procesos manuales, elimina el uso de papel y cuida el medio ambiente mientras optimizas tu tiempo.",
    icon: <Leaf className="w-32 h-32 text-white opacity-90 drop-shadow-2xl" />,
    subIcons: [
      <Globe className="w-12 h-12 text-blue-200 absolute top-0 right-0 animate-pulse delay-100" />,
      <LayoutGrid className="w-10 h-10 text-green-300 absolute bottom-10 -left-4 animate-spin-slow" />
    ]
  },
  {
    id: 2,
    title: "Inventario y Activos",
    description: "Control total de EPPs, uniformes y activos. Trazabilidad en tiempo real y gestión eficiente de stocks por sede.",
    icon: <Package className="w-32 h-32 text-white opacity-90 drop-shadow-2xl" />,
    subIcons: [
      <ClipboardCheck className="w-12 h-12 text-orange-200 absolute -top-4 -left-4 animate-bounce" />,
      <ShieldCheck className="w-10 h-10 text-yellow-300 absolute bottom-0 right-0" />
    ]
  },
  {
    id: 3,
    title: "Gestión de Alimentación",
    description: "Administración digital de comedor y vales. Validación QR instantánea y reportes detallados de consumo.",
    icon: <Utensils className="w-32 h-32 text-white opacity-90 drop-shadow-2xl" />,
    subIcons: [
      <QrCode className="w-12 h-12 text-white absolute top-1/2 -right-12 animate-pulse" />,
      <CheckCircle2 className="w-10 h-10 text-emerald-300 absolute top-0 left-0" />
    ]
  },
  {
    id: 4,
    title: "Transporte Inteligente",
    description: "Gestión avanzada de flota y rutas. Monitoreo satelital y control de conductores en una sola plataforma.",
    icon: <Bus className="w-32 h-32 text-white opacity-90 drop-shadow-2xl" />,
    subIcons: [
      <Zap className="w-12 h-12 text-yellow-200 absolute top-0 right-0 animate-pulse" />,
      <Users className="w-10 h-10 text-blue-300 absolute bottom-4 -left-4" />
    ]
  }
]

/**
 * Página de Login
 * Autenticación segura con validación de credenciales
 * Rediseño con slider informativo en el lado derecho (Violeta - Color del Sistema)
 */
const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  // Estado del Carrusel
  const [currentSlide, setCurrentSlide] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRegisterEnabled, setIsRegisterEnabled] = useState(false)

  // Auto-avance del carrusel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  // Cargar configuración de registro
  useEffect(() => {
    const checkRegisterStatus = async () => {
      try {
        const { data, error: dbError } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'ENABLE_PUBLIC_REGISTRATION')
          .single()

        if (dbError) throw dbError

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

      const result = await login(formData.email.trim(), formData.password)

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
    <div className="h-screen flex bg-white font-sans overflow-hidden">
      {/* Sección Izquierda: Formulario (40%) */}
      <div className="w-full lg:w-[40%] flex flex-col justify-center p-8 md:p-12 xl:p-16 relative z-10 bg-white">

        {/* Logo Header */}
        <div className="mb-10 lg:mb-16">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
            <img
              src="/logo-light.png"
              alt="Gestor360 Logo"
              className="w-full h-full object-contain p-2"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://ui-avatars.com/api/?name=G&background=9333ea&color=fff&bold=true";
              }}
            />
          </div>
          <h1 className="text-3xl xl:text-4xl font-bold text-gray-900 tracking-tight leading-tight mb-2">
            Bienvenido de nuevo
          </h1>
          <p className="text-gray-500 font-medium">Ingresa tus credenciales para acceder</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6 max-w-sm w-full">
          {/* Mensaje de Error */}
          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-700 font-bold">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-600 transition-all font-medium"
                  placeholder="ejemplo@correo.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-12 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-600 transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-secondary-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded text-secondary-600 focus:ring-secondary-500 border-gray-300" />
              <span className="text-sm font-medium text-gray-600">Recordarme</span>
            </label>
            <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm font-bold text-secondary-600 hover:text-secondary-700">
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-secondary-600 hover:bg-secondary-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-secondary-500/30 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Iniciar Sesión'}
          </button>

          {isRegisterEnabled && (
            <div className="text-center pt-4">
              <p className="text-gray-500 text-sm">
                ¿No tienes una cuenta?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="text-secondary-600 font-bold hover:underline"
                >
                  Regístrate aquí
                </button>
              </p>
            </div>
          )}
        </form>

        <div className="absolute bottom-6 left-0 w-full text-center">
          <p className="text-xs text-gray-400">© 2026 Gestor360. Todos los derechos reservados.</p>
        </div>
      </div>

      {/* Sección Derecha: Carrusel (60%) - Color VIOLETA (Secondary) */}
      <div className="hidden lg:flex flex-1 bg-[#9333ea] relative overflow-hidden flex-col justify-center items-center text-white p-12">
        {/* Background Patterns */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute -top-[20%] -right-[20%] w-[800px] h-[800px] rounded-full bg-white opacity-10 blur-3xl"></div>
          <div className="absolute bottom-[0%] left-[0%] w-[600px] h-[600px] rounded-full bg-purple-400 opacity-20 blur-3xl"></div>
        </div>

        {/* Carousel Content */}
        <div className="relative z-10 w-full max-w-xl">
          <div className="relative h-[400px] flex flex-col items-center justify-center text-center">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 transform ${index === currentSlide
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-8 scale-95 pointer-events-none'
                  }`}
              >
                {/* Visor 3D Effect Placeholder */}
                <div className="mb-10 relative">
                  <div className="absolute inset-0 bg-purple-400/30 blur-2xl rounded-full scale-150 animate-pulse"></div>
                  <div className="w-48 h-48 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 flex items-center justify-center shadow-2xl relative transform rotate-6 hover:rotate-0 transition-all duration-500">
                    {slide.icon}
                    {/* Sub Icons decorativos */}
                    {slide.subIcons.map((icon, i) => (
                      <div key={i}>{icon}</div>
                    ))}
                  </div>
                </div>

                <h2 className="text-4xl font-extrabold mb-4 tracking-tight drop-shadow-md">
                  {slide.title}
                </h2>
                <p className="text-lg text-purple-100 font-medium leading-relaxed max-w-md mx-auto">
                  {slide.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Dots Indicators */}
        <div className="absolute bottom-12 flex gap-3 z-20">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentSlide
                ? 'bg-white w-8'
                : 'bg-white/40 hover:bg-white/60'
                }`}
              aria-label={`Ir al slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default LoginPage
