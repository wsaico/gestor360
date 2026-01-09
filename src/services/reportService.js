import * as XLSX from 'xlsx-js-style'
import { supabase } from './supabase'
import { formatDate } from '@utils/helpers'
import { parseISO, format } from 'date-fns'

/**
 * Servicio para generar reportes de alimentación en formato Excel con Estilos Profesionales
 */

const IGV_RATE = 0.18

// ==========================================
// CONFIGURACIÓN DE ESTILOS PROFESIONALES
// ==========================================
const STYLE_HEADER = {
  fill: { fgColor: { rgb: "1E3A8A" } }, // Azul Oscuro Corporativo
  font: { color: { rgb: "FFFFFF" }, bold: true, sz: 11 },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } }
  }
}

const STYLE_CELL = {
  border: {
    top: { style: "thin", color: { rgb: "D1D5DB" } },
    bottom: { style: "thin", color: { rgb: "D1D5DB" } },
    left: { style: "thin", color: { rgb: "D1D5DB" } },
    right: { style: "thin", color: { rgb: "D1D5DB" } }
  },
  alignment: { vertical: "center" },
  font: { sz: 10 }
}

const STYLE_CELL_CENTER = {
  ...STYLE_CELL,
  alignment: { horizontal: "center", vertical: "center" }
}

const STYLE_TITLE = {
  font: { bold: true, sz: 14, color: { rgb: "111827" } },
  alignment: { horizontal: "left", vertical: "center" }
}

const STYLE_SUBTITLE = {
  font: { sz: 11, color: { rgb: "4B5563" } },
  alignment: { horizontal: "left", vertical: "center" }
}

const STYLE_SECONDARY_BG = {
  ...STYLE_CELL_CENTER,
  fill: { fgColor: { rgb: "F3F4F6" } }, // Gris Claro para Totales/Resumen
  font: { bold: true, sz: 10 }
}

const STYLE_TOTAL_FINAL = {
  ...STYLE_HEADER,
  font: { ...STYLE_HEADER.font, sz: 11 },
  fill: { fgColor: { rgb: "111827" } } // Negro para el total final
}

/**
 * Helper para crear una celda con valor y estilo
 */
const createCell = (value, style = STYLE_CELL) => ({ v: value, s: style })

/**
 * Obtiene datos de pedidos para reportes
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

    if (startDate) query = query.gte('menu_date', startDate)
    if (endDate) query = query.lte('menu_date', endDate)

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
 */
export const generateDiscountReport = async (stationId, startDate, endDate, stationName) => {
  try {
    const orders = await getOrdersForReport(stationId, startDate, endDate)
    if (orders.length === 0) throw new Error('No hay pedidos para generar el reporte')

    const uniqueDates = [...new Set(orders.map(o => o.menu_date))].sort()
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
      if (!emp.dateAmounts[dateKey]) emp.dateAmounts[dateKey] = 0
      emp.dateAmounts[dateKey] += Number(order.employee_cost_snapshot || 0)
    })

    const employees = Array.from(employeeMap.values())
      .filter(e => {
        const total = Object.values(e.dateAmounts).reduce((a, b) => a + b, 0)
        return total > 0
      })
      .sort((a, b) =>
        a.area.localeCompare(b.area) || a.fullName.localeCompare(b.fullName)
      )

    // Headers
    const headerRow = [
      createCell('ITEM', STYLE_HEADER),
      createCell('DNI', STYLE_HEADER),
      createCell('NOMBRES', STYLE_HEADER),
      createCell('AREA', STYLE_HEADER),
      createCell('CARGO', STYLE_HEADER),
      ...uniqueDates.map(date => createCell(formatDate(date, 'd'), STYLE_HEADER)),
      createCell('TOTAL', STYLE_HEADER)
    ]

    // Filas de datos
    const rows = employees.map((emp, index) => {
      const row = [
        createCell(index + 1, STYLE_CELL_CENTER),
        createCell(emp.dni, STYLE_CELL_CENTER),
        createCell(emp.fullName, STYLE_CELL),
        createCell(emp.area, STYLE_CELL_CENTER),
        createCell(emp.role, STYLE_CELL)
      ]

      let total = 0
      uniqueDates.forEach(date => {
        const amount = emp.dateAmounts[date] || 0
        row.push(createCell(amount > 0 ? amount.toFixed(2) : '', STYLE_CELL_CENTER))
        total += amount
      })

      row.push(createCell(total.toFixed(2), STYLE_SECONDARY_BG))
      return row
    })

    const wb = XLSX.utils.book_new()
    const wsData = [
      [createCell('CONTROL DE ALIMENTACIÓN PERSONAL - DESCUENTO COMEDOR', STYLE_TITLE)],
      [createCell(`Estación: ${stationName} | Periodo: ${formatDate(startDate)} - ${formatDate(endDate)}`, STYLE_SUBTITLE)],
      [createCell('')],
      headerRow,
      ...rows
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 35 }, { wch: 15 }, { wch: 30 },
      ...uniqueDates.map(() => ({ wch: 5 })),
      { wch: 12 }
    ]
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: headerRow.length - 1 } }
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Descuentos')
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  } catch (error) {
    console.error('Error generating discount report:', error)
    throw error
  }
}

/**
 * Genera el Reporte de Facturación
 */
export const generateBillingReport = async (stationId, startDate, endDate, stationName) => {
  try {
    let orders = await getOrdersForReport(stationId, startDate, endDate)

    if (orders.length === 0) throw new Error('No hay pedidos para generar el reporte')

    const uniqueDates = [...new Set(orders.map(o => o.menu_date))].sort()
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
      if (!emp.employeeDates[dateKey]) emp.employeeDates[dateKey] = 0
      if (!emp.companyDates[dateKey]) emp.companyDates[dateKey] = 0
      emp.employeeDates[dateKey] += Number(order.employee_cost_snapshot || 0)
      emp.companyDates[dateKey] += Number(order.company_subsidy_snapshot || 0)
    })

    const allEmployees = Array.from(employeeMap.values())

    // Filtro para 25%/75% (solo los que tienen costo > 0)
    const employeesWithCost = allEmployees
      .filter(e => {
        const totalEmp = Object.values(e.employeeDates).reduce((a, b) => a + b, 0)
        const totalComp = Object.values(e.companyDates).reduce((a, b) => a + b, 0)
        return (totalEmp + totalComp) > 0
      })
      .sort((a, b) => a.area.localeCompare(b.area) || a.fullName.localeCompare(b.fullName))

    // Filtro para Especiales (los que tienen registros pero costo = 0)
    const specialEmployees = allEmployees
      .filter(e => {
        const totalEmp = Object.values(e.employeeDates).reduce((a, b) => a + b, 0)
        const totalComp = Object.values(e.companyDates).reduce((a, b) => a + b, 0)
        return (totalEmp + totalComp) === 0
      })
      .sort((a, b) => a.area.localeCompare(b.area) || a.fullName.localeCompare(b.fullName))

    const baseHeaders = [
      createCell('ITEM', STYLE_HEADER),
      createCell('DNI', STYLE_HEADER),
      createCell('NOMBRES', STYLE_HEADER),
      createCell('AREA', STYLE_HEADER),
      createCell('CARGO', STYLE_HEADER)
    ]
    const dateHeaders = uniqueDates.map(d => createCell(formatDate(d, 'd'), STYLE_HEADER))
    const headers = [...baseHeaders, ...dateHeaders, createCell('TOTAL', STYLE_HEADER)]

    const wb = XLSX.utils.book_new()

    // --- Pestaña 1: 25% Empleado ---
    const employeeRows = employeesWithCost.map((emp, index) => {
      const row = [
        createCell(index + 1, STYLE_CELL_CENTER),
        createCell(emp.dni, STYLE_CELL_CENTER),
        createCell(emp.fullName, STYLE_CELL),
        createCell(emp.area, STYLE_CELL_CENTER),
        createCell(emp.role, STYLE_CELL)
      ]
      let total = 0
      uniqueDates.forEach(date => {
        const amount = emp.employeeDates[date] || 0
        row.push(createCell(amount > 0 ? amount.toFixed(2) : '', STYLE_CELL_CENTER))
        total += amount
      })
      row.push(createCell(total.toFixed(2), STYLE_SECONDARY_BG))
      return row
    })
    const employeeTotal = employeeRows.reduce((sum, row) => sum + Number(row[row.length - 1].v), 0)

    const ws1Data = [
      [createCell('25% - DESCUENTO EMPLEADO', STYLE_TITLE)],
      [createCell(`Estación: ${stationName} | Periodo: ${formatDate(startDate)} - ${formatDate(endDate)}`, STYLE_SUBTITLE)],
      [createCell('')],
      headers,
      ...employeeRows,
      [...Array(headers.length - 1).fill(createCell('')), createCell(`S/ ${employeeTotal.toFixed(2)}`, STYLE_TOTAL_FINAL)]
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(ws1Data)
    ws1['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 35 }, { wch: 15 }, { wch: 30 },
      ...dateHeaders.map(() => ({ wch: 5 })),
      { wch: 12 }
    ]
    ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } }]
    XLSX.utils.book_append_sheet(wb, ws1, '25% Empleado')

    // --- Pestaña 2: 75% Empresa ---
    const companyRows = employeesWithCost.map((emp, index) => {
      const row = [
        createCell(index + 1, STYLE_CELL_CENTER),
        createCell(emp.dni, STYLE_CELL_CENTER),
        createCell(emp.fullName, STYLE_CELL),
        createCell(emp.area, STYLE_CELL_CENTER),
        createCell(emp.role, STYLE_CELL)
      ]
      let total = 0
      uniqueDates.forEach(date => {
        const amount = emp.companyDates[date] || 0
        row.push(createCell(amount > 0 ? amount.toFixed(2) : '', STYLE_CELL_CENTER))
        total += amount
      })
      row.push(createCell(total.toFixed(2), STYLE_SECONDARY_BG))
      return row
    })
    const companyTotal = companyRows.reduce((sum, row) => sum + Number(row[row.length - 1].v), 0)

    const ws2Data = [
      [createCell('75% - ASUNCIÓN EMPRESA', STYLE_TITLE)],
      [createCell(`Estación: ${stationName} | Periodo: ${formatDate(startDate)} - ${formatDate(endDate)}`, STYLE_SUBTITLE)],
      [createCell('')],
      headers,
      ...companyRows,
      [...Array(headers.length - 1).fill(createCell('')), createCell(`S/ ${companyTotal.toFixed(2)}`, STYLE_TOTAL_FINAL)]
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(ws2Data)
    ws2['!cols'] = ws1['!cols']
    ws2['!merges'] = ws1['!merges']
    XLSX.utils.book_append_sheet(wb, ws2, '75% Empresa')

    // --- Pestaña 3: Pedidos Especiales (Cortesía/Visitantes) ---
    const specialRows = specialEmployees.map((emp, index) => {
      const row = [
        createCell(index + 1, STYLE_CELL_CENTER),
        createCell(emp.dni, STYLE_CELL_CENTER),
        createCell(emp.fullName, STYLE_CELL),
        createCell(emp.area, STYLE_CELL_CENTER),
        createCell(emp.role, STYLE_CELL)
      ]
      let totalCount = 0
      uniqueDates.forEach(date => {
        // En esta pestaña buscamos si hubo consumos (aunque el costo sea 0)
        // Usamos orders para verificar si hubo algo ese día para este emp
        const hasOrder = orders.some(o => o.employee.dni === emp.dni && o.menu_date === date)
        row.push(createCell(hasOrder ? '1' : '', STYLE_CELL_CENTER))
        if (hasOrder) totalCount++
      })
      row.push(createCell(totalCount, STYLE_SECONDARY_BG))
      return row
    })

    const wsSpecData = [
      [createCell('PEDIDOS ESPECIALES - CORTESÍA / VISITANTES (SIN COSTO)', STYLE_TITLE)],
      [createCell(`Estación: ${stationName} | Periodo: ${formatDate(startDate)} - ${formatDate(endDate)}`, STYLE_SUBTITLE)],
      [createCell('')],
      [...baseHeaders, ...dateHeaders, createCell('TOTAL CANT.', STYLE_HEADER)],
      ...specialRows
    ]
    const wsSpec = XLSX.utils.aoa_to_sheet(wsSpecData)
    wsSpec['!cols'] = ws1['!cols']
    wsSpec['!merges'] = ws1['!merges']
    XLSX.utils.book_append_sheet(wb, wsSpec, 'Pedidos Especiales')

    // --- Pestaña 3: Resumen Total ---
    const startD = typeof startDate === 'string' ? parseISO(startDate) : startDate
    const weekNum = format(startD, 'I')
    const totalServicios = orders.length
    const pedidosNormales = orders.filter(o => Number(o.employee_cost_snapshot || 0) > 0).length
    const pedidosEspeciales = orders.filter(o => Number(o.employee_cost_snapshot || 0) <= 0).length

    const empPriceBreakdown = {}
    const compPriceBreakdown = {}
    orders.forEach(o => {
      const epVal = Number(o.employee_cost_snapshot || 0)
      const cpVal = Number(o.company_subsidy_snapshot || 0)

      if (epVal > 0) {
        const ep = epVal.toFixed(2)
        empPriceBreakdown[ep] = (empPriceBreakdown[ep] || 0) + 1
      }

      if (cpVal > 0) {
        const cp = cpVal.toFixed(2)
        compPriceBreakdown[cp] = (compPriceBreakdown[cp] || 0) + 1
      }
    })

    const buildSummaryRows = (breakdown) => Object.entries(breakdown)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([price, count], idx) => [
        createCell(idx + 1, STYLE_CELL_CENTER),
        createCell('ALIMENTACION PERSONAL', STYLE_CELL),
        createCell(formatDate(startDate), STYLE_CELL_CENTER),
        createCell(formatDate(endDate), STYLE_CELL_CENTER),
        createCell(count, STYLE_CELL_CENTER),
        createCell(price, STYLE_CELL_CENTER),
        createCell((Number(price) * count).toFixed(2), STYLE_CELL_CENTER)
      ])

    const empTableRows = buildSummaryRows(empPriceBreakdown)
    const compTableRows = buildSummaryRows(compPriceBreakdown)
    const totalFacturarSub = compTableRows.reduce((sum, r) => sum + Number(r[6].v), 0)
    const igv = totalFacturarSub * IGV_RATE
    const totalFacturarFinal = totalFacturarSub + igv

    const summHeader = ['ITEM', 'DESCRIPCION', 'DESDE', 'HASTA', 'CANTIDAD', 'P.UNITARIO', 'TOTAL'].map(h => createCell(h, STYLE_HEADER))

    const ws3Data = [
      [createCell(`RESUMEN TOTAL PARA FACTURACION DE LA SEMANA ${weekNum}`, STYLE_TITLE)],
      [createCell(`Período: ${formatDate(startDate)} - ${formatDate(endDate)}`, STYLE_SUBTITLE)],
      [createCell('')],
      [createCell('CON BOLETA 25% - DESCUENTO EMPLEADO', STYLE_SECONDARY_BG)],
      summHeader,
      ...empTableRows,
      [createCell(''), createCell(''), createCell(''), createCell('TOTAL DESCUENTO EMPLEADO', STYLE_SECONDARY_BG), createCell(''), createCell(''), createCell(employeeTotal.toFixed(2), STYLE_SECONDARY_BG)],
      [createCell('')],
      [createCell('CON FACTURA 75% - ASUNCIÓN EMPRESA', STYLE_SECONDARY_BG)],
      summHeader,
      ...compTableRows,
      [...Array(5).fill(createCell('')), createCell('SUB TOTAL', STYLE_SECONDARY_BG), createCell(totalFacturarSub.toFixed(2), STYLE_CELL_CENTER)],
      [...Array(5).fill(createCell('')), createCell(`IGV ${(IGV_RATE * 100).toFixed(2)}%`, STYLE_SECONDARY_BG), createCell(igv.toFixed(2), STYLE_CELL_CENTER)],
      [...Array(5).fill(createCell('')), createCell('TOTAL A FACTURAR', STYLE_TOTAL_FINAL), createCell(totalFacturarFinal.toFixed(2), STYLE_TOTAL_FINAL)]
    ]

    const ws3 = XLSX.utils.aoa_to_sheet(ws3Data)
    XLSX.utils.sheet_add_aoa(ws3, [
      [createCell('RESUMEN DE CONSUMOS', STYLE_SECONDARY_BG)],
      [createCell('Total de Servicios:', STYLE_CELL), createCell(totalServicios, STYLE_CELL_CENTER)],
      [createCell('Pedidos Normales:', STYLE_CELL), createCell(pedidosNormales, STYLE_CELL_CENTER)],
      [createCell('Pedidos Especiales:', STYLE_CELL), createCell(pedidosEspeciales, STYLE_CELL_CENTER)]
    ], { origin: 'I5' })

    ws3['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 5 }, { wch: 25 }, { wch: 10 }]
    ws3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }]
    XLSX.utils.book_append_sheet(wb, ws3, 'Resumen')

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  } catch (error) {
    console.error('Error generating billing report:', error)
    throw error
  }
}

/**
 * Genera el Reporte de Auditoría
 */
export const generateMissingOrdersReport = async (stationId, startDate, endDate, stationName) => {
  try {
    const { data: employees, error: empError } = await supabase.from('employees').select('id, dni, full_name, role_name, area').eq('station_id', stationId).neq('status', 'CESADO').order('area').order('full_name')
    if (empError) throw empError

    const orders = await getOrdersForReport(stationId, startDate, endDate)
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    const dates = []
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) dates.push(new Date(dt).toISOString().split('T')[0])

    const orderMap = {}
    orders.forEach(o => {
      const dni = o.employee.dni
      const date = o.menu_date
      if (!orderMap[dni]) orderMap[dni] = {}
      orderMap[dni][date] = true
    })

    const STYLE_MISSING = { ...STYLE_CELL_CENTER, font: { color: { rgb: "EF4444" }, bold: true } }

    const rows = employees.map((emp, idx) => {
      const row = [createCell(idx + 1, STYLE_CELL_CENTER), createCell(emp.dni, STYLE_CELL_CENTER), createCell(emp.full_name, STYLE_CELL), createCell(emp.area || 'N/A', STYLE_CELL_CENTER), createCell(emp.role_name, STYLE_CELL)]
      let faltas = 0
      dates.forEach(date => {
        const hasOrder = orderMap[emp.dni]?.[date]
        if (!hasOrder) { row.push(createCell('FALTA', STYLE_MISSING)); faltas++ }
        else row.push(createCell('', STYLE_CELL_CENTER))
      })
      row.push(createCell(faltas, STYLE_SECONDARY_BG))
      return row
    })

    const wb = XLSX.utils.book_new()
    const dateHeaders = dates.map(d => createCell(formatDate(d, 'd'), STYLE_HEADER))
    const headers = [createCell('ITEM', STYLE_HEADER), createCell('DNI', STYLE_HEADER), createCell('NOMBRES', STYLE_HEADER), createCell('AREA', STYLE_HEADER), createCell('CARGO', STYLE_HEADER), ...dateHeaders, createCell('TOTAL FALTAS', STYLE_HEADER)]

    const wsData = [
      [createCell('REPORTE DE AUDITORÍA - CONTROL DE ASISTENCIA AL COMEDOR', STYLE_TITLE)],
      [createCell(`Estación: ${stationName} | Periodo: ${formatDate(startDate)} - ${formatDate(endDate)}`, STYLE_SUBTITLE)],
      [createCell('')],
      headers,
      ...rows
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 35 }, { wch: 20 }, { wch: 30 }, ...dateHeaders.map(() => ({ wch: 6 })), { wch: 15 }]
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } }]
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoría Faltantes')

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  } catch (error) {
    console.error('Error generating missing orders report:', error)
    throw error
  }
}

/**
 * Genera el Reporte de Renovaciones (Reposición)
 */
export const generateRenewalsReport = async (employeeGroups, stationName, itemsInventory) => {
  try {
    const wb = XLSX.utils.book_new()

    // Headers
    const headerRow = [
      createCell('EMPLEADO', STYLE_HEADER),
      createCell('DNI', STYLE_HEADER),
      createCell('CARGO', STYLE_HEADER),
      createCell('ÁREA', STYLE_HEADER),
      createCell('ITEM (DESCRIPCIÓN)', STYLE_HEADER),
      createCell('TALLA', STYLE_HEADER),
      createCell('CANTIDAD', STYLE_HEADER),
      createCell('STOCK ALMACÉN', STYLE_HEADER),
      createCell('ESTADO', STYLE_HEADER),
      createCell('VENCIMIENTO', STYLE_HEADER),
      createCell('OBSERVACIONES', STYLE_HEADER)
    ]

    const rows = []

    employeeGroups.forEach(group => {
      group.items.forEach(item => {
        // Logic needed here again or passed in? 
        // We will recalculate logic here to keep it self-contained or assume passed data is raw
        // Logic for days diff
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const renewal = new Date(item.renewal_date)
        renewal.setHours(0, 0, 0, 0)
        const diffTime = renewal.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        let status = 'VIGENTE'
        if (diffDays < 0) status = 'VENCIDO'
        else if (diffDays <= 30) status = 'POR_VENCER'

        // Stock lookup
        const inventoryItem = itemsInventory.find(i => i.id === item.item_id)
        const currentStock = inventoryItem ? inventoryItem.stock_current : 0

        // Styles for Status
        let statusStyle = STYLE_CELL_CENTER
        if (status === 'VENCIDO') statusStyle = { ...STYLE_CELL_CENTER, font: { color: { rgb: "EF4444" }, bold: true } }
        if (status === 'POR_VENCER') statusStyle = { ...STYLE_CELL_CENTER, font: { color: { rgb: "F59E0B" }, bold: true } }

        rows.push([
          createCell(group.employee_name, STYLE_CELL),
          createCell(group.dni || '-', STYLE_CELL_CENTER),
          createCell(group.role_name || '-', STYLE_CELL),
          createCell(group.area || '-', STYLE_CELL_CENTER),
          createCell(item.item_name, STYLE_CELL),
          createCell(item.size || 'ÚNICA', STYLE_CELL_CENTER),
          createCell(item.quantity, STYLE_CELL_CENTER),
          createCell(currentStock, STYLE_CELL_CENTER), // Stock
          createCell(status, statusStyle),
          createCell(formatDate(item.renewal_date), STYLE_CELL_CENTER),
          createCell(status === 'VENCIDO' ? 'URGENTE' : '', STYLE_CELL)
        ])
      })
    })

    const wsData = [
      [createCell('REPORTE DE NECESIDAD DE REPOSICIÓN - EPPs Y UNIFORMES', STYLE_TITLE)],
      [createCell(`Estación: ${stationName} | Fecha de Corte: ${formatDate(new Date().toISOString())}`, STYLE_SUBTITLE)],
      [createCell('')],
      headerRow,
      ...rows
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Column Widths
    ws['!cols'] = [
      { wch: 30 }, // Empleado
      { wch: 12 }, // DNI
      { wch: 20 }, // Cargo
      { wch: 15 }, // Area
      { wch: 35 }, // Item
      { wch: 10 }, // Talla
      { wch: 10 }, // Cantidad
      { wch: 15 }, // Stock
      { wch: 15 }, // Estado
      { wch: 12 }, // Vencimiento
      { wch: 20 }  // Obs
    ]

    // Merge Title
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: headerRow.length - 1 } }
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Reposición')

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

  } catch (error) {
    console.error('Error generating renewals report:', error)
    throw error
  }
}

/**
 * Genera el Reporte de Gestión de Pedidos (Estilo Profesional)
 */
export const generateOrdersExport = async (orders, stationName) => {
  try {
    const wb = XLSX.utils.book_new()

    // Helper para generar filas
    const generateRows = (orderList) => orderList.map(order => {
      // Un pedido es especial si: es tipo VISITOR, el empleado es visitante, o tiene descuento de CORTESÍA
      const isSpecial =
        order.order_type === 'VISITOR' ||
        order.employee?.is_visitor ||
        order.employee?.visitor_discount_type === 'COURTESY'

      return [
        createCell(formatDate(order.menu_date), STYLE_CELL_CENTER),
        createCell(order.meal_type === 'DESAYUNO' ? 'DESAYUNO' : 'ALMUERZO', STYLE_CELL_CENTER),
        createCell(order.employee?.full_name || order.visitor_name || 'VISITANTE', STYLE_CELL),
        createCell(order.employee?.dni || '-', STYLE_CELL_CENTER),
        createCell(order.employee?.role_name || '-', STYLE_CELL),
        createCell(order.selected_option, STYLE_CELL),
        createCell(order.status === 'CONSUMED' ? 'ATENDIDO' : order.status === 'CANCELLED' ? 'CANCELADO' : 'PENDIENTE', STYLE_CELL_CENTER),
        createCell(isSpecial ? 'ESPECIAL' : 'NORMAL', STYLE_CELL_CENTER),
        createCell(Number(order.cost_applied || 0).toFixed(2), STYLE_CELL_CENTER),
        createCell(Number(order.company_subsidy_snapshot || 0).toFixed(2), STYLE_CELL_CENTER),
        createCell(order.notes || '-', STYLE_CELL)
      ]
    })

    const headerRow = [
      createCell('FECHA', STYLE_HEADER),
      createCell('SERVICIO', STYLE_HEADER),
      createCell('EMPLEADO', STYLE_HEADER),
      createCell('DNI', STYLE_HEADER),
      createCell('CARGO', STYLE_HEADER),
      createCell('OPCIÓN', STYLE_HEADER),
      createCell('ESTADO', STYLE_HEADER),
      createCell('TIPO PEDIDO', STYLE_HEADER),
      createCell('COSTO EMP.', STYLE_HEADER),
      createCell('SUBSIDIO EMP.', STYLE_HEADER),
      createCell('NOTAS', STYLE_HEADER)
    ]

    const colWidths = [
      { wch: 12 }, { wch: 12 }, { wch: 35 }, { wch: 12 }, { wch: 25 },
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 30 }
    ]

    const normalOrders = orders.filter(o => {
      const isSpecial =
        o.order_type === 'VISITOR' ||
        o.employee?.is_visitor ||
        o.employee?.visitor_discount_type === 'COURTESY'
      return !isSpecial
    })

    const specialOrders = orders.filter(o => {
      const isSpecial =
        o.order_type === 'VISITOR' ||
        o.employee?.is_visitor ||
        o.employee?.visitor_discount_type === 'COURTESY'
      return isSpecial
    })

    // --- Pestaña 1: Pedidos Normales ---
    const wsNormalData = [
      [createCell('CONTROL DE ALIMENTACIÓN - PEDIDOS NORMALES', STYLE_TITLE)],
      [createCell(`Estación: ${stationName || 'Todas'} | Fecha Reporte: ${formatDate(new Date())}`, STYLE_SUBTITLE)],
      [createCell('')],
      headerRow,
      ...generateRows(normalOrders)
    ]
    const wsNormal = XLSX.utils.aoa_to_sheet(wsNormalData)
    wsNormal['!cols'] = colWidths
    wsNormal['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: headerRow.length - 1 } }
    ]
    XLSX.utils.book_append_sheet(wb, wsNormal, 'Pedidos Normales')

    // --- Pestaña 2: Pedidos Especiales ---
    const wsSpecialData = [
      [createCell('CONTROL DE ALIMENTACIÓN - PEDIDOS ESPECIALES', STYLE_TITLE)],
      [createCell(`Estación: ${stationName || 'Todas'} | Fecha Reporte: ${formatDate(new Date())}`, STYLE_SUBTITLE)],
      [createCell('')],
      headerRow,
      ...generateRows(specialOrders)
    ]
    const wsSpecial = XLSX.utils.aoa_to_sheet(wsSpecialData)
    wsSpecial['!cols'] = colWidths
    wsSpecial['!merges'] = wsNormal['!merges']
    XLSX.utils.book_append_sheet(wb, wsSpecial, 'Pedidos Especiales')

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

  } catch (error) {
    console.error('Error in generateOrdersExport:', error)
    throw error
  }
}

/**
 * Genera el Reporte de Empleados (Estilo Profesional)
 */
export const generateEmployeesExport = async (employees, stationName) => {
  try {
    const wb = XLSX.utils.book_new()

    const headerRow = [
      createCell('DNI', STYLE_HEADER),
      createCell('NOMBRE COMPLETO', STYLE_HEADER),
      createCell('ESTACIÓN', STYLE_HEADER),
      createCell('ÁREA', STYLE_HEADER),
      createCell('CARGO', STYLE_HEADER),
      createCell('TIPO CONTRATO', STYLE_HEADER),
      createCell('JORNADA', STYLE_HEADER),
      createCell('ESTADO', STYLE_HEADER),
      createCell('FECHA INGRESO', STYLE_HEADER),
      createCell('EMAIL', STYLE_HEADER),
      createCell('TELÉFONO', STYLE_HEADER),
      createCell('TIPO VISITANTE', STYLE_HEADER),
      createCell('CORTESÍA', STYLE_HEADER)
    ]

    const rows = employees.map(emp => [
      createCell(emp.dni, STYLE_CELL_CENTER),
      createCell(emp.full_name, STYLE_CELL),
      createCell(emp.station?.code || emp.station_id || '-', STYLE_CELL_CENTER),
      createCell(emp.area || '-', STYLE_CELL),
      createCell(emp.role_name || '-', STYLE_CELL),
      createCell(emp.contract_type || '-', STYLE_CELL_CENTER),
      createCell(emp.work_schedule || '-', STYLE_CELL_CENTER),
      createCell(emp.status === 'ACTIVE' ? 'ACTIVO' : 'CESADO', STYLE_CELL_CENTER),
      createCell(emp.hire_date ? formatDate(emp.hire_date) : '-', STYLE_CELL_CENTER),
      createCell(emp.email || '-', STYLE_CELL),
      createCell(emp.phone || '-', STYLE_CELL_CENTER),
      createCell(emp.is_visitor ? 'VISITANTE' : 'PLANILLA', STYLE_CELL_CENTER),
      createCell(emp.visitor_discount_type === 'COURTESY' ? 'SÍ' : 'NO', STYLE_CELL_CENTER)
    ])

    const wsData = [
      [createCell('REPORTE MAESTRO DE EMPLEADOS', STYLE_TITLE)],
      [createCell(`Estación: ${stationName || 'Todas'} | Fecha Generación: ${formatDate(new Date())}`, STYLE_SUBTITLE)],
      [createCell('')],
      headerRow,
      ...rows
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)

    ws['!cols'] = [
      { wch: 12 }, // DNI
      { wch: 35 }, // Nombre
      { wch: 12 }, // Estación
      { wch: 20 }, // Área
      { wch: 25 }, // Cargo
      { wch: 15 }, // Contrato
      { wch: 15 }, // Jornada
      { wch: 10 }, // Estado
      { wch: 15 }, // Ingreso
      { wch: 30 }, // Email
      { wch: 15 }, // Teléfono
      { wch: 15 }, // Tipo Visitante
      { wch: 10 }  // Cortesía
    ]

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: headerRow.length - 1 } }
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Empleados')

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

  } catch (error) {
    console.error('Error in generateEmployeesExport:', error)
    throw error
  }
}

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
  downloadBlob,
  generateMissingOrdersReport,
  generateRenewalsReport,
  generateOrdersExport,
  generateEmployeesExport // Added
}
