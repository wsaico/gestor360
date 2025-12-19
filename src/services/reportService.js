import * as XLSX from 'xlsx'
import { supabase } from './supabase'
import { formatDate } from '@utils/helpers'

/**
 * Servicio para generar reportes de alimentación en formato Excel
 * Genera 2 tipos de reportes:
 * 1. Reporte de Descuento Comedor (consolidado por rango de fechas)
 * 2. Reporte de Facturación (3 pestañas: 25% Empleado, 75% Empresa, Resumen)
 */

const IGV_RATE = 0.18 // 18% IGV

/**
 * Obtiene datos de pedidos para reportes
 * @param {string} stationId - ID de la estación
 * @param {string} startDate - Fecha inicial (YYYY-MM-DD)
 * @param {string} endDate - Fecha final (YYYY-MM-DD)
 * @returns {Promise<Array>} Lista de pedidos con información del empleado
 */
const getOrdersForReport = async (stationId, startDate, endDate) => {
  try {
    let query = supabase
      .from('food_orders')
      .select(`
        *,
        employee:employees!inner(
          full_name,
          dni,
          role_name,
          area
        ),
        menu:menus(
          serve_date,
          meal_type
        )
      `)
      .eq('station_id', stationId)
      .in('status', ['CONFIRMED', 'CONSUMED', 'PENDING'])
      .order('menu_date', { ascending: true })

    if (startDate) {
      query = query.gte('menu_date', startDate)
    }

    if (endDate) {
      query = query.lte('menu_date', endDate)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching orders for report:', error)
    throw error
  }
}

/**
 * Genera el Reporte de Descuento Comedor
 * Formato: Por empleado con columnas de fechas y descuentos diarios
 * @param {string} stationId - ID de la estación
 * @param {string} startDate - Fecha inicial
 * @param {string} endDate - Fecha final
 * @param {string} stationName - Nombre de la estación
 * @returns {Blob} Archivo Excel
 */
export const generateDiscountReport = async (stationId, startDate, endDate, stationName) => {
  try {
    const orders = await getOrdersForReport(stationId, startDate, endDate)

    if (orders.length === 0) {
      throw new Error('No hay pedidos para generar el reporte')
    }

    // Obtener todas las fechas únicas en el rango
    const uniqueDates = [...new Set(orders.map(o => o.menu_date))].sort()

    // Agrupar por empleado
    const employeeMap = new Map()

    orders.forEach(order => {
      const empKey = order.employee.dni

      if (!employeeMap.has(empKey)) {
        employeeMap.set(empKey, {
          dni: order.employee.dni,
          fullName: order.employee.full_name,
          area: order.employee.area || 'N/A',
          role: order.employee.role_name,
          dateAmounts: {}
        })
      }

      const emp = employeeMap.get(empKey)
      const dateKey = order.menu_date

      // Acumular el descuento del empleado para esa fecha
      if (!emp.dateAmounts[dateKey]) {
        emp.dateAmounts[dateKey] = 0
      }
      emp.dateAmounts[dateKey] += Number(order.employee_cost_snapshot || 0)
    })

    // Construir datos para Excel
    const employees = Array.from(employeeMap.values()).sort((a, b) =>
      a.area.localeCompare(b.area) || a.fullName.localeCompare(b.fullName)
    )

    // Headers
    const headers = ['ITEM', 'DNI', 'NOMBRES', 'AREA', 'CARGO']
    uniqueDates.forEach(date => {
      headers.push(formatDate(date))
    })
    headers.push('TOTAL')

    // Construir filas
    const rows = employees.map((emp, index) => {
      const row = [
        index + 1,
        emp.dni,
        emp.fullName,
        emp.area,
        emp.role
      ]

      let total = 0
      uniqueDates.forEach(date => {
        const amount = emp.dateAmounts[date] || 0
        row.push(amount > 0 ? amount.toFixed(2) : '')
        total += amount
      })

      row.push(total.toFixed(2))
      return row
    })

    // Crear workbook
    const wb = XLSX.utils.book_new()

    // Título y metadata
    const titleRow = [[`CONTROL DE ALIMENTACIÓN PERSONAL - DESCUENTO COMEDOR`]]
    const metaRow = [[`Estación: ${stationName} | Periodo: ${formatDate(startDate)} - ${formatDate(endDate)}`]]
    const emptyRow = [['']]

    const wsData = [
      ...titleRow,
      ...metaRow,
      ...emptyRow,
      headers,
      ...rows
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Ajustar anchos de columna
    const colWidths = [
      { wch: 6 },  // ITEM
      { wch: 12 }, // DNI
      { wch: 35 }, // NOMBRES
      { wch: 15 }, // AREA
      { wch: 30 }, // CARGO
    ]
    uniqueDates.forEach(() => colWidths.push({ wch: 12 })) // Fechas
    colWidths.push({ wch: 12 }) // TOTAL

    ws['!cols'] = colWidths

    // Merge cells para título
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }, // Título
      { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } }  // Metadata
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Descuentos')

    // Generar archivo
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  } catch (error) {
    console.error('Error generating discount report:', error)
    throw error
  }
}

/**
 * Genera el Reporte de Facturación con 3 pestañas
 * Pestaña 1: 25% - Descuento Empleado
 * Pestaña 2: 75% - Asunción Empresa
 * Pestaña 3: Resumen Total
 * @param {string} stationId - ID de la estación
 * @param {string} startDate - Fecha inicial
 * @param {string} endDate - Fecha final
 * @param {string} stationName - Nombre de la estación
 * @returns {Blob} Archivo Excel
 */
export const generateBillingReport = async (stationId, startDate, endDate, stationName) => {
  try {
    const orders = await getOrdersForReport(stationId, startDate, endDate)

    if (orders.length === 0) {
      throw new Error('No hay pedidos para generar el reporte')
    }

    // Obtener todas las fechas únicas
    const uniqueDates = [...new Set(orders.map(o => o.menu_date))].sort()

    // Agrupar por empleado
    const employeeMap = new Map()

    orders.forEach(order => {
      const empKey = order.employee.dni

      if (!employeeMap.has(empKey)) {
        employeeMap.set(empKey, {
          dni: order.employee.dni,
          fullName: order.employee.full_name,
          area: order.employee.area || 'N/A',
          role: order.employee.role_name,
          employeeDates: {},
          companyDates: {}
        })
      }

      const emp = employeeMap.get(empKey)
      const dateKey = order.menu_date

      // Inicializar si no existe
      if (!emp.employeeDates[dateKey]) {
        emp.employeeDates[dateKey] = 0
      }
      if (!emp.companyDates[dateKey]) {
        emp.companyDates[dateKey] = 0
      }

      // Acumular 25% empleado y 75% empresa
      emp.employeeDates[dateKey] += Number(order.employee_cost_snapshot || 0)
      emp.companyDates[dateKey] += Number(order.company_subsidy_snapshot || 0)
    })

    const employees = Array.from(employeeMap.values()).sort((a, b) =>
      a.area.localeCompare(b.area) || a.fullName.localeCompare(b.fullName)
    )

    // Headers comunes
    const baseHeaders = ['ITEM', 'DNI', 'NOMBRES', 'AREA', 'CARGO']
    const dateHeaders = uniqueDates.map(d => formatDate(d))
    const headers = [...baseHeaders, ...dateHeaders, 'TOTAL']

    const wb = XLSX.utils.book_new()

    // ==========================================
    // PESTAÑA 1: 25% - Descuento Empleado
    // ==========================================
    const employeeRows = employees.map((emp, index) => {
      const row = [index + 1, emp.dni, emp.fullName, emp.area, emp.role]
      let total = 0

      uniqueDates.forEach(date => {
        const amount = emp.employeeDates[date] || 0
        row.push(amount > 0 ? amount.toFixed(2) : '')
        total += amount
      })

      row.push(total.toFixed(2))
      return row
    })

    const employeeTotal = employeeRows.reduce((sum, row) =>
      sum + Number(row[row.length - 1]), 0
    )

    const ws1Data = [
      [[`25% - DESCUENTO EMPLEADO`]],
      [[`Estación: ${stationName} | Periodo: ${formatDate(startDate)} - ${formatDate(endDate)}`]],
      [['']],
      headers,
      ...employeeRows,
      [[''], [''], [''], [''], [''], ...Array(dateHeaders.length).fill(''), `S/ ${employeeTotal.toFixed(2)}`]
    ]

    const ws1 = XLSX.utils.aoa_to_sheet(ws1Data)
    ws1['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 35 }, { wch: 15 }, { wch: 30 },
      ...dateHeaders.map(() => ({ wch: 12 })),
      { wch: 12 }
    ]
    ws1['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } }
    ]

    XLSX.utils.book_append_sheet(wb, ws1, '25% Empleado')

    // ==========================================
    // PESTAÑA 2: 75% - Asunción Empresa
    // ==========================================
    const companyRows = employees.map((emp, index) => {
      const row = [index + 1, emp.dni, emp.fullName, emp.area, emp.role]
      let total = 0

      uniqueDates.forEach(date => {
        const amount = emp.companyDates[date] || 0
        row.push(amount > 0 ? amount.toFixed(2) : '')
        total += amount
      })

      row.push(total.toFixed(2))
      return row
    })

    const companyTotal = companyRows.reduce((sum, row) =>
      sum + Number(row[row.length - 1]), 0
    )

    const ws2Data = [
      [[`75% - ASUNCIÓN EMPRESA`]],
      [[`Estación: ${stationName} | Periodo: ${formatDate(startDate)} - ${formatDate(endDate)}`]],
      [['']],
      headers,
      ...companyRows,
      [[''], [''], [''], [''], [''], ...Array(dateHeaders.length).fill(''), `S/ ${companyTotal.toFixed(2)}`]
    ]

    const ws2 = XLSX.utils.aoa_to_sheet(ws2Data)
    ws2['!cols'] = ws1['!cols']
    ws2['!merges'] = ws1['!merges']

    XLSX.utils.book_append_sheet(wb, ws2, '75% Empresa')

    // ==========================================
    // PESTAÑA 3: Resumen Total
    // ==========================================
    const grandTotal = employeeTotal + companyTotal
    const subtotalSinIGV = grandTotal / (1 + IGV_RATE)
    const igvAmount = grandTotal - subtotalSinIGV

    // Calcular con boleta y factura (50/50 asumiendo distribución equitativa)
    const boletaPercent = 0.5
    const facturaPercent = 0.5

    const boletaTotal = grandTotal * boletaPercent
    const facturaSubtotal = (grandTotal * facturaPercent) / (1 + IGV_RATE)
    const facturaIGV = facturaSubtotal * IGV_RATE
    const facturaTotal = facturaSubtotal + facturaIGV

    const summaryData = [
      [[`RESUMEN TOTAL PARA FACTURACIÓN`]],
      [[`Estación: ${stationName} | Periodo: ${formatDate(startDate)} - ${formatDate(endDate)}`]],
      [['']],
      [['CONCEPTO', 'MONTO (S/)']],
      [['']],
      [['Aporte Empleados (25%)', employeeTotal.toFixed(2)]],
      [['Subsidio Empresa (75%)', companyTotal.toFixed(2)]],
      [['TOTAL GENERAL', grandTotal.toFixed(2)]],
      [['']],
      [['DISTRIBUCIÓN POR TIPO DE COMPROBANTE']],
      [['']],
      [['CON BOLETA (50%)', boletaTotal.toFixed(2)]],
      [['']],
      [['CON FACTURA (50%)']],
      [['  Subtotal', facturaSubtotal.toFixed(2)]],
      [['  IGV (18%)', facturaIGV.toFixed(2)]],
      [['  Total con IGV', facturaTotal.toFixed(2)]],
      [['']],
      [['VERIFICACIÓN TOTAL', (boletaTotal + facturaTotal).toFixed(2)]],
    ]

    const ws3 = XLSX.utils.aoa_to_sheet(summaryData)
    ws3['!cols'] = [{ wch: 40 }, { wch: 15 }]
    ws3['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }
    ]

    XLSX.utils.book_append_sheet(wb, ws3, 'Resumen')

    // Generar archivo
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  } catch (error) {
    console.error('Error generating billing report:', error)
    throw error
  }
}

/**
 * Descarga un blob como archivo
 * @param {Blob} blob - Archivo blob
 * @param {string} filename - Nombre del archivo
 */
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

export default {
  generateDiscountReport,
  generateBillingReport,
  downloadBlob
}
