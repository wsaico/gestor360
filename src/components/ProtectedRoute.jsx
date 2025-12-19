import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@contexts/AuthContext'

/**
 * Componente de ruta protegida que valida autenticación y roles
 * @param {Object} props
 * @param {React.ReactNode} props.children - Componente hijo a renderizar si está autorizado
 * @param {string|string[]} props.allowedRoles - Rol o roles permitidos para acceder
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth()
  const location = useLocation()

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Si se especificaron roles permitidos, validar que el usuario tenga uno de ellos
  if (allowedRoles.length > 0) {
    const userRole = user?.role

    const isAllowed = allowedRoles.includes(userRole)

    if (!isAllowed) {
      // Si no tiene el rol adecuado, redirigir a página de acceso denegado
      return <Navigate to="/unauthorized" replace />
    }
  }

  // Si está autenticado y tiene el rol correcto, renderizar el componente hijo
  return children
}

export default ProtectedRoute
