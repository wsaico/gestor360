import { jsPDF } from 'jspdf'
import { saveAs } from 'file-saver'
import autoTable from 'jspdf-autotable'
import { formatDate } from './helpers'
import talmaLogo from '../assets/talma_logo.jpg'
import supabase from '../services/supabase'

const getImageData = async (url) => {
    if (!url) return null

    try {
        let blob = null
        let errorReason = ''

        // 1. Strict Regex Parser (Best Case)
        const supabaseRegex = /storage\/v1\/object\/public\/([^/]+)\/(.+)/
        const match = url.match(supabaseRegex)

        if (match) {
            const bucketName = match[1]
            const rawPath = match[2]
            const filePath = decodeURIComponent(rawPath.split('?')[0])
            

            const { data, error } = await supabase.storage
                .from(bucketName)
                .download(filePath)

            if (!error && data) blob = data
            else errorReason = error?.message || 'Strict Download Failed'
        }

        // 2. Loose Parser (Fallback for weird URLs)
        // If strict failed OR didn't match, but we haven't got a blob yet
        if (!blob && url.includes('supabase')) {
            const rawFileName = url.split('/').pop() // Just grab the end
            if (rawFileName) {
                const fileName = decodeURIComponent(rawFileName.split('?')[0])
                

                const { data, error } = await supabase.storage
                    .from('settings')
                    .download(fileName)

                if (!error && data) {
                    blob = data
                    errorReason = '' // Clear previous error
                } else {
                    if (!errorReason) errorReason = `Loose Download Failed: ${error?.message}`
                }
            }
        }

        // 3. Last Resort: Standard fetch
        if (!blob) {
            
            try {
                const res = await fetch(url, { mode: 'cors', cache: 'no-cache' })
                if (res.ok) {
                    blob = await res.blob()
                } else {
                    if (!errorReason) errorReason = `Fetch ${res.status}: ${res.statusText}`
                }
            } catch (fetchErr) {
                if (!errorReason) errorReason = `Fetch Error: ${fetchErr.message}`
            }
        }

        if (!blob) return { error: errorReason || 'Unknown Error', url: url }

        // Convert Blob to Base64
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => {
                const mimeType = blob.type
                let format = 'JPEG'
                if (mimeType === 'image/png') format = 'PNG'
                if (mimeType === 'image/webp') format = 'WEBP'
                resolve({ data: reader.result, format })
            }
            reader.onerror = () => reject({ error: 'FileReader Error', url: url })
            reader.readAsDataURL(blob)
        })

    } catch (e) {
        console.error('Error loading image:', e)
        return { error: e.message, url: url }
    }
}



/**
 * Genera un PDF de acta de entrega de EPP/Uniformes conforme al formato Talma o Personalizado
 * @param {Object} delivery - Datos de la entrega
 * @param {Object} employee - Datos del empleado
 * @param {string} stationName - Nombre de la estación
 * @param {Object} settings - Configuración global (Identidad, Formatos, etc)
 */
export const generateDeliveryPDF = async (delivery, employee, stationName, settings = {}) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
    })

    // --- CONFIGURACIÓN DINÁMICA ---
    const companyLogoUrl = settings.COMPANY_LOGO_URL || null

    let logoObj = null
    if (companyLogoUrl) {
        logoObj = await getImageData(companyLogoUrl)
        if (!logoObj) {
            console.error('Custom logo failed to load. Showing no logo.')
        }
    }
    // No fallback to talmaLogo anymore. Generic system.

    const docTitle = 'REGISTRO DE EQUIPOS DE SEGURIDAD O EMERGENCIA'
    const docCode = settings.REPORT_CODE || 'FOR-OPE-001'
    const docVersion = settings.REPORT_VERSION || '5'
    const docDateEmission = settings.REPORT_DATE_EMISSION ? formatDate(settings.REPORT_DATE_EMISSION) : '06/11/2023'

    const companyName = settings.COMPANY_NAME || 'Talma Servicios Aeroportuarios S.A.'
    const companyRuc = settings.COMPANY_RUC || '20204621242'
    const companyAddress = settings.COMPANY_ADDRESS || 'Av. Francisco Carlé S/N - Jauja'
    const companyActivity = settings.COMPANY_ACTIVITY || ': Otras actividades de transporte'

    // Employee Count Logic
    let employeeCount = '25'
    if (settings.REPORT_AUTO_EMPLOYEE_COUNT === 'true' || settings.REPORT_AUTO_EMPLOYEE_COUNT === true) {
        employeeCount = settings.calculated_employee_count || '25'
    } else {
        employeeCount = settings.REPORT_MANUAL_EMPLOYEE_COUNT || '25'
    }

    // Configuración de página
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 10

    // Configuración de Estilos
    const blueColor = [0, 51, 153] // Azul oscuro corporativo
    const headerFill = [230, 230, 230] // Gris claro

    // ================= HEADER =================
    // Grid para el encabezado usando autoTable
    autoTable(doc, {
        body: [
            [
                { content: '', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
                { content: docTitle, rowSpan: 3, styles: { halign: 'center', valign: 'middle', fontSize: 13, fontStyle: 'bold', textColor: blueColor } },
                { content: 'Código:', styles: { fillColor: headerFill, fontStyle: 'bold', fontSize: 8 } },
                { content: docCode, styles: { halign: 'center', fontSize: 8 } }
            ],
            [
                { content: 'Fecha de emisión:', styles: { fillColor: headerFill, fontStyle: 'bold', fontSize: 8 } },
                { content: docDateEmission, styles: { halign: 'center', fontSize: 8 } }
            ],
            [
                { content: 'Versión:', styles: { fillColor: headerFill, fontStyle: 'bold', fontSize: 8 } },
                { content: docVersion, styles: { halign: 'center', fontSize: 8 } }
            ]
        ],
        theme: 'plain',
        startY: margin,
        tableWidth: pageWidth - (margin * 2),
        margin: { left: margin },
        styles: {
            lineWidth: 0.2,
            lineColor: blueColor,
            cellPadding: 2,
            font: 'helvetica'
        },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 35 },
            3: { cellWidth: 25 }
        },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 0 && data.row.index === 0) {
                if (logoObj && logoObj.data) {
                    try {
                        const cell = data.cell
                        const padding = 2
                        const imgWidth = cell.width - (padding * 2)
                        const imgHeight = cell.height - (padding * 2)

                        let safeFormat = logoObj.format
                        if (safeFormat !== 'PNG' && safeFormat !== 'JPEG') safeFormat = 'PNG'

                        doc.addImage(logoObj.data, safeFormat, cell.x + padding, cell.y + padding, imgWidth, imgHeight, undefined, 'FAST')
                    } catch (e) {
                        console.error('Error drawing logo', e)
                    }
                } else if (companyLogoUrl || (logoObj?.error)) {
                    // DEBUG: Show why it failed
                    const cell = data.cell
                    const padding = 2
                    doc.setFontSize(5)
                    doc.setTextColor(255, 0, 0)
                    const msg = logoObj?.error || 'Error Carga Logo'
                    doc.text(msg.substring(0, 40), cell.x + padding, cell.y + 5)

                    // Show URL for debugging
                    const urlStr = logoObj?.url || companyLogoUrl || ''
                    if (urlStr) {
                        const splitUrl = urlStr.length > 30 ? urlStr.substring(0, 30) + '...' : urlStr
                        doc.text(splitUrl, cell.x + padding, cell.y + 10)
                    }
                }
            }
        }
    })

    let finalY = doc.lastAutoTable.finalY + 5

    // ================= DATOS EMPLEADOR / TRABAJADOR =================

    // --- EMPLEADOR ---
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...blueColor)
    doc.text('DATOS DEL EMPLEADOR', margin, finalY)

    finalY += 3

    // Labels Empleador
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')

    const row1Y = finalY
    doc.text('Razón Social:', margin, row1Y)
    doc.text('RUC:', margin, row1Y + 4)
    doc.text('Domicilio:', margin, row1Y + 8)

    doc.text('ACTIVIDAD ECONÓMICA', margin + 90, row1Y)
    doc.text('NRO DE TRABAJADORES EN EL CENTRO LABORAL', margin + 90, row1Y + 4)

    // Values Empleador
    doc.setFont('helvetica', 'normal')

    // Columna 1
    doc.text(companyName, margin + 25, row1Y)
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.1)
    doc.line(margin + 25, row1Y + 1, margin + 85, row1Y + 1)

    doc.text(companyRuc, margin + 25, row1Y + 4)
    doc.line(margin + 25, row1Y + 5, margin + 85, row1Y + 5)

    doc.text(companyAddress, margin + 25, row1Y + 8)
    doc.line(margin + 25, row1Y + 9, margin + 85, row1Y + 9)

    // Columna 2
    doc.text(companyActivity, margin + 155, row1Y)
    doc.text(String(employeeCount), margin + 155, row1Y + 4)

    finalY = row1Y + 15

    // --- TRABAJADOR ---
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...blueColor)
    doc.text('DATOS DEL TRABAJADOR', margin, finalY)

    finalY += 3
    const row2Y = finalY

    // Labels Trabajador
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')

    doc.text('Nombres y Apellidos', margin, row2Y)
    doc.text('DNI:', margin, row2Y + 4)

    doc.text('CARGO', margin + 90, row2Y)
    doc.text('AREA', margin + 90, row2Y + 4)

    // Values Trabajador
    doc.setFont('helvetica', 'normal')
    const fullName = (employee?.full_name || '').toUpperCase()
    const dni = employee?.dni || ''
    const cargo = (employee?.role_name || '-').toUpperCase()
    const area = (stationName || '-').toUpperCase()

    doc.text(fullName, margin + 30, row2Y)
    doc.line(margin + 30, row2Y + 1, margin + 85, row2Y + 1)

    doc.text(dni, margin + 30, row2Y + 4)
    doc.line(margin + 30, row2Y + 5, margin + 50, row2Y + 5)

    doc.text(cargo, margin + 110, row2Y)
    doc.text(area, margin + 110, row2Y + 4)

    finalY = row2Y + 10

    // ================= ITEMS TABLE =================

    // Preparar datos
    const tableBody = (delivery.items || []).map((item, index) => {
        const name = (item.name || item.item_name || '').toUpperCase()
        const isUniform = item.item_type === 'UNIFORME' || name.includes('CASACA') || name.includes('PANTALON') || name.includes('CAMISA')
        const isEPP = !isUniform

        return [
            index + 1,
            isEPP ? 'X' : '',
            '',
            isUniform ? 'X' : '',
            name,
            item.size || item.item_size || '-',
            item.quantity || 1,
            item.motivo || (delivery.delivery_reason || '').replace(/_/g, ' ').toLowerCase(),
            formatDate(delivery.delivery_date),
            item.fecha_renovacion ? formatDate(item.fecha_renovacion) : '-',
            item.observacion || '',
            '' // Columna para firma (index 11)
        ]
    })

    if (tableBody.length === 0) {
        tableBody.push(['', '', '', '', 'Sin items registrados', '', '', '', '', '', '', ''])
    }

    // Ancho total disponible ~190mm
    // Redefiniendo anchos para dar prioridad a descripción y firma
    autoTable(doc, {
        startY: finalY,
        head: [[
            'N°',
            'EP P',
            'EQUIPO DE\nEMERGENCIA',
            'UNIFO\nRME',
            'DESCRIPCIÓN DEL EQUIPO DE\nPROTECCIÓN PERSONAL /\nEQUIPO DE EMERGENCIA /\nUNIFORME',
            'TALL\nA',
            'CANTI\nDAD',
            'MOTIVO',
            'FECHA DE ENTREGA\n(dd/mm/aa)',
            'FECHA DE\nRENOVACIÓN\n(dd/mm/aa)',
            'OBSERVA\nCIÓN',
            'FIRMA'
        ]],
        body: tableBody,
        theme: 'grid',
        tableWidth: pageWidth - (margin * 2), // Ancho FULL exacto
        margin: { left: margin, right: margin },
        styles: {
            fontSize: 6,
            cellPadding: 1,
            valign: 'middle',
            halign: 'center',
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            textColor: [0, 0, 0],
            minCellHeight: 12 // Alto suficiente para la firma
        },
        headStyles: {
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            fontSize: 5
        },
        columnStyles: {
            0: { cellWidth: 5 },
            1: { cellWidth: 5 },
            2: { cellWidth: 14 },
            3: { cellWidth: 8 },
            4: { cellWidth: 'auto', halign: 'left' },
            5: { cellWidth: 6 },
            6: { cellWidth: 6 },
            7: { cellWidth: 10 },
            8: { cellWidth: 13 },
            9: { cellWidth: 13 },
            10: { cellWidth: 10 },
            11: { cellWidth: 20 }
        },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 11 && delivery.employee_signature_data) {
                try {
                    const imgData = delivery.employee_signature_data
                    if (imgData && imgData.startsWith('data:image')) {
                        const cell = data.cell
                        const dimH = cell.height - 2
                        const dimW = cell.width - 2
                        doc.addImage(imgData, 'PNG', cell.x + 1, cell.y + 1, dimW, dimH, undefined, 'FAST')
                    }
                } catch (e) {
                    console.error('Error dibujando firma empleado:', e)
                }
            }
        }
    })

    finalY = doc.lastAutoTable.finalY + 10

    // ================= RESPONSABLE =================

    if (finalY > pageHeight - 40) {
        doc.addPage()
        finalY = 20
    }

    // Tabla Responsable Unificada (Header span + datos)
    autoTable(doc, {
        startY: finalY,
        head: [
            [{ content: 'RESPONSABLE DEL REGISTRO', colSpan: 4, styles: { halign: 'left', fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.3 } }],
            ['NOMBRE Y APELLIDOS', 'CARGO', 'FECHA', 'FIRMA']
        ],
        body: [[
            delivery.responsible_name ? delivery.responsible_name.toUpperCase() : 'QUISPE ALLCCA ROLY',
            delivery.responsible_position || 'TECNICO SENIOR',
            delivery.responsible_signature_timestamp ? new Date(delivery.responsible_signature_timestamp).toLocaleString('es-PE') : new Date().toLocaleString('es-PE'),
            '' // Espacio para firma (Index 3)
        ]],
        theme: 'plain',
        tableWidth: pageWidth - (margin * 2), // Ancho FULL exacto
        margin: { left: margin, right: margin },
        styles: {
            fontSize: 7,
            cellPadding: 1.5, // Reducido para headers más compactos
            valign: 'middle',
            halign: 'left',
            lineWidth: 0.3,
            lineColor: [0, 0, 0],
            textColor: [0, 0, 0]
        },
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'left',
            lineWidth: 0.3,
            lineColor: [0, 0, 0]
        },
        bodyStyles: {
            minCellHeight: 20 // Altura asegurada SOLO para la fila de firma
        },
        columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 40 },
            2: { cellWidth: 40 },
            3: { cellWidth: 'auto' }
        },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 3 && delivery.responsible_signature_data) {
                try {
                    const imgData = delivery.responsible_signature_data
                    if (imgData && imgData.startsWith('data:image')) {
                        const cell = data.cell
                        const dimH = cell.height - 2
                        const dimW = cell.width - 4
                        doc.addImage(imgData, 'PNG', cell.x + 2, cell.y + 1, dimW, dimH, undefined, 'FAST')
                    }
                } catch (e) {
                    console.error('Error dibujando firma responsable:', e)
                }
            }
        }
    })

    // Notas legales
    finalY = doc.lastAutoTable.finalY + 5

    doc.setFontSize(5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)

    const note1 = "Nota 1: El presente formato es aplicable para temas de capacitación en SST solo en Perú."
    const note2 = "Nota 2: Al firmar este documento el personal afirma su consentimiento y autorización del uso de sus datos personales aquí expuestos, dentro del marco de protección de datos personales:"
    const note3 = "En PERÚ: Ley de Protección de Datos Personales N° 29733 y su reglamento\nEn COLOMBIA: Ley 1581 2012\nEn ECUADOR: Ley Organica de Protección de datos personales\nEn MÉXICO: Ley de protección de datos personales"

    doc.text(note1, margin, finalY)
    doc.text(note2, margin, finalY + 3)
    doc.text(note3, margin, finalY + 6)

    // ================= GUARDAR =================
    const sanitizeFileName = (str) => {
        if (!str) return 'SIN_CODIGO'
        return str.toString().replace(/[^a-zA-Z0-9-_]/g, '_')
    }
    const deliveryDocCode = sanitizeFileName(delivery.document_code || delivery.id?.substring(0, 8))
    const dniCode = sanitizeFileName(employee?.dni || 'SIN_DNI')
    const fileName = `Acta_Entrega_${deliveryDocCode}_${dniCode}.pdf`

    const pdfBlob = doc.output('blob')
    saveAs(pdfBlob, fileName)

    return doc
}

export default { generateDeliveryPDF }
