import supabase from './supabase'

/**
 * Servicio para gestión de cargos (job_roles)
 */
const jobRoleService = {
  /**
   * Obtener todos los cargos activos
   */
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('job_roles')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching job roles:', error)
      throw new Error('Error al cargar los cargos')
    }
  },

  /**
   * Obtener todos los cargos (incluidos inactivos)
   */
  async getAllWithInactive() {
    try {
      const { data, error } = await supabase
        .from('job_roles')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching all job roles:', error)
      throw new Error('Error al cargar todos los cargos')
    }
  },

  /**
   * Obtener un cargo por ID
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('job_roles')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching job role:', error)
      throw new Error('Error al cargar el cargo')
    }
  },

  /**
   * Crear un nuevo cargo
   */
  async create(jobRoleData) {
    try {
      const { data, error } = await supabase
        .from('job_roles')
        .insert([jobRoleData])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating job role:', error)
      if (error.code === '23505') {
        throw new Error('Ya existe un cargo con ese nombre')
      }
      throw new Error('Error al crear el cargo')
    }
  },

  /**
   * Actualizar un cargo existente
   */
  async update(id, jobRoleData) {
    try {
      const { data, error } = await supabase
        .from('job_roles')
        .update(jobRoleData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating job role:', error)
      if (error.code === '23505') {
        throw new Error('Ya existe un cargo con ese nombre')
      }
      throw new Error('Error al actualizar el cargo')
    }
  },

  /**
   * Desactivar un cargo (soft delete)
   */
  async deactivate(id) {
    try {
      const { data, error } = await supabase
        .from('job_roles')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error deactivating job role:', error)
      throw new Error('Error al desactivar el cargo')
    }
  },

  /**
   * Activar un cargo
   */
  async activate(id) {
    try {
      const { data, error } = await supabase
        .from('job_roles')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error activating job role:', error)
      throw new Error('Error al activar el cargo')
    }
  },

  /**
   * Eliminar permanentemente un cargo (solo si no tiene empleados asociados)
   */
  async delete(id) {
    try {
      const { error } = await supabase
        .from('job_roles')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting job role:', error)
      if (error.code === '23503') {
        throw new Error('No se puede eliminar el cargo porque tiene empleados asociados')
      }
      throw new Error('Error al eliminar el cargo')
    }
  }
}

export default jobRoleService
