import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@contexts/AuthContext'
import notificationService from '@services/notificationService'
import Sidebar from './Sidebar'
import Header from './Header'
import Footer from './Footer'

/**
 * Layout principal de la aplicación
 * Contiene el sidebar, header y área de contenido
 */
const MainLayout = () => {
  const { user, station } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true)
      } else {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Verificar notificaciones diarias de renovaciones (email simulado)
  useEffect(() => {
    if (user && station) {
      notificationService.checkAndNotifyRenewals(user, station)
    }
  }, [user, station])

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpen={() => setSidebarOpen(true)}
      />

      {/* Contenedor principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} />

        {/* Contenido principal */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6 pb-0 transition-colors duration-200 flex flex-col">
          <div className="flex-1">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
