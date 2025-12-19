import supabase from './supabase'

/**
 * Servicio para gestión de alertas de cumpleaños y vencimientos
 *
 * LÓGICA DE ALERTAS (según documentación):
 * - días_restantes < 0 → ROJO (Vencido)
 * - días_restantes <= 30 → AMARILLO (Por vencer) → Enviar alerta
 * - días_restantes > 30 → VERDE (Vigente)
 */
class AlertsService {
  /**
   * Calcula los días restantes hasta una fecha
   * @param {string|Date} targetDate - Fecha objetivo
   * @returns {number} - Días restantes (negativo si ya pasó)
   */
  calculateDaysRemaining(targetDate) {
    if (!targetDate) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const target = new Date(targetDate)
    target.setHours(0, 0, 0, 0)

    const diffTime = target - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays
  }

  /**
   * Calcula los días hasta el próximo cumpleaños
   * @param {string|Date} birthDate - Fecha de nacimiento
   * @returns {number} - Días hasta el próximo cumpleaños (0-365)
   */
  calculateDaysUntilBirthday(birthDate) {
    if (!birthDate) return null

    const today = new Date()
    const birth = new Date(birthDate)

    // Crear fecha de cumpleaños de este año
    const thisYearBirthday = new Date(
      today.getFullYear(),
      birth.getMonth(),
      birth.getDate()
    )

    // Si ya pasó este año, usar el próximo año
    if (thisYearBirthday < today) {
      thisYearBirthday.setFullYear(today.getFullYear() + 1)
    }

    const diffTime = thisYearBirthday - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays
  }

  /**
   * Determina el estado de un documento según días restantes
   * @param {number} daysRemaining - Días restantes
   * @returns {Object} - { status, label, severity }
   */
  getAlertStatus(daysRemaining) {
    if (daysRemaining === null) {
      return { status: 'unknown', label: 'Sin fecha', severity: 'info' }
    }

    if (daysRemaining < 0) {
      return { status: 'expired', label: 'VENCIDO', severity: 'danger' }
    }

    if (daysRemaining <= 30) {
      return { status: 'warning', label: 'POR VENCER', severity: 'warning' }
    }

    return { status: 'valid', label: 'VIGENTE', severity: 'success' }
  }

  /**
   * Obtiene alertas de cumpleaños próximos (dentro de 30 días)
   * @param {string} stationId - ID de estación (opcional)
   * @param {number} daysAhead - Días de anticipación (default: 30)
   * @returns {Promise<Array>}
   */
  async getUpcomingBirthdays(stationId = null, daysAhead = 30) {
    try {
      let query = supabase
        .from('employees')
        .select(`
          id,
          full_name,
          birth_date,
          role_name,
          status,
          station:stations(id, code, name)
        `)
        .eq('status', 'ACTIVO')
        .not('birth_date', 'is', null)

      if (stationId) {
        query = query.eq('station_id', stationId)
      }

      const { data, error } = await query

      if (error) throw error

      // Filtrar y calcular días hasta cumpleaños
      const birthdays = (data || [])
        .map(emp => ({
          ...emp,
          daysUntilBirthday: this.calculateDaysUntilBirthday(emp.birth_date)
        }))
        .filter(emp => emp.daysUntilBirthday <= daysAhead)
        .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday)

      return birthdays
    } catch (error) {
      console.error('Error fetching upcoming birthdays:', error)
      throw error
    }
  }

  /**
   * Obtiene documentos con alertas de vencimiento
   * @param {string} stationId - ID de estación (opcional)
   * @param {number} daysAhead - Días de anticipación (default: 30)
   * @returns {Promise<Array>}
   */
  async getExpiringDocuments(stationId = null, daysAhead = 30) {
    try {
      let query = supabase
        .from('employee_docs')
        .select(`
          id,
          doc_type,
          expiry_date,
          employee:employees!inner(
            id,
            full_name,
            role_name,
            status,
            station_id,
            station:stations(id, code, name)
          )
        `)
        .eq('employee.status', 'ACTIVO')
        .not('expiry_date', 'is', null)

      if (stationId) {
        query = query.eq('employee.station_id', stationId)
      }

      const { data, error } = await query

      if (error) throw error

      // Calcular días restantes y filtrar
      const documents = (data || [])
        .map(doc => ({
          ...doc,
          daysRemaining: this.calculateDaysRemaining(doc.expiry_date),
          alertStatus: null
        }))
        .map(doc => ({
          ...doc,
          alertStatus: this.getAlertStatus(doc.daysRemaining)
        }))
        .filter(doc => doc.daysRemaining <= daysAhead || doc.daysRemaining < 0)
        .sort((a, b) => a.daysRemaining - b.daysRemaining)

      return documents
    } catch (error) {
      console.error('Error fetching expiring documents:', error)
      throw error
    }
  }

  /**
   * Obtiene todas las alertas consolidadas
   * @param {string} stationId - ID de estación (opcional)
   * @returns {Promise<Object>} - { birthdays, documents, summary }
   */
  async getAllAlerts(stationId = null) {
    try {
      const [birthdays, documents] = await Promise.all([
        this.getUpcomingBirthdays(stationId),
        this.getExpiringDocuments(stationId)
      ])

      // Calcular estadísticas
      const expiredDocs = documents.filter(d => d.daysRemaining < 0).length
      const warningDocs = documents.filter(d => d.daysRemaining >= 0 && d.daysRemaining <= 30).length
      const todayBirthdays = birthdays.filter(b => b.daysUntilBirthday === 0).length
      const thisWeekBirthdays = birthdays.filter(b => b.daysUntilBirthday <= 7).length

      return {
        birthdays,
        documents,
        summary: {
          totalAlerts: birthdays.length + documents.length,
          expiredDocs,
          warningDocs,
          todayBirthdays,
          thisWeekBirthdays
        }
      }
    } catch (error) {
      console.error('Error fetching all alerts:', error)
      throw error
    }
  }

  /**
   * Obtiene estadísticas de documentos por tipo
   * @param {string} stationId - ID de estación (opcional)
   * @returns {Promise<Object>}
   */
  async getDocumentStatsByType(stationId = null) {
    try {
      let query = supabase
        .from('employee_docs')
        .select(`
          doc_type,
          expiry_date,
          employee:employees!inner(status, station_id)
        `)
        .eq('employee.status', 'ACTIVO')

      if (stationId) {
        query = query.eq('employee.station_id', stationId)
      }

      const { data, error } = await query

      if (error) throw error

      // Agrupar por tipo y estado
      const stats = {}
      const docTypes = ['FOTOCHECK', 'LICENCIA', 'EMO']

      docTypes.forEach(type => {
        const typeDocs = (data || []).filter(d => d.doc_type === type)

        stats[type] = {
          total: typeDocs.length,
          expired: typeDocs.filter(d => this.calculateDaysRemaining(d.expiry_date) < 0).length,
          warning: typeDocs.filter(d => {
            const days = this.calculateDaysRemaining(d.expiry_date)
            return days >= 0 && days <= 30
          }).length,
          valid: typeDocs.filter(d => this.calculateDaysRemaining(d.expiry_date) > 30).length
        }
      })

      return stats
    } catch (error) {
      console.error('Error fetching document stats:', error)
      throw error
    }
  }
}

export default new AlertsService()
