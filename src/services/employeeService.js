import { createClient } from '@supabase/supabase-js'
import supabase from './supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Servicio para gestión de empleados
 */
class EmployeeService {
  /**
   * Obtiene todos los empleados de una estación
   * @param {string} stationId - ID de la estación (opcional para Admin Global)
   * @param {Object} filters - Filtros opcionales { status, search }
   * @returns {Promise<Array>}
   */
  /**
   * Obtiene todos los empleados de una estación con paginación
   * @param {string} stationId - ID de la estación (opcional para Admin Global)
   * @param {Object} filters - Filtros opcionales { status, search, activeOnly }
   * @param {number} page - Número de página (1-based)
   * @param {number} limit - Items por página
   * @returns {Promise<{data: Array, count: number}>}
   */
  async getAll(stationId = null, filters = {}, page = 1, limit = 50) {
    try {
      let query = supabase
        .from('employees')
        .select(`
          *,
          station:stations(id, code, name, location)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      if (stationId) {
        query = query.eq('station_id', stationId)
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      // Filtro helper para activos
      if (filters.activeOnly) {
        query = query.neq('status', 'CESADO')
      }

      if (filters.search) {
        const term = filters.search.toLowerCase()
        // Supabase basic search - for complex search consider RPC or text search
        query = query.or(`full_name.ilike.%${term}%,dni.ilike.%${term}%`)
      }

      // Pagination
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error
      return { data: data || [], count: count || 0 }
    } catch (error) {
      console.error('Error fetching employees:', error)
      throw error
    }
  }

  /**
   * Obtiene un empleado por ID
   * @param {string} id - ID del empleado
   * @returns {Promise<Object>}
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          station:stations(id, code, name, location)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching employee:', error)
      throw error
    }
  }

  /**
   * Crea múltiples empleados
   * @param {Array} employees - Lista de empleados a crear
   * @returns {Promise<Array>} - Empleados creados
   */
  async createBulk(employees) {
    try {
      if (!employees || employees.length === 0) return []

      const { data, error } = await supabase
        .from('employees')
        .insert(employees)
        .select()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error bulk creating employees:', error)
      throw new Error(error.message || 'Error al crear empleados masivamente')
    }
  }

  /**
   * Obtiene un empleado por DNI (Admin context)
   * @param {string} dni
   * @returns {Promise<Object|null>}
   */
  async getByDni(dni) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, dni')
        .eq('dni', dni)
        .maybeSingle()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching employee by DNI:', error)
      return null
    }
  }

  /**
   * Obtiene un empleado por Email
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  async getByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, email')
        .eq('email', email)
        .maybeSingle()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching employee by Email:', error)
      return null
    }
  }

  /**
   * Crea un nuevo empleado y su usuario de Auth
   * @param {Object} employeeData - Datos del empleado
   * @returns {Promise<Object>}
   */
  async create(employeeData) {
    try {
      // Validar email
      if (!employeeData.email) {
        throw new Error('El email es obligatorio para crear el usuario de acceso.')
      }

      // 1. Crear usuario en Auth (Password = DNI)
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      })

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: employeeData.email,
        password: employeeData.dni, // Password inicial es el DNI
        options: {
          data: {
            full_name: employeeData.full_name,
            dni: employeeData.dni,
            role: 'EMPLOYEE', // Role metadata for Auth
            station_id: employeeData.station_id
          }
        }
      })

      if (authError) {
        console.error('Auth signUp error:', authError)
        throw new Error('Error al registrar usuario en Auth: ' + authError.message)
      }

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario en Auth')
      }

      // 2. Crear registro en employees usando el ID de Auth
      const finalData = {
        ...employeeData,
        id: authData.user.id // VINCULACIÓN CRÍTICA
      }

      const { data, error } = await supabase
        .from('employees')
        .insert([finalData])
        .select()
        .single()

      if (error) {
        console.error('Supabase create error:', error)
        // Rollback idealmente
        if (error.code === '42501') {
          throw new Error('No tienes permisos para crear empleados. Verifica las políticas RLS.')
        }
        if (error.code === '23505') {
          throw new Error('Ya existe un empleado con ese DNI o Email en esta estación')
        }
        throw new Error(error.message || 'Error al crear el empleado')
      }
      return data
    } catch (error) {
      console.error('Error creating employee:', error)
      throw error
    }
  }

  /**
   * Actualiza un empleado
   * @param {string} id - ID del empleado
   * @param {Object} employeeData - Datos a actualizar
   * @returns {Promise<Object>}
   */
  async update(id, employeeData) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .update(employeeData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Supabase update error:', error)
        if (error.code === '42501') {
          throw new Error('No tienes permisos para actualizar este empleado. Verifica las políticas RLS.')
        }
        if (error.code === '23505') {
          throw new Error('Ya existe un empleado con ese DNI en esta estación')
        }
        throw new Error(error.message || 'Error al actualizar el empleado')
      }
      return data
    } catch (error) {
      console.error('Error updating employee:', error)
      throw error
    }
  }

  /**
   * Marca un empleado como cesado
   * @param {string} id - ID del empleado
   * @returns {Promise<Object>}
   */
  async markAsInactive(id) {
    return this.update(id, { status: 'CESADO' })
  }

  /**
   * Elimina permanentemente un empleado
   * ADVERTENCIA: Esta acción no se puede deshacer
   * @param {string} id - ID del empleado
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Supabase delete error:', error)
        if (error.code === '42501') {
          throw new Error('No tienes permisos para eliminar empleados. Verifica las políticas RLS.')
        }
        if (error.code === '23503') {
          throw new Error('No se puede eliminar el empleado porque tiene datos asociados (documentos, etc.)')
        }
        throw new Error(error.message || 'Error al eliminar el empleado')
      }
      return true
    } catch (error) {
      console.error('Error deleting employee:', error)
      throw error
    }
  }

  /**
   * Obtiene los documentos de un empleado
   * @param {string} employeeId - ID del empleado
   * @returns {Promise<Array>}
   */
  async getDocuments(employeeId) {
    try {
      const { data, error } = await supabase
        .from('employee_docs')
        .select('*')
        .eq('employee_id', employeeId)
        .order('expiry_date', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching employee documents:', error)
      throw error
    }
  }

  /**
   * Busca un empleado por DNI (Público)
   * Usa la función RPC segura get_employee_by_dni_public
   * @param {string} dni - DNI del empleado (8 dígitos)
   * @returns {Promise<Object|null>}
   */
  async getByDocumentNumber(dni) {
    try {

      const { data, error } = await supabase.rpc('get_employee_by_dni_public', {
        p_dni: dni
      })

      if (error) {
        console.error('Error RPC Details:', error)
        throw error
      }

      // La función retorna un array (porque es TABLE), tomamos el primero
      return data && data.length > 0 ? data[0] : null
    } catch (error) {
      console.error('Error fetching employee by DNI:', error)
      throw error
    }
  }
}

export default new EmployeeService()
