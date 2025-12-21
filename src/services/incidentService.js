import supabase from './supabase'

/**
 * Servicio para gestión de incidentes SST
 */
class IncidentService {
  /**
   * Obtiene todos los incidentes de una estación
   * @param {string} stationId - ID de la estación
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Array>}
   */
  async getAll(stationId, filters = {}) {
    try {
      let query = supabase
        .from('sst_incidents')
        .select(`
          *,
          employee:employees!employee_id(id, full_name, dni, role_name),
          reported_by_user:system_users!reported_by(username, email)
        `)
        .order('incident_date', { ascending: false })
        .order('incident_time', { ascending: false })

      if (stationId) {
        query = query.eq('station_id', stationId)
      }

      // Filtros opcionales
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.type) {
        query = query.eq('incident_type', filters.type)
      }

      if (filters.severity) {
        query = query.eq('severity', filters.severity)
      }

      if (filters.startDate) {
        query = query.gte('incident_date', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('incident_date', filters.endDate)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching incidents:', error)
      throw error
    }
  }

  /**
   * Obtiene un incidente por ID
   * @param {string} id - ID del incidente
   * @returns {Promise<Object>}
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('sst_incidents')
        .select(`
          *,
          employee:employees!employee_id(id, full_name, dni, role_name),
          reported_by_user:system_users!reported_by(username, email)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching incident:', error)
      throw error
    }
  }

  /**
   * Crea un nuevo incidente
   * @param {Object} incidentData - Datos del incidente
   * @returns {Promise<Object>}
   */
  async create(incidentData) {
    try {
      const { data, error } = await supabase
        .from('sst_incidents')
        .insert([{
          ...incidentData,
          status: 'REPORTED'
        }])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating incident:', error)
      throw error
    }
  }

  /**
   * Actualiza un incidente
   * @param {string} id - ID del incidente
   * @param {Object} incidentData - Datos a actualizar
   * @returns {Promise<Object>}
   */
  async update(id, incidentData) {
    try {
      const { data, error } = await supabase
        .from('sst_incidents')
        .update(incidentData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating incident:', error)
      throw error
    }
  }

  /**
   * Cierra un incidente
   * @param {string} id - ID del incidente
   * @returns {Promise<Object>}
   */
  async close(id) {
    try {
      const { data, error } = await supabase
        .from('sst_incidents')
        .update({
          status: 'CLOSED',
          closed_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error closing incident:', error)
      throw error
    }
  }

  /**
   * Elimina un incidente
   * @param {string} id - ID del incidente
   * @returns {Promise<void>}
   */
  async delete(id) {
    try {
      const { error } = await supabase
        .from('sst_incidents')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting incident:', error)
      throw error
    }
  }

  /**
   * Obtiene estadísticas de incidentes
   * @param {string} stationId - ID de la estación
   * @param {string} startDate - Fecha inicio
   * @param {string} endDate - Fecha fin
   * @returns {Promise<Object>}
   */
  async getStats(stationId, startDate, endDate) {
    try {
      let query = supabase
        .from('sst_incidents')
        .select('*')
        .gte('incident_date', startDate)
        .lte('incident_date', endDate)

      if (stationId) {
        query = query.eq('station_id', stationId)
      }

      const { data: incidents, error } = await query

      if (error) throw error

      const total = incidents?.length || 0
      const accidentes = incidents?.filter(i => i.incident_type === 'ACCIDENTE').length || 0
      const incidentes = incidents?.filter(i => i.incident_type === 'INCIDENTE').length || 0
      const cuasiAccidentes = incidents?.filter(i => i.incident_type === 'CUASI_ACCIDENTE').length || 0

      const reported = incidents?.filter(i => i.status === 'REPORTED').length || 0
      const underInvestigation = incidents?.filter(i => i.status === 'UNDER_INVESTIGATION').length || 0
      const closed = incidents?.filter(i => i.status === 'CLOSED').length || 0

      // Severidad
      const leve = incidents?.filter(i => i.severity === 'LEVE').length || 0
      const moderado = incidents?.filter(i => i.severity === 'MODERADO').length || 0
      const grave = incidents?.filter(i => i.severity === 'GRAVE').length || 0
      const muyGrave = incidents?.filter(i => i.severity === 'MUY_GRAVE').length || 0

      // Días perdidos
      const totalDaysLost = incidents?.reduce((sum, i) => sum + (i.days_lost || 0), 0) || 0

      // Con atención médica
      const withMedicalAttention = incidents?.filter(i => i.medical_attention === true).length || 0

      return {
        total,
        byType: {
          accidentes,
          incidentes,
          cuasiAccidentes
        },
        byStatus: {
          reported,
          underInvestigation,
          closed
        },
        bySeverity: {
          leve,
          moderado,
          grave,
          muyGrave
        },
        totalDaysLost,
        withMedicalAttention
      }
    } catch (error) {
      console.error('Error fetching incident stats:', error)
      throw error
    }
  }

  /**
   * Obtiene incidentes por mes (para gráficos)
   * @param {string} stationId - ID de la estación
   * @param {number} months - Número de meses hacia atrás
   * @returns {Promise<Array>}
   */
  async getByMonth(stationId, months = 6) {
    try {
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - months)

      let query = supabase
        .from('sst_incidents')
        .select('incident_date, incident_type, severity')
        .gte('incident_date', startDate.toISOString().split('T')[0])
        .order('incident_date', { ascending: true })

      if (stationId) query = query.eq('station_id', stationId)

      const { data, error } = await query

      if (error) throw error

      // Agrupar por mes
      const byMonth = {}
      data?.forEach(incident => {
        const month = incident.incident_date.substring(0, 7) // YYYY-MM
        if (!byMonth[month]) {
          byMonth[month] = {
            month,
            total: 0,
            accidentes: 0,
            incidentes: 0,
            cuasiAccidentes: 0
          }
        }
        byMonth[month].total++
        if (incident.incident_type === 'ACCIDENTE') byMonth[month].accidentes++
        if (incident.incident_type === 'INCIDENTE') byMonth[month].incidentes++
        if (incident.incident_type === 'CUASI_ACCIDENTE') byMonth[month].cuasiAccidentes++
      })

      return Object.values(byMonth)
    } catch (error) {
      console.error('Error fetching incidents by month:', error)
      throw error
    }
  }
}

export default new IncidentService()
