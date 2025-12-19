import { supabase } from './supabase'

/**
 * Servicio de Gestión de Organizaciones
 * Sistema configurable para gestionar cualquier tipo de empresa/cliente
 * Ejemplos: Aerolíneas, Clientes, Proveedores, Contratistas, Socios, etc.
 */
class OrganizationService {
  /**
   * Obtiene todas las organizaciones
   * @param {boolean} activeOnly - Solo activas
   * @param {string} type - Filtrar por tipo (opcional)
   * @returns {Promise<Array>} - Lista de organizaciones
   */
  async getAll(activeOnly = false, type = null) {
    try {
      let query = supabase
        .from('organizations')
        .select('*')
        .order('name', { ascending: true })

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      if (type) {
        query = query.eq('organization_type', type)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching organizations:', error)
      throw new Error(error.message || 'Error al cargar organizaciones')
    }
  }

  /**
   * Obtiene una organización por ID
   * @param {string} id - ID de la organización
   * @returns {Promise<Object>} - Datos de la organización
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error fetching organization:', error)
      throw new Error(error.message || 'Error al cargar organización')
    }
  }

  /**
   * Obtiene una organización por código
   * @param {string} code - Código único
   * @returns {Promise<Object|null>} - Datos de la organización o null
   */
  async getByCode(code) {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('code', code)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      return data || null
    } catch (error) {
      console.error('Error fetching organization by code:', error)
      throw new Error(error.message || 'Error al buscar organización por código')
    }
  }

  /**
   * Crea una nueva organización
   * @param {Object} organizationData - Datos de la organización
   * @param {string} userId - ID del usuario que crea
   * @returns {Promise<Object>} - Organización creada
   */
  async create(organizationData, userId) {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert([{
          ...organizationData,
          created_by: userId,
          updated_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error creating organization:', error)
      throw new Error(error.message || 'Error al crear organización')
    }
  }

  /**
   * Actualiza una organización
   * @param {string} id - ID de la organización
   * @param {Object} organizationData - Datos a actualizar
   * @param {string} userId - ID del usuario que actualiza
   * @returns {Promise<Object>} - Organización actualizada
   */
  async update(id, organizationData, userId) {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .update({
          ...organizationData,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error updating organization:', error)
      throw new Error(error.message || 'Error al actualizar organización')
    }
  }

  /**
   * Desactiva una organización
   * @param {string} id - ID de la organización
   * @param {string} userId - ID del usuario
   * @returns {Promise<boolean>} - Éxito de la operación
   */
  async deactivate(id, userId) {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          is_active: false,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error deactivating organization:', error)
      throw new Error(error.message || 'Error al desactivar organización')
    }
  }

  /**
   * Reactiva una organización
   * @param {string} id - ID de la organización
   * @param {string} userId - ID del usuario
   * @returns {Promise<boolean>} - Éxito de la operación
   */
  async reactivate(id, userId) {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          is_active: true,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error reactivating organization:', error)
      throw new Error(error.message || 'Error al reactivar organización')
    }
  }

  /**
   * Elimina una organización
   * @param {string} id - ID de la organización
   * @returns {Promise<boolean>} - Éxito de la operación
   */
  async delete(id) {
    try {
      // Verificar si tiene activos asociados
      const { count, error: countError } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', id)

      if (countError) throw countError

      if (count > 0) {
        throw new Error(`No se puede eliminar. La organización tiene ${count} activos asociados.`)
      }

      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error deleting organization:', error)
      throw new Error(error.message || 'Error al eliminar organización')
    }
  }

  /**
   * Busca organizaciones por término
   * @param {string} searchTerm - Término de búsqueda
   * @returns {Promise<Array>} - Organizaciones encontradas
   */
  async search(searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return await this.getAll(true)
      }

      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('is_active', true)
        .or(`code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,short_name.ilike.%${searchTerm}%,country.ilike.%${searchTerm}%,industry.ilike.%${searchTerm}%`)
        .order('name', { ascending: true })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error searching organizations:', error)
      throw new Error(error.message || 'Error al buscar organizaciones')
    }
  }

  /**
   * Obtiene estadísticas de activos por organización
   * @param {string} organizationId - ID de la organización
   * @returns {Promise<Object>} - Estadísticas
   */
  async getAssetStats(organizationId) {
    try {
      const { data: assets, error } = await supabase
        .from('assets')
        .select('status, current_value')
        .eq('organization_id', organizationId)
        .eq('is_active', true)

      if (error) throw error

      const stats = {
        total: assets.length,
        by_status: {},
        total_value: assets.reduce((sum, asset) => sum + (asset.current_value || 0), 0)
      }

      assets.forEach(asset => {
        const status = asset.status || 'DISPONIBLE'
        if (!stats.by_status[status]) {
          stats.by_status[status] = 0
        }
        stats.by_status[status]++
      })

      return stats
    } catch (error) {
      console.error('Error getting organization asset stats:', error)
      throw new Error(error.message || 'Error al obtener estadísticas')
    }
  }

  /**
   * Obtiene tipos de organización únicos (para filtros dinámicos)
   * @returns {Promise<Array>} - Lista de tipos
   */
  async getOrganizationTypes() {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('organization_type')
        .eq('is_active', true)

      if (error) throw error

      // Obtener tipos únicos
      const uniqueTypes = [...new Set(data.map(org => org.organization_type))]
      return uniqueTypes.filter(type => type !== null)
    } catch (error) {
      console.error('Error getting organization types:', error)
      throw new Error(error.message || 'Error al obtener tipos de organización')
    }
  }

  /**
   * Obtiene organizaciones agrupadas por tipo
   * @returns {Promise<Object>} - Organizaciones agrupadas
   */
  async getGroupedByType() {
    try {
      const organizations = await this.getAll(true)

      const grouped = organizations.reduce((acc, org) => {
        const type = org.organization_type || 'OTRO'
        if (!acc[type]) {
          acc[type] = []
        }
        acc[type].push(org)
        return acc
      }, {})

      return grouped
    } catch (error) {
      console.error('Error grouping organizations by type:', error)
      throw new Error(error.message || 'Error al agrupar organizaciones')
    }
  }
}

export default new OrganizationService()
