import { supabase } from './supabase'

/**
 * Servicio de Gestión de Aerolíneas
 * Permite gestionar aerolíneas para activos multi-empresa
 */
class AirlineService {
  /**
   * Obtiene todas las aerolíneas
   * @param {boolean} activeOnly - Solo activas
   * @returns {Promise<Array>} - Lista de aerolíneas
   */
  async getAll(activeOnly = false) {
    try {
      let query = supabase
        .from('airlines')
        .select('*')
        .order('name', { ascending: true })

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching airlines:', error)
      throw new Error(error.message || 'Error al cargar aerolíneas')
    }
  }

  /**
   * Obtiene una aerolínea por ID
   * @param {string} id - ID de la aerolínea
   * @returns {Promise<Object>} - Datos de la aerolínea
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('airlines')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error fetching airline:', error)
      throw new Error(error.message || 'Error al cargar aerolínea')
    }
  }

  /**
   * Obtiene una aerolínea por código
   * @param {string} code - Código IATA/ICAO
   * @returns {Promise<Object|null>} - Datos de la aerolínea o null
   */
  async getByCode(code) {
    try {
      const { data, error } = await supabase
        .from('airlines')
        .select('*')
        .eq('code', code)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      return data || null
    } catch (error) {
      console.error('Error fetching airline by code:', error)
      throw new Error(error.message || 'Error al buscar aerolínea por código')
    }
  }

  /**
   * Crea una nueva aerolínea
   * @param {Object} airlineData - Datos de la aerolínea
   * @returns {Promise<Object>} - Aerolínea creada
   */
  async create(airlineData) {
    try {
      const { data, error } = await supabase
        .from('airlines')
        .insert([{
          ...airlineData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error creating airline:', error)
      throw new Error(error.message || 'Error al crear aerolínea')
    }
  }

  /**
   * Actualiza una aerolínea
   * @param {string} id - ID de la aerolínea
   * @param {Object} airlineData - Datos a actualizar
   * @returns {Promise<Object>} - Aerolínea actualizada
   */
  async update(id, airlineData) {
    try {
      const { data, error } = await supabase
        .from('airlines')
        .update({
          ...airlineData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error updating airline:', error)
      throw new Error(error.message || 'Error al actualizar aerolínea')
    }
  }

  /**
   * Desactiva una aerolínea
   * @param {string} id - ID de la aerolínea
   * @returns {Promise<boolean>} - Éxito de la operación
   */
  async deactivate(id) {
    try {
      const { error } = await supabase
        .from('airlines')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error deactivating airline:', error)
      throw new Error(error.message || 'Error al desactivar aerolínea')
    }
  }

  /**
   * Reactiva una aerolínea
   * @param {string} id - ID de la aerolínea
   * @returns {Promise<boolean>} - Éxito de la operación
   */
  async reactivate(id) {
    try {
      const { error } = await supabase
        .from('airlines')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error reactivating airline:', error)
      throw new Error(error.message || 'Error al reactivar aerolínea')
    }
  }

  /**
   * Elimina una aerolínea
   * @param {string} id - ID de la aerolínea
   * @returns {Promise<boolean>} - Éxito de la operación
   */
  async delete(id) {
    try {
      // Verificar si tiene activos asociados
      const { count, error: countError } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('airline_id', id)

      if (countError) throw countError

      if (count > 0) {
        throw new Error(`No se puede eliminar. La aerolínea tiene ${count} activos asociados.`)
      }

      const { error } = await supabase
        .from('airlines')
        .delete()
        .eq('id', id)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error deleting airline:', error)
      throw new Error(error.message || 'Error al eliminar aerolínea')
    }
  }

  /**
   * Busca aerolíneas por término
   * @param {string} searchTerm - Término de búsqueda
   * @returns {Promise<Array>} - Aerolíneas encontradas
   */
  async search(searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return await this.getAll(true)
      }

      const { data, error } = await supabase
        .from('airlines')
        .select('*')
        .eq('is_active', true)
        .or(`code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,country.ilike.%${searchTerm}%`)
        .order('name', { ascending: true })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error searching airlines:', error)
      throw new Error(error.message || 'Error al buscar aerolíneas')
    }
  }

  /**
   * Obtiene estadísticas de activos por aerolínea
   * @param {string} airlineId - ID de la aerolínea
   * @returns {Promise<Object>} - Estadísticas
   */
  async getAssetStats(airlineId) {
    try {
      const { data: assets, error } = await supabase
        .from('assets')
        .select('status, current_value')
        .eq('airline_id', airlineId)
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
      console.error('Error getting airline asset stats:', error)
      throw new Error(error.message || 'Error al obtener estadísticas')
    }
  }
}

export default new AirlineService()
