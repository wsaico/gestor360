import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Service to generate Transport Module Reports
 */
class TransportReportService {

    /**
     * Generates a Daily Settlement Report for Transport
     * @param {Array} schedules - List of completed schedules with execution data
     * @param {Object} station - Station info
     * @param {Date} date - Report date
     */
    generateDailyReport(schedules, station, date) {
        const doc = new jsPDF()
        const dateStr = format(new Date(date), 'dd/MM/yyyy', { locale: es })

        // 1. HEADER
        doc.setFontSize(18)
        doc.text('REPORTE DE MOVILIDAD', 14, 20)

        doc.setFontSize(10)
        doc.text(`Sede: ${station?.name || 'General'}`, 14, 28)
        doc.text(`Fecha: ${dateStr}`, 14, 33)
        doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 38)

        // 2. SUMMARY STATS
        const totalTrips = schedules.length
        const totalCost = schedules.reduce((sum, s) => sum + (s.execution?.final_cost || 0), 0)
        const totalPax = schedules.reduce((sum, s) => sum + (s.execution?.check_ins?.length || 0), 0)

        // Draw Summary Box
        doc.setDrawColor(200)
        doc.setFillColor(245, 247, 250)
        doc.rect(14, 45, 180, 25, 'F')

        doc.setFontSize(10)
        doc.setTextColor(100)
        doc.text('Total Viajes', 20, 52)
        doc.text('Pasajeros Transportados', 80, 52)
        doc.text('Costo Total', 150, 52)

        doc.setFontSize(14)
        doc.setTextColor(0)
        doc.text(totalTrips.toString(), 20, 62)
        doc.text(totalPax.toString(), 80, 62)
        doc.text(`S/. ${totalCost.toFixed(2)}`, 150, 62)

        // 3. TABLE DATA PREPARATION
        const tableBody = schedules.map(s => {
            const exec = s.execution || {}
            const route = s.route || {}
            const provider = s.provider || {}
            const org = route.organization || {}

            const timeStart = exec.start_time ? format(new Date(exec.start_time), 'HH:mm') : '-'
            const timeEnd = exec.end_time ? format(new Date(exec.end_time), 'HH:mm') : '-'
            const paxCount = exec.check_ins ? exec.check_ins.length : 0
            const cost = exec.final_cost ? `S/. ${Number(exec.final_cost).toFixed(2)}` : 'S/. 0.00'
            const statusLabel = s.status === 'COMPLETED' ? 'Completado' : s.status

            return [
                timeStart,
                route.name || '-',
                provider.username || 'Sin Conductor',
                org.name || '-',
                paxCount,
                statusLabel,
                cost
            ]
        })

        // 4. DRAW TABLE
        doc.autoTable({
            startY: 80,
            head: [['Hora', 'Ruta', 'Conductor', 'Cliente/Org', 'Pax', 'Estado', 'Costo']],
            body: tableBody,
            theme: 'grid',
            headStyles: {
                fillColor: [41, 128, 185], // Primary Blue
                textColor: 255,
                fontSize: 9,
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 8,
                cellPadding: 3
            },
            columnStyles: {
                0: { cellWidth: 15 }, // Hora
                4: { halign: 'center' }, // Pax
                6: { halign: 'right', fontStyle: 'bold' } // Costo
            },
            foot: [['', '', '', 'TOTAL', totalPax, '', `S/. ${totalCost.toFixed(2)}`]],
            footStyles: {
                fillColor: [240, 240, 240],
                textColor: 0,
                fontStyle: 'bold',
                halign: 'right'
            }
        })

        // 5. FOOTER
        const pageCount = doc.internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(8)
            doc.setTextColor(150)
            doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: 'right' })
            doc.text('Gestor360° Enterprise', 14, doc.internal.pageSize.height - 10)
        }

        // 6. SAVE
        doc.save(`reporte_movilidad_${dateStr.replace(/\//g, '-')}.pdf`)
    }
}

export default new TransportReportService()
