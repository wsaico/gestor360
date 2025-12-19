import supabase from './supabase'
import { STORAGE_KEYS } from '@utils/constants'

/**
 * Servicio de autenticación con Supabase
 * Maneja login, logout y validación de sesión
 */
class AuthService {
  /**
   * Inicia sesión con email y password
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña del usuario
   * @returns {Promise<Object>} - Datos del usuario autenticados
   */
  async login(email, password) {
    try {
      // Autenticar con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) throw authError

      // Obtener datos adicionales del usuario desde system_users
      const { data: userData, error: userError } = await supabase
        .from('system_users')
        .select('*, stations(*)')
        .eq('email', email)
        .single()

      if (userError) throw userError

      // Formatear datos del usuario
      const user = {
        id: userData.id,
        email: userData.email,
        username: userData.username,
        role: userData.role,
        station_id: userData.station_id,
        avatar_url: userData.avatar_url,
        is_active: userData.is_active
      }

      const station = userData.stations || null

      // Guardar datos en localStorage
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, authData.session.access_token)
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, authData.session.refresh_token)
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user))

      if (station) {
        localStorage.setItem(STORAGE_KEYS.STATION_DATA, JSON.stringify(station))
      }

      return { user, station }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  /**
   * Cierra la sesión actual
   */
  async logout() {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error during logout:', error)
    } finally {
      this.clearSession()
    }
  }

  /**
   * Limpia la sesión del usuario (localStorage)
   */
  clearSession() {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER_DATA)
    localStorage.removeItem(STORAGE_KEYS.STATION_DATA)
  }

  /**
   * Obtiene la sesión actual de Supabase
   * @returns {Promise<Object|null>}
   */
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  /**
   * Obtiene el usuario actual desde localStorage
   * @returns {Object|null} - Datos del usuario o null si no está logueado
   */
  getCurrentUser() {
    try {
      const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA)
      return userData ? JSON.parse(userData) : null
    } catch (error) {
      console.error('Error parsing user data:', error)
      return null
    }
  }

  /**
   * Obtiene la estación actual desde localStorage
   * @returns {Object|null} - Datos de la estación o null
   */
  getCurrentStation() {
    try {
      const stationData = localStorage.getItem(STORAGE_KEYS.STATION_DATA)
      return stationData ? JSON.parse(stationData) : null
    } catch (error) {
      console.error('Error parsing station data:', error)
      return null
    }
  }

  /**
   * Verifica si el usuario está autenticado
   * @returns {boolean}
   */
  isAuthenticated() {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    return !!token
  }

  /**
   * Verifica si el usuario tiene un rol específico
   * @param {string|string[]} roles - Rol o array de roles permitidos
   * @returns {boolean}
   */
  hasRole(roles) {
    const user = this.getCurrentUser()

    if (!user || !user.role) return false

    const allowedRoles = Array.isArray(roles) ? roles : [roles]
    return allowedRoles.includes(user.role)
  }

  /**
   * Verifica si el usuario es administrador global
   * @returns {boolean}
   */
  isGlobalAdmin() {
    const user = this.getCurrentUser()
    return user?.role === 'ADMIN' && !user?.station_id
  }

  /**
   * Obtiene el token de acceso actual
   * @returns {string|null}
   */
  getAccessToken() {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  }
}

export default new AuthService()
