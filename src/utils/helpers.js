import { format, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { EPP_ALERT_THRESHOLDS } from './constants'

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD respetando la zona horaria local del navegador.
 * Evita el problema de que toISOString() devuelva el día siguiente en horas de la tarde/noche (UTC).
 */
export const getLocalISOString = (userDate = new Date()) => {
  const offset = userDate.getTimezoneOffset()
  const localDate = new Date(userDate.getTime() - (offset * 60 * 1000))
  return localDate.toISOString().split('T')[0]
}

/**
 * Formatea una fecha en formato español
 */
export const formatDate = (date, formatStr = 'dd/MM/yyyy') => {
  if (!date) return '-'
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr, { locale: es })
}

/**
 * Calcula el estado del semáforo de EPPs según la fecha de renovación
 * @param {string|Date} renewalDate - Fecha de renovación del EPP
 * @returns {Object} - { status: 'success'|'warning'|'danger', daysRemaining: number, label: string }
 */
export const calculateEPPStatus = (renewalDate) => {
  if (!renewalDate) {
    return { status: 'danger', daysRemaining: 0, label: 'Sin fecha' }
  }

  const today = new Date()
  const renewal = typeof renewalDate === 'string' ? parseISO(renewalDate) : renewalDate
  const daysRemaining = differenceInDays(renewal, today)

  if (daysRemaining < EPP_ALERT_THRESHOLDS.DANGER) {
    return {
      status: 'danger',
      daysRemaining,
      label: 'Vencido',
      color: 'red'
    }
  }

  if (daysRemaining <= EPP_ALERT_THRESHOLDS.WARNING) {
    return {
      status: 'warning',
      daysRemaining,
      label: 'Por vencer',
      color: 'yellow'
    }
  }

  return {
    status: 'success',
    daysRemaining,
    label: 'Vigente',
    color: 'green'
  }
}

/**
 * Calcula el estado de un documento según su fecha de expiración
 */
export const calculateDocumentStatus = (expiryDate) => {
  return calculateEPPStatus(expiryDate)
}

/**
 * Formatea un número como moneda
 */
export const formatCurrency = (amount, currency = 'PEN') => {
  if (amount === null || amount === undefined) return '-'

  const formatter = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  })

  return formatter.format(amount)
}

/**
 * Obtiene las iniciales de un nombre completo
 */
export const getInitials = (fullName) => {
  if (!fullName) return '??'

  const names = fullName.trim().split(' ')
  if (names.length === 1) return names[0].substring(0, 2).toUpperCase()

  return (names[0][0] + names[names.length - 1][0]).toUpperCase()
}

/**
 * Valida un DNI peruano (8 dígitos)
 */
export const validateDNI = (dni) => {
  const regex = /^\d{8}$/
  return regex.test(dni)
}

/**
 * Valida un email
 */
export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * Trunca un texto a una longitud máxima
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Convierte un rol a texto legible
 */
export const getRoleLabel = (role) => {
  const roleLabels = {
    ADMIN: 'Administrador',
    SUPERVISOR: 'Supervisor',
    MONITOR: 'Monitor',
    PROVIDER: 'Proveedor'
  }
  return roleLabels[role] || role
}

/**
 * Genera un color hexadecimal basado en un string (para avatares)
 */
export const stringToColor = (str) => {
  if (!str) return '#6366f1'

  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }

  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
  ]

  return colors[Math.abs(hash) % colors.length]
}

/**
 * Descarga un archivo desde un blob
 */
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Maneja errores de la API y devuelve un mensaje legible
 */
export const handleApiError = (error) => {
  if (error.response) {
    // El servidor respondió con un código de estado fuera del rango 2xx
    const { status, data } = error.response

    if (status === 401) {
      return 'Sesión expirada. Por favor, inicie sesión nuevamente.'
    }

    if (status === 403) {
      return 'No tiene permisos para realizar esta acción.'
    }

    if (status === 404) {
      return 'Recurso no encontrado.'
    }

    if (status === 422) {
      return data.message || 'Datos inválidos. Verifique la información ingresada.'
    }

    if (status >= 500) {
      return 'Error en el servidor. Por favor, intente más tarde.'
    }

    return data.message || 'Error al procesar la solicitud.'
  }

  if (error.request) {
    // La petición fue hecha pero no hubo respuesta
    return 'No se pudo conectar con el servidor. Verifique su conexión a internet.'
  }

  // Algo pasó al configurar la petición
  return error.message || 'Error inesperado. Por favor, intente nuevamente.'
}

// =====================================================
// HELPERS PARA MÓDULO DE ACTIVOS
// =====================================================

/**
 * Calcula el estado de mantenimiento de un activo
 * @param {string|Date} nextMaintenanceDate - Fecha del próximo mantenimiento
 * @returns {Object} - { level: string, daysRemaining: number, label: string, color: string }
 */
export const calculateMaintenanceStatus = (nextMaintenanceDate) => {
  if (!nextMaintenanceDate) {
    return {
      level: 'SIN_PROGRAMAR',
      daysRemaining: null,
      label: 'Sin programar',
      color: 'gray'
    }
  }

  const today = new Date()
  const maintenance = typeof nextMaintenanceDate === 'string' ? parseISO(nextMaintenanceDate) : nextMaintenanceDate
  const daysRemaining = differenceInDays(maintenance, today)

  if (daysRemaining < 0) {
    return {
      level: 'VENCIDO',
      daysRemaining,
      label: 'Vencido - Requiere atención',
      color: 'red'
    }
  }

  if (daysRemaining <= 7) {
    return {
      level: 'URGENTE',
      daysRemaining,
      label: 'Urgente - Vence en 7 días',
      color: 'orange'
    }
  }

  if (daysRemaining <= 30) {
    return {
      level: 'PROXIMO',
      daysRemaining,
      label: 'Próximo - Vence en 30 días',
      color: 'yellow'
    }
  }

  return {
    level: 'PROGRAMADO',
    daysRemaining,
    label: 'Programado',
    color: 'green'
  }
}

/**
 * Calcula el estado de garantía de un activo
 * @param {string|Date} warrantyExpiryDate - Fecha de vencimiento de garantía
 * @returns {Object} - { status: string, daysRemaining: number, label: string, color: string }
 */
export const calculateWarrantyStatus = (warrantyExpiryDate) => {
  if (!warrantyExpiryDate) {
    return {
      status: 'SIN_GARANTIA',
      daysRemaining: null,
      label: 'Sin garantía',
      color: 'gray'
    }
  }

  const today = new Date()
  const warranty = typeof warrantyExpiryDate === 'string' ? parseISO(warrantyExpiryDate) : warrantyExpiryDate
  const daysRemaining = differenceInDays(warranty, today)

  if (daysRemaining < 0) {
    return {
      status: 'VENCIDA',
      daysRemaining,
      label: 'Garantía vencida',
      color: 'red'
    }
  }

  if (daysRemaining <= 60) {
    return {
      status: 'POR_VENCER',
      daysRemaining,
      label: 'Garantía por vencer',
      color: 'yellow'
    }
  }

  return {
    status: 'VIGENTE',
    daysRemaining,
    label: 'Garantía vigente',
    color: 'green'
  }
}

/**
 * Calcula la depreciación de un activo
 * @param {number} acquisitionValue - Valor de adquisición
 * @param {string|Date} acquisitionDate - Fecha de adquisición
 * @param {number} depreciationRate - Tasa de depreciación anual (%)
 * @param {number} residualValue - Valor residual
 * @returns {number} - Valor actual depreciado
 */
export const calculateDepreciation = (
  acquisitionValue,
  acquisitionDate,
  depreciationRate,
  residualValue = 0
) => {
  if (!acquisitionValue || !acquisitionDate || !depreciationRate) {
    return acquisitionValue || 0
  }

  const acquisition = typeof acquisitionDate === 'string' ? parseISO(acquisitionDate) : acquisitionDate
  const today = new Date()
  const yearsOld = differenceInDays(today, acquisition) / 365.25

  const depreciatedValue = acquisitionValue - (acquisitionValue * (depreciationRate / 100) * yearsOld)

  // No puede ser menor al valor residual
  if (residualValue && depreciatedValue < residualValue) {
    return residualValue
  }

  // No puede ser negativo
  return Math.max(depreciatedValue, 0)
}

/**
 * Calcula la edad de un activo en años
 * @param {string|Date} acquisitionDate - Fecha de adquisición
 * @returns {number} - Años completos
 */
export const calculateAssetAge = (acquisitionDate) => {
  if (!acquisitionDate) return 0

  const acquisition = typeof acquisitionDate === 'string' ? parseISO(acquisitionDate) : acquisitionDate
  const today = new Date()
  const days = differenceInDays(today, acquisition)

  return Math.floor(days / 365.25)
}

/**
 * Genera un código de activo automático
 * @param {string} stationCode - Código de la estación
 * @param {string} category - Categoría del activo
 * @param {number} count - Contador secuencial
 * @returns {string} - Código generado
 */
export const generateAssetCode = (stationCode, category, count) => {
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
  const paddedCount = String(count).padStart(6, '0')

  return `${stationCode}-${prefix}-${paddedCount}`
}

/**
 * Formatea especificaciones técnicas de JSONB a texto legible
 * @param {Object} specifications - Objeto de especificaciones
 * @returns {string} - Texto formateado
 */
export const formatSpecifications = (specifications) => {
  if (!specifications || typeof specifications !== 'object') return '-'

  return Object.entries(specifications)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ')
}

/**
 * Valida un código de activo
 * @param {string} assetCode - Código a validar
 * @returns {boolean} - Válido o no
 */
export const validateAssetCode = (assetCode) => {
  const regex = /^[A-Z0-9-_]+$/
  return regex.test(assetCode)
}

/**
 * Calcula el valor total de una lista de activos
 * @param {Array} assets - Array de activos
 * @returns {number} - Suma total
 */
export const calculateTotalAssetValue = (assets) => {
  if (!Array.isArray(assets)) return 0

  return assets.reduce((total, asset) => {
    return total + (asset.current_value || 0)
  }, 0)
}

/**
 * Agrupa activos por categoría
 * @param {Array} assets - Array de activos
 * @returns {Object} - Objeto agrupado por categoría
 */
export const groupAssetsByCategory = (assets) => {
  if (!Array.isArray(assets)) return {}

  return assets.reduce((groups, asset) => {
    const category = asset.asset_category || 'OTRO'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(asset)
    return groups
  }, {})
}

/**
 * Agrupa activos por estado
 * @param {Array} assets - Array de activos
 * @returns {Object} - Objeto agrupado por estado
 */
export const groupAssetsByStatus = (assets) => {
  if (!Array.isArray(assets)) return {}

  return assets.reduce((groups, asset) => {
    const status = asset.status || 'DISPONIBLE'
    if (!groups[status]) {
      groups[status] = []
    }
    groups[status].push(asset)
    return groups
  }, {})
}

/**
 * Filtra activos que requieren mantenimiento pronto
 * @param {Array} assets - Array de activos
 * @param {number} daysThreshold - Días de umbral (default 30)
 * @returns {Array} - Activos filtrados
 */
export const getAssetsRequiringMaintenance = (assets, daysThreshold = 30) => {
  if (!Array.isArray(assets)) return []

  const today = new Date()

  return assets.filter(asset => {
    if (!asset.next_maintenance_date) return false

    const maintenanceDate = typeof asset.next_maintenance_date === 'string'
      ? parseISO(asset.next_maintenance_date)
      : asset.next_maintenance_date

    const daysRemaining = differenceInDays(maintenanceDate, today)

    return daysRemaining <= daysThreshold
  })
}

/**
 * Obtiene el color según el estado del activo
 * @param {string} status - Estado del activo
 * @returns {string} - Color
 */
export const getAssetStatusColor = (status) => {
  const colors = {
    DISPONIBLE: 'green',
    EN_USO: 'blue',
    MANTENIMIENTO: 'yellow',
    BAJA: 'gray',
    PERDIDO: 'red',
    TRANSFERENCIA: 'purple'
  }

  return colors[status] || 'gray'
}

/**
 * Obtiene el color según la condición del activo
 * @param {string} condition - Condición del activo
 * @returns {string} - Color
 */
export const getAssetConditionColor = (condition) => {
  const colors = {
    NUEVO: 'green',
    EXCELENTE: 'green',
    BUENO: 'blue',
    REGULAR: 'yellow',
    MALO: 'orange',
    INOPERATIVO: 'red'
  }

  return colors[condition] || 'gray'
}
