import { useState } from 'react'
import { useAuth } from '@contexts/AuthContext'
import { useTheme } from '@contexts/ThemeContext'
import { useNavigate } from 'react-router-dom'
import {
  Menu,
  Bell,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Building2,
  XCircle,
  Sun,
  Moon
} from 'lucide-react'
import NotificationDropdown from '@components/common/NotificationDropdown'

/**
 * Header de la aplicación
 * Contiene el botón del menú, notificaciones y menú de usuario
 */
const Header = ({ onMenuClick, sidebarOpen }) => {
  // Usar stations y selectStation del contexto global
  const { user, station, stations, loadingStations, logout, updateStation, selectStation } = useAuth()
  const { headerColor, darkMode, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleSelectStation = (stationId) => {
    if (stationId) {
      selectStation(stationId)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Calculate generic brightness to decide text color
  const getTextColor = (hexColor, isDark) => {
    if (isDark && hexColor === '#ffffff') return 'text-white'

    // Si no es el default blanco, calcular según el color
    const c = hexColor.substring(1);      // strip #
    const rgb = parseInt(c, 16);   // convert rrggbb to decimal
    const r = (rgb >> 16) & 0xff;  // extract red
    const g = (rgb >> 8) & 0xff;  // extract green
    const b = (rgb >> 0) & 0xff;  // extract blue

    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709

    return luma < 128 ? 'text-white' : 'text-gray-800';
  }

  const textColorClass = getTextColor(headerColor, darkMode);

  // Define glassy background for dark mode if default color is used
  const headerBgStyle = darkMode && headerColor === '#ffffff'
    ? { backgroundColor: 'transparent' } // Let Tailwind handle it
    : { backgroundColor: headerColor };

  return (
    <header
      className={`
        h-20 border-b flex items-center justify-between px-6 transition-all duration-300 z-20
        ${darkMode
          ? (headerColor === '#ffffff'
            ? 'bg-slate-900/80 backdrop-blur-md border-slate-700/50 shadow-lg'
            : 'border-white/10 shadow-lg')
          : 'bg-white border-gray-200 shadow-sm'
        }
        ${textColorClass}
      `}
      style={headerBgStyle}
    >
      {/* Lado izquierdo - Botón de menú y título */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuClick}
          className="opacity-70 hover:opacity-100 focus:outline-none"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Selector de estación para admin global sin estación */}
        {user?.role === 'ADMIN' && !station && (
          <div className="flex items-center space-x-2 text-sm">
            <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="opacity-80 font-medium hidden sm:inline">Seleccionar Sucursal:</span>
            <select
              onChange={(e) => handleSelectStation(e.target.value)}
              className="border border-amber-300 dark:border-amber-600 rounded-md px-2 py-1 text-xs sm:text-sm bg-amber-50 dark:bg-amber-900/20 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500 max-w-[150px] sm:max-w-none"
              defaultValue=""
            >
              <option value="" disabled className="dark:bg-gray-800">
                {loadingStations ? 'Cargando...' : '-- Elegir --'}
              </option>
              {stations.map(s => (
                <option key={s.id} value={s.id} className="dark:bg-gray-800">
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Información de la estación (si tiene estación asignada) */}
        {station && (
          <div className="flex items-center space-x-2 text-sm">
            <Building2 className="w-4 h-4 opacity-50 shrink-0" />
            <span className="opacity-70 hidden sm:inline">Sucursal:</span>
            <span className="font-semibold text-xs sm:text-sm truncate max-w-[120px] sm:max-w-xs">{station.name}</span>
            <span className="opacity-60 hidden sm:inline">({station.code})</span>

            {/* Botón para limpiar estación si es admin global */}
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => {
                  updateStation(null)
                  // Forzar recarga o navegar a dashboard para limpiar vista
                  navigate('/dashboard')
                }}
                className="ml-2 p-1 opacity-60 hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-white/10 shrink-0"
                title="Cambiar sucursal"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lado derecho - Notificaciones y menú de usuario */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Theme Switch */}
        <button
          onClick={toggleTheme}
          className="p-2 opacity-70 hover:opacity-100 focus:outline-none rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          title={darkMode ? "Modo Claro" : "Modo Oscuro"}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notificaciones */}
        <NotificationDropdown />

        {/* Menú de usuario */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center space-x-3 focus:outline-none"
          >
            {/* Avatar */}
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <span className="text-primary-700 dark:text-primary-400 font-semibold text-sm">
                {user?.username?.substring(0, 2).toUpperCase() || 'U'}
              </span>
            </div>

            {/* Nombre y rol */}
            <div className="text-left">
              <p className="text-sm font-medium">
                {user?.username || 'Usuario'}
              </p>
              <p className="text-xs opacity-70">
                {user?.role === 'ADMIN' && 'Administrador'}
                {user?.role === 'SUPERVISOR' && 'Supervisor'}
                {user?.role === 'MONITOR' && 'Monitor'}
                {user?.role === 'PROVIDER' && 'Proveedor'}
              </p>
            </div>

            <ChevronDown className="w-4 h-4 opacity-50" />
          </button>

          {/* Dropdown del menú de usuario */}
          {userMenuOpen && (
            <>
              {/* Overlay para cerrar el menú al hacer click fuera */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setUserMenuOpen(false)}
              />

              {/* Menú */}
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-20 border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    navigate('/admin/configuracion/perfil')
                    setUserMenuOpen(false)
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <User className="w-4 h-4" />
                  <span>Mi Perfil</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/admin/configuracion')
                    setUserMenuOpen(false)
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Settings className="w-4 h-4" />
                  <span>Configuración</span>
                </button>

                <hr className="my-1 border-gray-200 dark:border-gray-700" />

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
