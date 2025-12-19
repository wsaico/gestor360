import supabase from './supabase'

/**
 * Servicio para gestión de configuración de precios por cargo
 */
class PricingService {
  /**
   * Obtiene todas las configuraciones de precio de una estación
   * @param {string} stationId - ID de la estación
   * @returns {Promise<Array>}
   */
  async getAll(stationId) {
    try {
      const { data, error } = await supabase
        .from('role_pricing_config')
        .select('*')
        .eq('station_id', stationId)

        .order('role_name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching pricing config:', error)
      throw error
    }
  }

  /**
   * Obtiene la configuración de precio para un cargo específico
   * @param {string} stationId - ID de la estación
   * @param {string} roleName - Nombre del cargo
   * @returns {Promise<Object|null>}
   */
  async getByRole(stationId, roleName) {
    try {
      const { data, error } = await supabase
        .from('role_pricing_config')
        .select('*')
        .eq('station_id', stationId)
        .eq('role_name', roleName)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null
        }
        throw error
      }
      return data
    } catch (error) {
      console.error('Error fetching pricing for role:', error)
      throw error
    }
  }

  /**
   * Crea una nueva configuración de precio
   * @param {Object} pricingData - Datos de la configuración
   * @returns {Promise<Object>}
   */
  async create(pricingData) {
    try {
      const { data, error } = await supabase
        .from('role_pricing_config')
        .insert([pricingData])
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya existe una configuración para este cargo en esta estación')
        }
        throw new Error(error.message || 'Error al crear la configuración de precio')
      }
      return data
    } catch (error) {
      console.error('Error creating pricing config:', error)
      throw error
    }
  }

  /**
   * Actualiza una configuración de precio
   * @param {string} id - ID de la configuración
   * @param {Object} pricingData - Datos a actualizar
   * @returns {Promise<Object>}
   */
  async update(id, pricingData) {
    try {
      const { data, error } = await supabase
        .from('role_pricing_config')
        .update(pricingData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message || 'Error al actualizar la configuración de precio')
      }
      return data
    } catch (error) {
      console.error('Error updating pricing config:', error)
      throw error
    }
  }

  /**
   * Elimina una configuración de precio
   * @param {string} id - ID de la configuración
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    try {
      const { error } = await supabase
        .from('role_pricing_config')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(error.message || 'Error al eliminar la configuración de precio')
      }
      return true
    } catch (error) {
      console.error('Error deleting pricing config:', error)
      throw error
    }
  }

  /**
   * Calcula el costo total (empleado + empresa)
   * @param {Object} pricing - Configuración de precio
   * @returns {number}
   */
  calculateTotalCost(pricing) {
    if (!pricing) return 0
    return Number(pricing.employee_cost) + Number(pricing.company_subsidy)
  }

  /**
   * Obtiene configuraciones de precio para múltiples cargos
   * @param {string} stationId - ID de la estación
   * @param {Array<string>} roleNames - Array de nombres de cargos
   * @returns {Promise<Object>} - Objeto con cargos como keys
   */
  async getBulkByRoles(stationId, roleNames) {
    try {
      const { data, error } = await supabase
        .from('role_pricing_config')
        .select('*')
        .eq('station_id', stationId)
        .in('role_name', roleNames)


      if (error) throw error

      // Convertir array a objeto con role_name como key
      const pricingMap = {}
        ; (data || []).forEach(pricing => {
          pricingMap[pricing.role_name] = pricing
        })

      return pricingMap
    } catch (error) {
      console.error('Error fetching bulk pricing:', error)
      throw error
    }
  }
}

export default new PricingService()
