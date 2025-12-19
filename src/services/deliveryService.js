import supabase from './supabase'
import eppInventoryService from './eppInventoryService'

/**
 * Servicio para gestión de entregas de EPPs
 */
class DeliveryService {
  /**
   * Obtiene todas las entregas de una estación
   * @param {string} stationId - ID de la estación
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Array>}
   */
  /**
   * Obtiene todas las entregas de una estación (con soporte de paginación)
   * @param {string} stationId - ID de la estación
   * @param {Object} filters - Filtros opcionales { status, startDate, endDate, employeeId, page, limit }
   * @returns {Promise<Object>} { data, count, error }
   */
  async getPaginated(stationId, filters = {}) {
    try {
      const page = filters.page || 1
      const limit = filters.limit || 10
      const from = (page - 1) * limit
      const to = from + limit - 1

      let query = supabase
        .from('epp_deliveries')
        .select(`
          *,
          employee:employees!employee_id(id, full_name, dni, role_name),
          delivered_by_user:system_users!delivered_by(username, email)
        `, { count: 'exact' })
        .eq('station_id', stationId)
        .order('delivery_date', { ascending: false })
        .order('created_at', { ascending: false })

      // Filtros opcionales
      if (filters.employeeId) query = query.eq('employee_id', filters.employeeId)
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.startDate) query = query.gte('delivery_date', filters.startDate)
      if (filters.endDate) query = query.lte('delivery_date', filters.endDate)

      // Paginación
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error
      return { data: data || [], count: count || 0 }
    } catch (error) {
      console.error('Error fetching deliveries:', error)
      throw error
    }
  }

  /**
   * Obtiene todas las entregas (Legacy - sin paginación por defecto)
   */
  async getAll(stationId, filters = {}) {
    try {
      let query = supabase
        .from('epp_deliveries')
        .select(`
          *,
          employee:employees!employee_id(id, full_name, dni, role_name),
          delivered_by_user:system_users!delivered_by(username, email)
        `)
        .eq('station_id', stationId)
        .order('delivery_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.employeeId) query = query.eq('employee_id', filters.employeeId)
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.startDate) query = query.gte('delivery_date', filters.startDate)
      if (filters.endDate) query = query.lte('delivery_date', filters.endDate)

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching deliveries:', error)
      throw error
    }
  }

  /**
   * Obtiene una entrega por ID
   * @param {string} id - ID de la entrega
   * @returns {Promise<Object>}
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('epp_deliveries')
        .select(`
          *,
          employee:employees!employee_id(id, full_name, dni, role_name),
          delivered_by_user:system_users!delivered_by(username, email)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching delivery:', error)
      throw error
    }
  }

  /**
   * Obtiene entregas de un empleado
   * @param {string} employeeId - ID del empleado
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Array>}
   */
  async getByEmployee(employeeId, filters = {}) {
    try {
      let query = supabase
        .from('epp_deliveries')
        .select(`
          *,
          delivered_by_user:system_users!delivered_by(username, email)
        `)
        .eq('employee_id', employeeId)
        .order('delivery_date', { ascending: false })

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching employee deliveries:', error)
      throw error
    }
  }

  /**
   * Crea una nueva entrega (sin firma) con asignaciones y renovación inteligente
   * @param {Object} deliveryData - Datos de la entrega
   * @returns {Promise<Object>}
   */
  async create(deliveryData) {
    try {
      // Crear la entrega
      const { data, error } = await supabase
        .from('epp_deliveries')
        .insert([{
          ...deliveryData,
          status: 'PENDING'
        }])
        .select()
        .single()

      if (error) throw error

      // Procesar items: descontar stock y crear asignaciones
      if (Array.isArray(deliveryData.items)) {
        for (const item of deliveryData.items) {
          // Descontar del inventario
          await eppInventoryService.adjustStock(
            item.item_id,
            -item.quantity,
            'ENTREGA',
            `Entrega a empleado - ${deliveryData.delivery_reason || 'SIN ESPECIFICAR'}`,
            deliveryData.delivered_by,
            'DELIVERY',
            data.id
          )

          // Obtener datos del item para calcular fecha de renovación
          const { data: itemData } = await supabase
            .from('epp_items')
            .select('useful_life_months')
            .eq('id', item.item_id)
            .single()

          // Calcular fecha de renovación
          const deliveryDate = new Date(deliveryData.delivery_date || new Date())
          const renewalDate = new Date(deliveryDate)
          renewalDate.setMonth(renewalDate.getMonth() + (itemData?.useful_life_months || 12))

          // Crear asignación
          await supabase
            .from('employee_epp_assignments')
            .insert([{
              station_id: deliveryData.station_id,
              employee_id: deliveryData.employee_id,
              item_id: item.item_id,
              delivery_id: data.id,
              quantity: item.quantity,
              size: item.size || null,
              delivery_date: deliveryDate.toISOString().split('T')[0],
              renewal_date: renewalDate.toISOString().split('T')[0],
              status: 'ACTIVE'
            }])
        }
      }

      return data
    } catch (error) {
      console.error('Error creating delivery:', error)
      throw error
    }
  }

  /**
   * Firma una entrega (firma de empleado)
   * @param {string} id - ID de la entrega
   * @param {string} signatureData - Firma en Base64
   * @param {string} signatureIp - IP del firmante
   * @returns {Promise<Object>}
   */
  async signEmployee(id, signatureData, signatureIp = null) {
    try {
      const { data, error } = await supabase
        .from('epp_deliveries')
        .update({
          employee_signature_data: signatureData,
          employee_signature_ip: signatureIp,
          employee_signature_timestamp: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error signing delivery (employee):', error)
      throw error
    }
  }

  /**
   * Firma una entrega (firma de responsable)
   * @param {string} id - ID de la entrega
   * @param {string} signatureData - Firma en Base64
   * @param {string} responsibleName - Nombre del responsable
   * @param {string} responsiblePosition - Cargo del responsable
   * @returns {Promise<Object>}
   */
  async signResponsible(id, signatureData, responsibleName, responsiblePosition) {
    try {
      const { data, error } = await supabase
        .from('epp_deliveries')
        .update({
          responsible_signature_data: signatureData,
          responsible_name: responsibleName,
          responsible_position: responsiblePosition,
          responsible_signature_timestamp: new Date().toISOString(),
          status: 'SIGNED'
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error signing delivery (responsible):', error)
      throw error
    }
  }

  /**
   * Actualiza una entrega
   * @param {string} id - ID de la entrega
   * @param {Object} deliveryData - Datos a actualizar
   * @returns {Promise<Object>}
   */
  async update(id, deliveryData) {
    try {
      const { data, error } = await supabase
        .from('epp_deliveries')
        .update(deliveryData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating delivery:', error)
      throw error
    }
  }

  /**
   * Cancela una entrega
   * @param {string} id - ID de la entrega
   * @param {string} reason - Razón de la cancelación
   * @returns {Promise<Object>}
   */
  async cancel(id, reason) {
    try {
      // Obtener la entrega
      const delivery = await this.getById(id)

      if (delivery.status === 'SIGNED') {
        throw new Error('No se puede cancelar una entrega que ya fue firmada')
      }

      // Devolver items al inventario
      if (Array.isArray(delivery.items)) {
        for (const item of delivery.items) {
          await eppInventoryService.adjustStock(
            item.item_id,
            item.quantity,
            'AJUSTE',
            `Devolución por cancelación de entrega: ${reason}`,
            null,
            'CANCELLATION',
            id
          )
        }
      }

      // Eliminar asignaciones asociadas
      await supabase
        .from('employee_epp_assignments')
        .delete()
        .eq('delivery_id', id)

      // Actualizar estado
      const { data, error } = await supabase
        .from('epp_deliveries')
        .update({
          status: 'CANCELLED',
          notes: (delivery.notes || '') + `\n[CANCELADO] ${reason}`
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error canceling delivery:', error)
      throw error
    }
  }

  /**
   * Crea una renovación (marca la asignación vieja como RENEWED y crea nueva entrega)
   * @param {Object} renewalData - Datos de la renovación
   * @returns {Promise<Object>}
   */
  async createRenewal(renewalData) {
    try {
      // Crear nueva entrega de renovación
      const { data: newDelivery, error } = await supabase
        .from('epp_deliveries')
        .insert([{
          station_id: renewalData.station_id,
          employee_id: renewalData.employee_id,
          delivered_by: renewalData.delivered_by,
          delivery_date: renewalData.delivery_date || new Date().toISOString().split('T')[0],
          delivery_reason: 'RENOVACION',
          items: renewalData.items,
          notes: renewalData.notes || 'Renovación automática',
          status: 'PENDING'
        }])
        .select()
        .single()

      if (error) throw error

      // Procesar cada item de renovación
      if (Array.isArray(renewalData.items)) {
        for (const item of renewalData.items) {
          // Marcar asignación anterior como RENEWED
          if (item.assignment_id) {
            await supabase
              .from('employee_epp_assignments')
              .update({ status: 'RENEWED' })
              .eq('id', item.assignment_id)
          }

          // Descontar del inventario
          await eppInventoryService.adjustStock(
            item.item_id,
            -item.quantity,
            'RENOVACION',
            `Renovación de elemento - ${item.item_name}`,
            renewalData.delivered_by,
            'RENEWAL',
            newDelivery.id
          )

          // Obtener datos del item para calcular fecha de renovación
          const { data: itemData } = await supabase
            .from('epp_items')
            .select('useful_life_months')
            .eq('id', item.item_id)
            .single()

          // Calcular nueva fecha de renovación
          const deliveryDate = new Date(renewalData.delivery_date || new Date())
          const renewalDate = new Date(deliveryDate)
          renewalDate.setMonth(renewalDate.getMonth() + (itemData?.useful_life_months || 12))

          // Crear nueva asignación ACTIVE
          await supabase
            .from('employee_epp_assignments')
            .insert([{
              station_id: renewalData.station_id,
              employee_id: renewalData.employee_id,
              item_id: item.item_id,
              delivery_id: newDelivery.id,
              quantity: item.quantity,
              size: item.size || null,
              delivery_date: deliveryDate.toISOString().split('T')[0],
              renewal_date: renewalDate.toISOString().split('T')[0],
              status: 'ACTIVE'
            }])
        }
      }

      return newDelivery
    } catch (error) {
      console.error('Error creating renewal:', error)
      throw error
    }
  }

  /**
   * Obtiene elementos pendientes de renovación para un empleado
   * @param {string} employeeId - ID del empleado
   * @param {number} daysAhead - Días hacia adelante (default: 30)
   * @returns {Promise<Array>}
   */
  async getPendingRenewals(employeeId, daysAhead = 30) {
    try {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + daysAhead)

      const { data, error } = await supabase
        .from('employee_epp_assignments')
        .select(`
          *,
          item:epp_items!item_id(id, name, item_type, useful_life_months, size)
        `)
        .eq('employee_id', employeeId)
        .eq('status', 'ACTIVE')
        .lte('renewal_date', futureDate.toISOString().split('T')[0])
        .order('renewal_date', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching pending renewals:', error)
      throw error
    }
  }

  /**
   * Obtiene estadísticas de entregas
   * @param {string} stationId - ID de la estación
   * @param {string} startDate - Fecha inicio
   * @param {string} endDate - Fecha fin
   * @returns {Promise<Object>}
   */
  async getStats(stationId, startDate, endDate) {
    try {
      const { data: deliveries, error } = await supabase
        .from('epp_deliveries')
        .select('*')
        .eq('station_id', stationId)
        .gte('delivery_date', startDate)
        .lte('delivery_date', endDate)

      if (error) throw error

      const total = deliveries?.length || 0
      const pending = deliveries?.filter(d => d.status === 'PENDING').length || 0
      const signed = deliveries?.filter(d => d.status === 'SIGNED').length || 0
      const cancelled = deliveries?.filter(d => d.status === 'CANCELLED').length || 0

      // Contar total de items entregados
      let totalItems = 0
      deliveries?.forEach(d => {
        if (Array.isArray(d.items)) {
          totalItems += d.items.reduce((sum, item) => sum + item.quantity, 0)
        }
      })

      return {
        total,
        pending,
        signed,
        cancelled,
        totalItems
      }
    } catch (error) {
      console.error('Error fetching delivery stats:', error)
      throw error
    }
  }
}

export default new DeliveryService()
