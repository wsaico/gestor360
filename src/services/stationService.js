import supabase from './supabase'

/**
 * Servicio para gestión de estaciones
 */
const stationService = {
  /**
   * Obtener todas las estaciones activas
   */
  async getAll(includeInactive = false) {
    try {
      let query = supabase
        .from('stations')
        .select('*')
        .order('name', { ascending: true })

      // Por defecto solo mostrar estaciones activas
      if (!includeInactive) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching stations:', error)
      throw new Error('Error al cargar las estaciones')
    }
  },

  /**
   * Obtener una estación por ID
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching station:', error)
      throw new Error('Error al cargar la estación')
    }
  },

  /**
   * Obtener una estación por código
   */
  async getByCode(code) {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .eq('code', code)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching station by code:', error)
      throw new Error('Error al cargar la estación')
    }
  },

  /**
   * Crear una nueva estación
   */
  async create(stationData) {
    try {
      const { data, error } = await supabase
        .from('stations')
        .insert([stationData])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating station:', error)
      if (error.code === '23505') {
        throw new Error('Ya existe una estación con ese código')
      }
      throw new Error('Error al crear la estación')
    }
  },

  /**
   * Actualizar una estación existente
   */
  async update(id, stationData) {
    try {
      const { data, error } = await supabase
        .from('stations')
        .update(stationData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating station:', error)
      if (error.code === '23505') {
        throw new Error('Ya existe una estación con ese código')
      }
      throw new Error('Error al actualizar la estación')
    }
  },

  /**
   * Verificar si una estación tiene datos asociados
   */
  async hasAssociatedData(id) {
    try {
      // Verificar empleados
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('station_id', id)
        .limit(1)

      if (empError) throw empError

      // Verificar usuarios
      const { data: users, error: usrError } = await supabase
        .from('system_users')
        .select('id')
        .eq('station_id', id)
        .limit(1)

      if (usrError) throw usrError

      return (employees && employees.length > 0) || (users && users.length > 0)
    } catch (error) {
      console.error('Error checking associated data:', error)
      return false
    }
  },

  /**
   * Archivar una estación (soft delete)
   */
  async archive(id) {
    try {
      const { data, error } = await supabase
        .from('stations')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error archiving station:', error)
      throw new Error('Error al archivar la estación')
    }
  },

  /**
   * Reactivar una estación archivada
   */
  async reactivate(id) {
    try {
      const { data, error } = await supabase
        .from('stations')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error reactivating station:', error)
      throw new Error('Error al reactivar la estación')
    }
  },

  /**
   * Eliminar físicamente una estación (solo si no tiene datos asociados)
   */
  async delete(id) {
    try {
      // Verificar si tiene datos asociados
      const hasData = await this.hasAssociatedData(id)

      if (hasData) {
        throw new Error('No se puede eliminar la estación porque tiene empleados o usuarios asociados. Use la opción de archivar en su lugar.')
      }

      const { error } = await supabase
        .from('stations')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting station:', error)
      if (error.code === '23503') {
        throw new Error('No se puede eliminar la estación porque tiene datos asociados')
      }
      throw error
    }
  }
}

export default stationService
