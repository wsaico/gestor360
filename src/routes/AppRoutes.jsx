import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@contexts/AuthContext'
import ProtectedRoute from '@components/ProtectedRoute'

// Layout
import MainLayout from '@components/layout/MainLayout'

// Páginas públicas
import LoginPage from '@pages/auth/LoginPage'

// Páginas protegidas
import DashboardPage from '@pages/dashboard/DashboardPage'
import UnauthorizedPage from '@pages/errors/UnauthorizedPage'
import NotFoundPage from '@pages/errors/NotFoundPage'

// Módulos de RRHH
import EmployeesPage from '@pages/rrhh/EmployeesPage'
import EmployeeDetailPage from '@pages/rrhh/EmployeeDetailPage'
import EmployeeFormPage from '@pages/rrhh/EmployeeFormPage'

// Módulos de SST
import InventoryPage from '@pages/sst/InventoryPage'
import DeliveriesPage from '@pages/sst/DeliveriesPage'
import RenewalsPage from '@pages/sst/RenewalsPage'
import IncidentsPage from '@pages/sst/IncidentsPage'

// Módulos de Activos
import AssetsPage from '@pages/assets/AssetsPage'
import AssetConfigPage from '@pages/assets/AssetConfigPage'

// Módulos de Alimentación
import MenusPage from '@pages/alimentacion/MenusPage'
import PublicMenuPage from '@pages/public/PublicMenuPage'
import FoodOrdersPage from '@pages/alimentacion/FoodOrdersPage'
import RolePricingPage from '@pages/alimentacion/RolePricingPage'
import FoodConfigPage from '@pages/alimentacion/FoodConfigPage'
import ReportsPage from '@pages/alimentacion/ReportsPage'

// Módulos de Administración
import StationsPage from '@pages/admin/StationsPage'
import SystemUsersPage from '@pages/admin/SystemUsersPage'
// import SettingsPage from '@pages/admin/SettingsPage' // Deprecated

// Settings New Components
import SettingsLayout from '@components/settings/SettingsLayout'
import GeneralSettings from '@components/settings/GeneralSettings'
import AppearanceSettings from '@components/settings/AppearanceSettings'
import ProfileSettings from '@components/settings/ProfileSettings'
import NotificationSettings from '@components/settings/NotificationSettings'
import AreaSettings from '@components/settings/AreaSettings'
import SecuritySettings from '@components/settings/SecuritySettings'
import MasterCatalogPage from '@pages/admin/MasterCatalogPage'


import { ROLES } from '@utils/constants'

/**
 * Configuración principal de rutas de la aplicación
 */
const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Ruta raíz - Redirige al dashboard si está autenticado, sino al login */}
      <Route
        path="/"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        }
      />

      {/* Rutas públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/menu" element={<PublicMenuPage />} />

      {/* Rutas protegidas con layout */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard - Accesible para todos los roles autenticados */}
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Módulo RRHH - Accesible para ADMIN y SUPERVISOR */}
        <Route
          path="rrhh/empleados"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR]}>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="rrhh/empleados/nuevo"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR]}>
              <EmployeeFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="rrhh/empleados/:id/editar"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR]}>
              <EmployeeFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="rrhh/empleados/:id"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR]}>
              <EmployeeDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Módulo SST - Accesible para ADMIN, SUPERVISOR y MONITOR */}
        <Route
          path="sst/inventario"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.MONITOR]}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="sst/entregas"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.MONITOR]}>
              <DeliveriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="sst/renovaciones"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.MONITOR]}>
              <RenewalsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="sst/incidentes"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR]}>
              <IncidentsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="sst/catalogo"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR]}>
              <MasterCatalogPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="activos/inventario"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR]}>
              <AssetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="activos/configuracion"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <AssetConfigPage />
            </ProtectedRoute>
          }
        />

        {/* Módulo Alimentación */}

        {/* Menús - ADMIN, SUPERVISOR y PROVIDER pueden gestionar */}
        <Route
          path="alimentacion/menus"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.PROVIDER]}>
              <MenusPage />
            </ProtectedRoute>
          }
        />



        {/* Pedidos - Accesible para todos los usuarios autenticados (filtro interno) */}
        <Route
          path="alimentacion/pedidos"
          element={
            <ProtectedRoute>
              <FoodOrdersPage />
            </ProtectedRoute>
          }
        />

        {/* Configuración de Tarifas - Solo ADMIN y SUPERVISOR */}
        <Route
          path="alimentacion/tarifas"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR]}>
              <RolePricingPage />
            </ProtectedRoute>
          }
        />

        {/* Configuración de Horarios/Servicio - ADMIN y PROVIDER (y Supervisor) */}
        <Route
          path="alimentacion/configuracion"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.PROVIDER]}>
              <FoodConfigPage />
            </ProtectedRoute>
          }
        />

        {/* Reportes - Solo ADMIN y SUPERVISOR */}
        <Route
          path="alimentacion/reportes"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR]}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Módulo Administración - Solo ADMIN */}
        <Route
          path="admin/estaciones"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <StationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/usuarios"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <SystemUsersPage />
            </ProtectedRoute>
          }
        />

        {/* Nueva Configuración Modular */}
        <Route
          path="admin/configuracion"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <SettingsLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<GeneralSettings />} />
          <Route path="apariencia" element={<AppearanceSettings />} />
          <Route path="perfil" element={<ProfileSettings />} />
          <Route path="notificaciones" element={<NotificationSettings />} />
          <Route path="areas" element={<AreaSettings />} />
          <Route path="seguridad" element={<SecuritySettings />} />

        </Route>
      </Route>


      {/* Páginas de error */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default AppRoutes
