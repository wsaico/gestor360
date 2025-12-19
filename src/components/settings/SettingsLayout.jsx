import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
    Settings,
    User,
    Bell,
    Map,
    Shield,
    Palette,
    Menu,
    ChevronLeft,
    Package
} from 'lucide-react'
import { useAuth } from '@contexts/AuthContext'
import { ROLES } from '@utils/constants'
import ThemeDebug from '../ThemeDebug'

const SettingsLayout = () => {
    const { user } = useAuth()
    const location = useLocation()
    const [showMobileMenu, setShowMobileMenu] = useState(false)

    const navigation = [
        { name: 'General', to: '/admin/configuracion', icon: Settings, exact: true },
        { name: 'Apariencia', to: '/admin/configuracion/apariencia', icon: Palette },
        { name: 'Perfil', to: '/admin/configuracion/perfil', icon: User },
        { name: 'Notificaciones', to: '/admin/configuracion/notificaciones', icon: Bell },
        {
            name: 'Áreas Operativas',
            to: '/admin/configuracion/areas',
            icon: Map,
            roles: [ROLES.ADMIN]
        },

        {
            name: 'Sistema y Seguridad',
            to: '/admin/configuracion/seguridad',
            icon: Shield,
            roles: [ROLES.ADMIN]
        },
    ]

    const filteredNavigation = navigation.filter(item => {
        if (item.roles && !item.roles.includes(user?.role)) return false
        return true
    })

    // Helper to check active state including exact matching for root
    const isActiveLink = (path, exact) => {
        if (exact) return location.pathname === path
        return location.pathname.startsWith(path)
    }

    return (
        <div className="flex flex-col md:flex-row min-h-full gap-6">
            {/* Mobile Menu Toggle - Only visible on small screens */}
            <div className="md:hidden flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-4">
                <span className="font-semibold text-gray-700 dark:text-gray-200">Menú de Configuración</span>
                <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                >
                    {showMobileMenu ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Sidebar Navigation */}
            <aside className={`
        w-full md:w-64 flex-shrink-0 
        ${showMobileMenu ? 'block' : 'hidden'} md:block
      `}>
                <nav className="space-y-1">
                    {filteredNavigation.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.to}
                            end={item.exact}
                            onClick={() => setShowMobileMenu(false)}
                            className={({ isActive }) => `
                flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150
                ${isActive
                                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                                }
              `}
                        >
                            <item.icon
                                className={`flex-shrink-0 mr-3 h-5 w-5 
                  ${isActiveLink(item.to, item.exact) ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}
                `}
                            />
                            {item.name}
                        </NavLink>
                    ))}
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <Outlet />
            </main>
        </div>
    )
}

export default SettingsLayout
