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
          setStation(currentStation)
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
    setStation(updatedStation)
    if (updatedStation) {
      localStorage.setItem('gestor360_station_data', JSON.stringify(updatedStation))
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

  const value = {
    user,
    station,
    stations,
    loadingStations,
    loading,
    isAuthenticated,
    login,
    logout,
    hasRole,
    isGlobalAdmin,
    updateUser,
    updateStation,
    selectStation,
    fetchStations
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
