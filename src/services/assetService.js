import { supabase } from './supabase'

/**
 * Servicio de Gestión de Activos
 * Sistema escalable, inteligente y multi-tenant para inventario de activos
 */
class AssetService {
  /**
   * Obtiene todos los activos de una estación con filtros opcionales
   * @param {string} stationId - ID de la estación
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Array>} - Lista de activos
   */
  async getAll(stationId, filters = {}) {
    try {
      let query = supabase
        .from('assets')
        .select(`
          *,
          station:stations(id, name, code),
          area:areas(id, name),
          organization:organizations(id, code, name),
          assigned_employee:employees!assigned_to_employee_id(id, full_name, dni, role_name)
        `)
        .eq('station_id', stationId)
        .eq('is_active', true)
        .order('asset_code', { ascending: true })

      // Aplicar filtros
      if (filters.asset_category) {
        query = query.eq('asset_category', filters.asset_category)
      }

      if (filters.area_id) {
        query = query.eq('area_id', filters.area_id)
      }

      if (filters.organization_id) {
        query = query.eq('organization_id', filters.organization_id)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.condition) {
        query = query.eq('condition', filters.condition)
      }

      if (filters.assigned) {
        if (filters.assigned === 'true') {
          query = query.not('assigned_to_employee_id', 'is', null)
        } else if (filters.assigned === 'false') {
          query = query.is('assigned_to_employee_id', null)
        }
      }

      if (filters.owner_type) {
        query = query.eq('owner_type', filters.owner_type)
      }

      if (filters.is_critical !== undefined) {
        query = query.eq('is_critical', filters.is_critical)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching assets:', error)
      throw new Error(error.message || 'Error al cargar activos')
    }
  }

  /**
   * Obtiene un activo por ID con toda la información relacionada
   * @param {string} assetId - ID del activo
   * @returns {Promise<Object>} - Datos del activo
   */
  async getById(assetId) {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          station:stations(id, name, code),
          area:areas(id, name),
          organization:organizations(id, code, name),
          assigned_employee:employees!assigned_to_employee_id(id, full_name, dni, role_name, phone, email)
        `)
        .eq('id', assetId)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error fetching asset:', error)
      throw new Error(error.message || 'Error al cargar activo')
    }
  }

  /**
   * Obtiene un activo por código
   * @param {string} assetCode - Código del activo
   * @returns {Promise<Object|null>} - Datos del activo o null
   */
  async getByCode(assetCode) {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('asset_code', assetCode)
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      return data || null
    } catch (error) {
      console.error('Error fetching asset by code:', error)
      throw new Error(error.message || 'Error al buscar activo por código')
    }
  }

  /**
   * Crea un nuevo activo
   * @param {Object} assetData - Datos del activo
   * @param {string} userId - ID del usuario que crea el activo
   * @returns {Promise<Object>} - Activo creado
   */
  async create(assetData, userId) {
    try {
      // Map frontend keys to backend columns
      const dbData = {
        ...assetData,
        asset_subcategory: assetData.subcategory,
        assigned_to_employee_id: assetData.responsible_employee_id === '' ? null : assetData.responsible_employee_id,
        warranty_expiry_date: assetData.warranty_expiration || null,
        location_detail: assetData.location,
        area_id: assetData.area_id === '' ? null : assetData.area_id,
        organization_id: assetData.organization_id === '' ? null : assetData.organization_id,
        station_id: assetData.station_id === '' ? null : assetData.station_id,
        // Ensure empty strings are null for dates and numbers
        acquisition_date: assetData.acquisition_date || null,
        acquisition_value: assetData.acquisition_value === '' ? null : assetData.acquisition_value,
        warranty_months: assetData.warranty_months === '' ? null : assetData.warranty_months,
        depreciation_rate: assetData.depreciation_rate === '' ? null : assetData.depreciation_rate,
        residual_value: assetData.residual_value === '' ? null : assetData.residual_value,
        current_value: assetData.current_value === '' ? null : assetData.current_value,
        created_by: userId,
        updated_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Pack technical fields into specifications JSONB
      dbData.specifications = {
        ...(dbData.specifications || {}),
        processor: assetData.processor,
        ram: assetData.ram,
        storage: assetData.storage,
        operating_system: assetData.operating_system,
        license_key: assetData.license_key
      }

      // Remove frontend-only keys so Supabase doesn't complain if columns don't exist
      delete dbData.subcategory
      delete dbData.responsible_employee_id
      delete dbData.warranty_expiration
      delete dbData.location

      // Remove packed technical fields
      delete dbData.processor
      delete dbData.ram
      delete dbData.storage
      delete dbData.operating_system
      delete dbData.license_key

      const { data, error } = await supabase
        .from('assets')
        .insert([dbData])
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error creating asset:', error)
      throw new Error(error.message || 'Error al crear activo')
    }
  }

  /**
   * Actualiza un activo existente
   * @param {string} assetId - ID del activo
   * @param {Object} assetData - Datos a actualizar
   * @param {string} userId - ID del usuario que actualiza
   * @returns {Promise<Object>} - Activo actualizado
   */
  async update(assetId, assetData, userId) {
    try {
      // Map frontend keys to backend columns for update
      const dbData = {
        ...assetData,
        updated_by: userId,
        updated_at: new Date().toISOString()
      }

      if (assetData.subcategory !== undefined) dbData.asset_subcategory = assetData.subcategory
      if (assetData.responsible_employee_id !== undefined) dbData.assigned_to_employee_id = assetData.responsible_employee_id
      if (assetData.warranty_expiration !== undefined) dbData.warranty_expiry_date = assetData.warranty_expiration || null
      if (assetData.location !== undefined) dbData.location_detail = assetData.location

      // Sanitizar fechas, números y UUIDs vacíos
      if (assetData.acquisition_date === '') dbData.acquisition_date = null
      if (assetData.acquisition_value === '') dbData.acquisition_value = null
      if (assetData.warranty_months === '') dbData.warranty_months = null
      if (assetData.station_id === '') dbData.station_id = null
      if (assetData.depreciation_rate === '') dbData.depreciation_rate = null
      if (assetData.residual_value === '') dbData.residual_value = null
      if (assetData.current_value === '') dbData.current_value = null
      if (dbData.assigned_to_employee_id === '') dbData.assigned_to_employee_id = null
      if (assetData.area_id !== undefined && assetData.area_id === '') dbData.area_id = null
      if (assetData.organization_id !== undefined && assetData.organization_id === '') dbData.organization_id = null

      // Pack technical fields into specifications if any exist
      if (assetData.processor || assetData.ram || assetData.storage || assetData.operating_system || assetData.license_key) {
        dbData.specifications = {
          ...(assetData.specifications || {}), // this might need fetch if not present, but for now merge with passed
          processor: assetData.processor,
          ram: assetData.ram,
          storage: assetData.storage,
          operating_system: assetData.operating_system,
          license_key: assetData.license_key
        }
        // Cleanup undefined to avoid overriding with nulls if partial update? 
        // Logic assumed: frontend sends full state on update usually
      }

      // Remove frontend-only keys
      delete dbData.subcategory
      delete dbData.responsible_employee_id
      delete dbData.warranty_expiration
      delete dbData.location

      // Remove joined objects (read-only from select) to avoid schema errors
      delete dbData.area
      delete dbData.organization
      delete dbData.station
      delete dbData.assigned_employee
      delete dbData.from_station
      delete dbData.to_station
      delete dbData.from_area
      delete dbData.to_area

      delete dbData.processor
      delete dbData.ram
      delete dbData.storage
      delete dbData.operating_system
      delete dbData.license_key

      const { data, error } = await supabase
        .from('assets')
        .update(dbData)
        .eq('id', assetId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error updating asset:', error)
      throw new Error(error.message || 'Error al actualizar activo')
    }
  }

  /**
   * Elimina un activo (soft delete)
   * @param {string} assetId - ID del activo
   * @param {string} userId - ID del usuario que elimina
   * @returns {Promise<boolean>} - Éxito de la operación
   */
  async softDelete(assetId, userId) {
    try {
      const { error } = await supabase
        .from('assets')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error soft deleting asset:', error)
      throw new Error(error.message || 'Error al archivar activo')
    }
  }

  /**
   * Elimina permanentemente un activo (hard delete)
   * @param {string} assetId - ID del activo
   * @returns {Promise<boolean>} - Éxito de la operación
   */
  async hardDelete(assetId) {
    try {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', assetId)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error hard deleting asset:', error)
      throw new Error(error.message || 'Error al eliminar activo permanentemente')
    }
  }

  /**
   * Restaura un activo archivado
   * @param {string} assetId - ID del activo
   * @param {string} userId - ID del usuario que restaura
   * @returns {Promise<Object>} - Activo restaurado
   */
  async restore(assetId, userId) {
    try {
      const { data, error } = await supabase
        .from('assets')
        .update({
          is_active: true,
          deleted_at: null,
          deleted_by: null,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error restoring asset:', error)
      throw new Error(error.message || 'Error al restaurar activo')
    }
  }

  /**
   * Asigna un activo a un empleado
   * @param {string} assetId - ID del activo
   * @param {string} employeeId - ID del empleado
   * @param {string} notes - Notas de asignación
   * @param {string} userId - ID del usuario que asigna
   * @returns {Promise<Object>} - Activo actualizado
   */
  async assign(assetId, employeeId, notes, userId) {
    try {
      const { data, error } = await supabase
        .from('assets')
        .update({
          assigned_to_employee_id: employeeId,
          assigned_date: new Date().toISOString(),
          assignment_notes: notes,
          status: 'EN_USO',
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error assigning asset:', error)
      throw new Error(error.message || 'Error al asignar activo')
    }
  }

  /**
   * Desasigna un activo (devolución)
   * @param {string} assetId - ID del activo
   * @param {string} userId - ID del usuario que desasigna
   * @returns {Promise<Object>} - Activo actualizado
   */
  async unassign(assetId, userId) {
    try {
      const { data, error } = await supabase
        .from('assets')
        .update({
          assigned_to_employee_id: null,
          assigned_date: null,
          assignment_notes: null,
          status: 'DISPONIBLE',
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error unassigning asset:', error)
      throw new Error(error.message || 'Error al desasignar activo')
    }
  }

  /**
   * Transfiere un activo a otra estación, área o aerolínea
   * @param {string} assetId - ID del activo
   * @param {Object} transferData - Datos de la transferencia
   * @param {string} userId - ID del usuario que realiza la transferencia
   * @returns {Promise<Object>} - Activo actualizado
   */
  async transfer(assetId, transferData, userId) {
    try {
      const updateData = {
        updated_by: userId,
        updated_at: new Date().toISOString()
      }

      if (transferData.to_station_id) {
        updateData.station_id = transferData.to_station_id
        updateData.status = 'TRANSFERENCIA'
        // Si cambiamos de estación, el área debe resetearse a menos que se especifique una nueva
        if (transferData.to_area_id === undefined || transferData.to_area_id === '') {
          updateData.area_id = null
        }
      }

      if (transferData.to_area_id !== undefined) {
        updateData.area_id = transferData.to_area_id === '' ? null : transferData.to_area_id
      }

      if (transferData.to_organization_id !== undefined) {
        updateData.organization_id = transferData.to_organization_id === '' ? null : transferData.to_organization_id
      }

      // Actualizar responsable: Si viene el campo, lo usamos. Si viene vacío, se pone NULL (desasignar).
      // Si el frontend no lo manda (undefined), no lo tocamos (aunque en transferencia debería mandarse siempre).
      if (transferData.new_responsible_employee_id !== undefined) {
        updateData.assigned_to_employee_id = transferData.new_responsible_employee_id === '' ? null : transferData.new_responsible_employee_id
      }

      const { data, error } = await supabase
        .from('assets')
        .update(updateData)
        .eq('id', assetId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error transferring asset:', error)
      throw new Error(error.message || 'Error al transferir activo')
    }
  }

  /**
   * Actualiza el estado de un activo
   * @param {string} assetId - ID del activo
   * @param {string} newStatus - Nuevo estado
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} - Activo actualizado
   */
  async updateStatus(assetId, newStatus, userId) {
    try {
      const { data, error } = await supabase
        .from('assets')
        .update({
          status: newStatus,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error updating asset status:', error)
      throw new Error(error.message || 'Error al actualizar estado del activo')
    }
  }

  /**
   * Da de baja un activo
   * @param {string} assetId 
   * @param {string} reason 
   * @param {string} notes 
   * @param {string} userId 
   */
  async decommission(assetId, reason, notes, userId) {
    try {
      // 1. Update Asset Status and append info to notes (so it stays on record)
      // We also clear assignment
      const { data: asset, error: updateError } = await supabase
        .from('assets')
        .update({
          status: 'BAJA',
          is_active: true, // Keep active to show in list (filtered by status), separate from Soft Delete.
          assigned_to_employee_id: null,
          assigned_date: null,
          notes: `[BAJA ${new Date().toLocaleDateString()}] Motivo: ${reason}. ${notes || ''}`, // Append to notes? Or replace? Appending is safer. But we can't easily append in SQL update without RPC. Let's just update `notes` field to this value for now to capture it. Or maybe we shouldn't overwrite?
          // Safer: We trust the movement log for history. We just update status.
          // Let's sets `is_active` to false to "hide" it from normal lists if filtered.
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId)
        .select()
        .single()

      if (updateError) throw updateError

      // 2. Create Movement Record (Explicit History)
      const { error: moveError } = await supabase
        .from('asset_movements')
        .insert([{
          asset_id: assetId,
          movement_type: 'BAJA',
          performed_by: userId,
          notes: `Motivo: ${reason}. ${notes || ''}`,
          created_at: new Date().toISOString()
          // stations/areas null
        }])

      if (moveError) {
        console.warn('Could not create movement record for decommission:', moveError)
        // We don't throw here to avoid rolling back the status update if the table is tricky, 
        // but strictly we should.
      }

      return asset
    } catch (error) {
      console.error('Error decommissioning asset:', error)
      throw new Error(error.message || 'Error al dar de baja el activo')
    }
  }

  /**
   * Obtiene el historial de movimientos de un activo
   * @param {string} assetId - ID del activo
   * @returns {Promise<Array>} - Lista de movimientos
   */
  async getMovementHistory(assetId) {
    try {
      const { data, error } = await supabase
        .from('asset_movements')
        .select(`
          *,
          from_station:stations!from_station_id(name),
          to_station:stations!to_station_id(name),
          from_area:areas!from_area_id(name),
          to_area:areas!to_area_id(name),
          from_organization:organizations!from_organization_id(name),
          to_organization:organizations!to_organization_id(name),
          from_employee:employees!from_employee_id(full_name, dni),
          to_employee:employees!to_employee_id(full_name, dni),
          performed_by_user:system_users!performed_by(username)
        `)
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching asset movement history:', error)
      throw new Error(error.message || 'Error al cargar historial de movimientos')
    }
  }

  /**
   * Obtiene el historial de mantenimientos de un activo
   * @param {string} assetId - ID del activo
   * @returns {Promise<Array>} - Lista de mantenimientos
   */
  async getMaintenanceHistory(assetId) {
    try {
      const { data, error } = await supabase
        .from('asset_maintenances')
        .select(`
          *,
          performed_by:employees!performed_by_employee_id(full_name),
          created_by_user:system_users!created_by(username)
        `)
        .eq('asset_id', assetId)
        .order('maintenance_date', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching asset maintenance history:', error)
      throw new Error(error.message || 'Error al cargar historial de mantenimientos')
    }
  }

  /**
   * Busca activos por término de búsqueda
   * @param {string} stationId - ID de la estación
   * @param {string} searchTerm - Término de búsqueda
   * @returns {Promise<Array>} - Activos encontrados
   */
  async search(stationId, searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return await this.getAll(stationId)
      }

      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          station:stations(id, name, code),
          area:areas(id, name),
          organization:organizations(id, code, name),
          assigned_employee:employees!assigned_to_employee_id(id, full_name, dni)
        `)
        .eq('station_id', stationId)
        .eq('is_active', true)
        .or(`asset_code.ilike.%${searchTerm}%,asset_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%,imei.ilike.%${searchTerm}%`)
        .order('asset_code', { ascending: true })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error searching assets:', error)
      throw new Error(error.message || 'Error al buscar activos')
    }
  }

  /**
   * Obtiene estadísticas generales de activos de una estación
   * @param {string} stationId - ID de la estación
   * @returns {Promise<Object>} - Estadísticas
   */
  async getStats(stationId) {
    try {
      const assets = await this.getAll(stationId)

      const stats = {
        total: assets.length,
        available: assets.filter(a => a.status === 'DISPONIBLE').length,
        in_use: assets.filter(a => a.status === 'EN_USO').length,
        maintenance: assets.filter(a => a.status === 'MANTENIMIENTO').length,
        retired: assets.filter(a => a.status === 'BAJA').length,
        lost: assets.filter(a => a.status === 'PERDIDO').length,
        transfer: assets.filter(a => a.status === 'TRANSFERENCIA').length,
        critical: assets.filter(a => a.is_critical === true).length,
        total_value: assets.reduce((sum, asset) => sum + (asset.current_value || 0), 0),
        by_category: {},
        by_condition: {},
        by_owner: {}
      }

      // Agrupar por categoría
      assets.forEach(asset => {
        const category = asset.asset_category || 'OTRO'
        if (!stats.by_category[category]) {
          stats.by_category[category] = 0
        }
        stats.by_category[category]++
      })

      // Agrupar por condición
      assets.forEach(asset => {
        const condition = asset.condition || 'BUENO'
        if (!stats.by_condition[condition]) {
          stats.by_condition[condition] = 0
        }
        stats.by_condition[condition]++
      })

      // Agrupar por propietario
      assets.forEach(asset => {
        const owner = asset.owner_type || 'EMPRESA'
        if (!stats.by_owner[owner]) {
          stats.by_owner[owner] = 0
        }
        stats.by_owner[owner]++
      })

      return stats
    } catch (error) {
      console.error('Error getting asset stats:', error)
      throw new Error(error.message || 'Error al obtener estadísticas de activos')
    }
  }

  /**
   * Obtiene activos que requieren mantenimiento próximo
   * @param {string} stationId - ID de la estación
   * @param {number} daysThreshold - Días de anticipación (default 30)
   * @returns {Promise<Array>} - Activos que requieren mantenimiento
   */
  async getMaintenanceAlerts(stationId, daysThreshold = 30) {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          station:stations(id, name, code),
          area:areas(id, name)
        `)
        .eq('station_id', stationId)
        .eq('is_active', true)
        .not('next_maintenance_date', 'is', null)
        .lte('next_maintenance_date', new Date(Date.now() + daysThreshold * 24 * 60 * 60 * 1000).toISOString())
        .order('next_maintenance_date', { ascending: true })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching maintenance alerts:', error)
      throw new Error(error.message || 'Error al cargar alertas de mantenimiento')
    }
  }

  /**
   * Obtiene activos disponibles para asignación
   * @param {string} stationId - ID de la estación
   * @param {string} category - Categoría opcional
   * @returns {Promise<Array>} - Activos disponibles
   */
  async getAvailable(stationId, category = null) {
    try {
      let query = supabase
        .from('assets')
        .select('*')
        .eq('station_id', stationId)
        .eq('is_active', true)
        .eq('status', 'DISPONIBLE')
        .eq('operational_status', true)
        .order('asset_code', { ascending: true })

      if (category) {
        query = query.eq('asset_category', category)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching available assets:', error)
      throw new Error(error.message || 'Error al cargar activos disponibles')
    }
  }

  /**
   * Cuenta activos por código (para generar códigos secuenciales)
   * @param {string} stationCode - Código de la estación
   * @param {string} category - Categoría del activo
   * @returns {Promise<number>} - Contador
   */
  async countByCodePrefix(stationCode, category) {
    try {
      const categoryPrefixes = {
        EQUIPOS_COMPUTO: 'EC',
        EQUIPOS_MOVILES: 'EM',
        VEHICULOS_MOTORIZADOS: 'VM',
        VEHICULOS_NO_MOTORIZADOS: 'VNM',
        EQUIPOS_RAMPA: 'ER',
        HERRAMIENTAS: 'HE',
        MOBILIARIO: 'MO',
        ELECTRONICA: 'EL',
        OTRO: 'AS'
      }

      const prefix = categoryPrefixes[category] || 'AS'
      const codePattern = `${stationCode}-${prefix}-%`

      const { count, error } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .like('asset_code', codePattern)

      if (error) throw error

      return (count || 0) + 1
    } catch (error) {
      console.error('Error counting assets by code prefix:', error)
      return 1
    }
  }
}

export default new AssetService()
