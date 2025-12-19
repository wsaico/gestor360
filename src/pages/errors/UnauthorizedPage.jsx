import { useNavigate } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react'

/**
 * Página de acceso no autorizado (403)
 */
const UnauthorizedPage = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
          <ShieldAlert className="w-10 h-10 text-red-600" />
        </div>

        <h1 className="text-6xl font-bold text-gray-900 mb-4">403</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Acceso Denegado
        </h2>
        <p className="text-gray-600 mb-8">
          No tienes permisos para acceder a esta página. Por favor, contacta al administrador si crees que esto es un error.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-secondary btn-md inline-flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary btn-md inline-flex items-center space-x-2"
          >
            <Home className="w-4 h-4" />
            <span>Ir al Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default UnauthorizedPage
