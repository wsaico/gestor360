import { createContext, useContext, useState, useEffect } from 'react'
import authService from '@services/authService'
import supabase from '@services/supabase'

const AuthContext = createContext(null)

/**
 * Hook personalizado para acceder al contexto de autenticación
 */
export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }

  return context
}

/**
 * Provider de autenticación
 * Maneja el estado global de autenticación de la aplicación
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [station, setStation] = useState(null)
  const [stations, setStations] = useState([])
  const [loadingStations, setLoadingStations] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  /**
   * Inicializa el estado de autenticación al cargar la aplicación
   */
  useEffect(() => {
    const initAuth = () => {
      try {
        if (authService.isAuthenticated()) {
          const currentUser = authService.getCurrentUser()
          const currentStation = authService.getCurrentStation()

          setUser(currentUser)

          // Safety: ensure station is an object (not array)
          const sanitizedStation = Array.isArray(currentStation) ? currentStation[0] : currentStation
          setStation(sanitizedStation)
          setIsAuthenticated(true)
        } else {
          setUser(null)
          setStation(null)
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        setUser(null)
        setStation(null)
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  /**
   * Carga todas las estaciones disponibles
   * Útil para admins globales y selectores de estación
   */
  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      fetchStations()
    }
  }, [isAuthenticated, user])

  /**
   * Obtiene todas las estaciones de la base de datos
   * @returns {Promise<Array>}
   */
  const fetchStations = async () => {
    if (loadingStations) return stations

    try {
      setLoadingStations(true)
      const { data, error } = await supabase
        .from('stations')
        .select('id, name, code, location')
        .order('name')

      if (error) throw error
      setStations(data || [])
      return data || []
    } catch (error) {
      console.error('Error fetching stations:', error)
      return []
    } finally {
      setLoadingStations(false)
    }
  }

  /**
   * Inicia sesión
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña del usuario
   */
  const login = async (email, password) => {
    try {
      const { user: loggedUser, station: loggedStation } = await authService.login(email, password)

      setUser(loggedUser)
      setStation(loggedStation)
      setIsAuthenticated(true)

      return { success: true, user: loggedUser, station: loggedStation }
    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        error: error.response?.data?.message || 'Error al iniciar sesión'
      }
    }
  }

  /**
   * Registra un nuevo usuario
   * @param {string} email
   * @param {string} password
   * @param {string} username
   */
  const register = async (email, password, username) => {
    try {
      const data = await authService.register(email, password, username)
      return { success: true, data }
    } catch (error) {
      console.error('Register error:', error)
      return {
        success: false,
        error: error.message || 'Error al registrarse'
      }
    }
  }

  /**
   * Cierra sesión
   */
  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setStation(null)
      setStations([])
      setIsAuthenticated(false)
    }
  }

  /**
   * Verifica si el usuario tiene un rol específico
   * @param {string|string[]} roles - Rol o array de roles permitidos
   * @returns {boolean}
   */
  const hasRole = (roles) => {
    return authService.hasRole(roles)
  }

  /**
   * Verifica si el usuario tiene un permiso específico (Capability)
   * @param {string} permission - ID del permiso (ej. 'EMPLOYEES_MANAGE')
   * @returns {boolean}
   */
  const hasPermission = (permission) => {
    // Super Admin (Global ADMIN) has implicit ALL access
    if (isGlobalAdmin()) return true

    // Check if user has explicit permission
    if (user?.permissions?.includes('ALL_ACCESS')) return true
    return user?.permissions?.includes(permission) || false
  }

  /**
   * Verifica si el usuario es administrador global
   * @returns {boolean}
   */
  const isGlobalAdmin = () => {
    return authService.isGlobalAdmin()
  }

  /**
   * Actualiza los datos del usuario en el contexto
   * @param {Object} updatedUser - Datos actualizados del usuario
   */
  const updateUser = (updatedUser) => {
    setUser(updatedUser)
    localStorage.setItem('gestor360_user_data', JSON.stringify(updatedUser))
  }

  /**
   * Actualiza los datos de la estación en el contexto
   * @param {Object} updatedStation - Datos actualizados de la estación
   */
  const updateStation = (updatedStation) => {
    const sanitizedStation = Array.isArray(updatedStation) ? updatedStation[0] : updatedStation
    setStation(sanitizedStation)
    if (sanitizedStation) {
      localStorage.setItem('gestor360_station_data', JSON.stringify(sanitizedStation))
    } else {
      localStorage.removeItem('gestor360_station_data')
    }
  }

  /**
   * Selecciona una estación por ID
   * @param {string} stationId - ID de la estación
   * @returns {Object|null} - La estación seleccionada
   */
  const selectStation = (stationId) => {
    const selectedStation = stations.find(s => s.id === stationId)
    if (selectedStation) {
      updateStation(selectedStation)
      return selectedStation
    }
    return null
  }

  /**
   * Obtiene el ID de estación efectivo para queries
   * Centraliza la lógica de filtrado por estación
   * @param {string} selectedStationId - Estación seleccionada en UI (opcional)
   * @returns {string|null} - ID de estación para filtrar, o null para ver todas
   */
  const getEffectiveStationId = (selectedStationId = null) => {
    // Si se provee un ID explícito (ej: de un selector local), usarlo
    if (selectedStationId) return selectedStationId

    // Si es Global Admin (ADMIN sin estación asignada)
    // Devolvemos la estación seleccionada en el contexto global (si hay una)
    if (user?.role === 'ADMIN' && !user?.station_id) {
      return station?.id || null
    }

    // Si es Station User, siempre devolvemos su estación asignada (station?.id) 
    // lo cual es robusto ya que station se sincroniza con el usuario
    return station?.id || null
  }

  const value = {
    user,
    station,
    stations,
    loadingStations,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    hasRole,
    hasPermission,
    isGlobalAdmin,
    updateUser,
    updateStation,
    selectStation,
    fetchStations,
    getEffectiveStationId
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
