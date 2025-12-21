import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@contexts/AuthContext'
import supabase from '@services/supabase' // Import Supabase
import { useTheme } from '@contexts/ThemeContext' // Add this import
import {
  LayoutDashboard,
  Users,
  Shield,
  UtensilsCrossed,
  Settings,
  Building2,
  UserCog,
  ChevronLeft,
  Package,
  ClipboardList,
  AlertTriangle,
  Menu as MenuIcon,
  DollarSign,
  FileText,
  Clock,
  RefreshCw,
  Boxes,
  Megaphone // Import Megaphone icon
} from 'lucide-react'
import { ROLES } from '@utils/constants'

// ... menuItems definition remains the same ...
const menuItems = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.MONITOR, ROLES.PROVIDER]
  },
  {
    title: 'Recursos Humanos',
    icon: Users,
    roles: [ROLES.ADMIN, ROLES.SUPERVISOR],
    children: [
      {
        title: 'Empleados',
        path: '/rrhh/empleados',
        icon: Users
      }
    ]
  },
  {
    title: 'Seguridad y Salud',
    icon: Shield,
    roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.MONITOR],
    children: [
      {
        title: 'Inventario EPPs',
        path: '/sst/inventario',
        icon: Package
      },
      {
        title: 'Entregas',
        path: '/sst/entregas',
        icon: ClipboardList
      },
      {
        title: 'Renovaciones',
        path: '/sst/renovaciones',
        icon: RefreshCw
      },
      {
        title: 'Catálogo Maestro',
        path: '/sst/catalogo',
        icon: Package,
        roles: [ROLES.ADMIN, ROLES.SUPERVISOR]
      },
      {
        title: 'Incidentes',
        path: '/sst/incidentes',
        icon: AlertTriangle,
        roles: [ROLES.ADMIN, ROLES.SUPERVISOR]
      }
    ]
  },
  {
    title: 'Activos',
    icon: Boxes,
    roles: [ROLES.ADMIN, ROLES.SUPERVISOR],
    children: [
      {
        title: 'Inventario de Activos',
        path: '/activos/inventario',
        icon: Package
      },
      {
        title: 'Configuración',
        path: '/activos/configuracion',
        icon: Settings,
        roles: [ROLES.ADMIN]
      }
    ]
  },
  {
    title: 'Alimentación',
    icon: UtensilsCrossed,
    roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.MONITOR, ROLES.PROVIDER],
    children: [
      {
        title: 'Menús',
        path: '/alimentacion/menus',
        icon: MenuIcon,
        roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.PROVIDER]
      },

      {
        title: 'Mis Pedidos',
        path: '/alimentacion/pedidos',
        icon: ClipboardList
        // Accessible to all roles (no role restriction)
      },
      {
        title: 'Tarifas',
        path: '/alimentacion/tarifas',
        icon: DollarSign,
        roles: [ROLES.ADMIN, ROLES.SUPERVISOR]
      },
      {
        title: 'Reportes',
        path: '/alimentacion/reportes',
        icon: FileText,
        roles: [ROLES.ADMIN, ROLES.SUPERVISOR]
      },
      {
        title: 'Configuración',
        path: '/alimentacion/configuracion',
        icon: Clock,
        roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.PROVIDER]
      },
      {
        title: 'Comunicados',
        path: '/alimentacion/comunicados',
        icon: Megaphone,
        roles: [ROLES.ADMIN, ROLES.PROVIDER]
      }
    ]
  },
  {
    title: 'Administración',
    icon: Settings,
    roles: [ROLES.ADMIN],
    children: [
      {
        title: 'Estaciones',
        path: '/admin/estaciones',
        icon: Building2
      },
      {
        title: 'Usuarios del Sistema',
        path: '/admin/usuarios',
        icon: UserCog
      },
      {
        title: 'Configuración',
        path: '/admin/configuracion',
        icon: Settings
      }
    ]
  }
]

/**
 * Componente Sidebar con navegación dinámica según roles
 */
const Sidebar = ({ isOpen, onClose, onOpen }) => {
  const { user, hasRole } = useAuth()
  const location = useLocation()

  // App Identity State
  const [appIdentity, setAppIdentity] = useState({
    name: 'Gestor360°',
    logo: ''
  })

  useEffect(() => {
    const fetchIdentity = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('*')
        .in('key', ['COMPANY_NAME', 'COMPANY_LOGO_URL'])

      const name = data?.find(s => s.key === 'COMPANY_NAME')?.value
      const logo = data?.find(s => s.key === 'COMPANY_LOGO_URL')?.value

      if (name || logo) {
        setAppIdentity(prev => ({
          name: name || prev.name,
          logo: logo || prev.logo
        }))
      }
    }
    fetchIdentity()
  }, [])

  /**
   * Filtra los elementos del menú según el rol del usuario
   */
  const getFilteredMenuItems = () => {
    return menuItems
      .filter((item) => {
        // Si el item tiene roles definidos, verificar que el usuario tenga uno de ellos
        if (item.roles && item.roles.length > 0) {
          return item.roles.includes(user?.role)
        }
        return true
      })
      .map((item) => {
        // Filtrar los hijos si existen
        if (item.children) {
          return {
            ...item,
            children: item.children.filter((child) => {
              if (child.roles && child.roles.length > 0) {
                return child.roles.includes(user?.role)
              }
              return true
            })
          }
        }
        return item
      })
  }

  const filteredMenuItems = getFilteredMenuItems()

  /**
   * Verifica si una ruta está activa
   */
  const isActive = (path) => {
    return location.pathname === path
  }

  /**
   * Verifica si una sección tiene alguna ruta activa
   */
  const isSectionActive = (item) => {
    if (item.path) {
      return isActive(item.path)
    }
    if (item.children) {
      return item.children.some((child) => isActive(child.path))
    }
    return false
  }

  return (
    <>
      {/* Overlay para móviles */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          bg-slate-900 shadow-lg
          transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-20 w-64'}
          flex flex-col border-r border-slate-800
        `}
      >
        {/* Header del Sidebar */}
        <div className={`flex items-center h-16 border-b border-slate-800 transition-all duration-300 ${isOpen ? 'justify-between px-6' : 'justify-center px-0'}`}>
          <div className="flex items-center space-x-2 overflow-hidden">
            {appIdentity.logo ? (
              <img src={appIdentity.logo} alt="Logo" className="w-auto h-8 object-contain" />
            ) : (
              <>
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">G</span>
                </div>
                <div className={`transition-all duration-300 ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 lg:hidden'}`}>
                  <span className="text-xl font-bold text-white truncate" title={appIdentity.name}>
                    {appIdentity.name}
                  </span>
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className={`lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 ${!isOpen && 'lg:hidden'}`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>



        {/* Navegación */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto scrollbar-hide">
          <ul className="space-y-1">
            {filteredMenuItems.map((item, index) => (
              <MenuItem key={index} item={item} isActive={isSectionActive(item)} isOpen={isOpen} onOpen={onOpen} />
            ))}
          </ul>
        </nav>

        {/* Footer del Sidebar */}
        <div className={`px-6 py-4 border-t border-slate-800 ${!isOpen && 'hidden lg:hidden'}`}>
          <p className="text-xs text-slate-500 text-center">
            Gestor360° v2.0.0
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
            © 2025 Wilber Saico
          </p>
        </div>
      </aside >
    </>
  )
}

/**
 * Componente para renderizar cada item del menú
 */
const MenuItem = ({ item, isActive, isOpen, onOpen }) => {
  const location = useLocation()
  const [isExpanded, setIsExpanded] = useState(isActive)
  const Icon = item.icon

  // Si no tiene hijos, renderizar un link simple
  if (!item.children) {
    return (
      <li>
        <Link
          to={item.path}
          className={`
            flex items-center space-x-3 px-4 py-3 rounded-lg
            transition-colors duration-200
            ${isActive
              ? 'bg-primary-600 text-white shadow-md'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }
            ${!isOpen && 'lg:justify-center lg:px-2'}
          `}
          title={!isOpen ? item.title : ''}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          <span className={`text-sm font-medium transition-all duration-300 ${!isOpen && 'lg:hidden'}`}>
            {item.title}
          </span>
        </Link>
      </li>
    )
  }

  // Si tiene hijos, renderizar un menú expandible
  return (
    <li>
      <button
        onClick={() => {
          if (!isOpen) {
            onOpen()
            setIsExpanded(true)
          } else {
            setIsExpanded(!isExpanded)
          }
        }}
        className={`
          w-full flex items-center justify-between px-4 py-3 rounded-lg
          transition-colors duration-200
          ${isActive
            ? 'bg-primary-600 text-white shadow-md'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }
           ${!isOpen && 'lg:justify-center lg:px-2'}
        `}
        title={!isOpen ? item.title : ''}
      >
        <div className="flex items-center space-x-3">
          <Icon className="w-5 h-5 flex-shrink-0" />
          <span className={`text-sm font-medium transition-all duration-300 ${!isOpen && 'lg:hidden'}`}>{item.title}</span>
        </div>
        <ChevronLeft
          className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : '-rotate-90'} ${!isOpen && 'lg:hidden'}`}
        />
      </button>

      {/* Submenú */}
      {isExpanded && isOpen && (
        <ul className="mt-1 ml-4 space-y-1">
          {item.children.map((child, childIndex) => {
            const ChildIcon = child.icon
            const childIsActive = location.pathname === child.path

            return (
              <li key={childIndex}>
                <Link
                  to={child.path}
                  className={`
                    flex items-center space-x-3 px-4 py-2 rounded-lg
                    transition-colors duration-200
                    ${childIsActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }
                  `}
                >
                  <ChildIcon className="w-4 h-4" />
                  <span className="text-sm">{child.title}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}

export default Sidebar
