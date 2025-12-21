import { useState } from 'react'
import { useAuth } from '@contexts/AuthContext'
import reportService from '@services/reportService'
import {
  FileText,
  Download,
  Calendar,
  DollarSign,
  Receipt,
  FileSpreadsheet,

  AlertCircle,
  CheckCircle2,
  FileSearch
} from 'lucide-react'

/**
 * Página de reportes de alimentación
 * - Reporte de Descuento Comedor (consolidado)
 * - Reporte de Facturación (3 pestañas: 25% Empleado, 75% Empresa, Resumen)
 * Accesible para ADMIN y SUPERVISOR
 */
const ReportsPage = () => {
  const { station } = useAuth()

  const [activeTab, setActiveTab] = useState('discount')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Quick date helpers
  const getWeekRange = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust for Monday start
    const monday = new Date(today.setDate(diff))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    }
  }

  const getMonthRange = () => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0]
    }
  }

  const handleSetWeek = () => {
    const range = getWeekRange()
    setStartDate(range.start)
    setEndDate(range.end)
  }

  const handleSetMonth = () => {
    const range = getMonthRange()
    setStartDate(range.start)
    setEndDate(range.end)
  }

  const validateDates = () => {
    if (!startDate || !endDate) {
      setMessage({ type: 'error', text: 'Debe seleccionar el rango de fechas' })
      return false
    }

    if (new Date(startDate) > new Date(endDate)) {
      setMessage({ type: 'error', text: 'La fecha inicial debe ser anterior a la fecha final' })
      return false
    }

    return true
  }

  const handleGenerateDiscountReport = async () => {
    if (!validateDates()) return

    try {
      setGenerating(true)
      setMessage({ type: '', text: '' })

      const blob = await reportService.generateDiscountReport(
        station.id,
        startDate,
        endDate,
        station.name
      )

      const filename = `Descuento_Comedor_${startDate}_${endDate}.xlsx`
      reportService.downloadBlob(blob, filename)

      setMessage({
        type: 'success',
        text: 'Reporte de descuento generado correctamente'
      })
    } catch (error) {
      console.error('Error generating discount report:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Error al generar el reporte de descuento'
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateBillingReport = async () => {
    if (!validateDates()) return

    try {
      setGenerating(true)
      setMessage({ type: '', text: '' })

      const blob = await reportService.generateBillingReport(
        station.id,
        startDate,
        endDate,
        station.name
      )

      const filename = `Facturacion_${startDate}_${endDate}.xlsx`
      reportService.downloadBlob(blob, filename)

      setMessage({
        type: 'success',
        text: 'Reporte de facturación generado correctamente'
      })
    } catch (error) {
      console.error('Error generating billing report:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Error al generar el reporte de facturación'
      })
    } finally {
      setGenerating(false)
    }

  }

  const handleGenerateAuditReport = async () => {
    if (!validateDates()) return

    try {
      setGenerating(true)
      setMessage({ type: '', text: '' })

      const blob = await reportService.generateMissingOrdersReport(
        station.id,
        startDate,
        endDate,
        station.name
      )

      const filename = `Auditoria_Faltantes_${startDate}_${endDate}.xlsx`
      reportService.downloadBlob(blob, filename)

      setMessage({
        type: 'success',
        text: 'Reporte de auditoría generado correctamente'
      })
    } catch (error) {
      console.error('Error generating audit report:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Error al generar el reporte de auditoría'
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reportes de Alimentación</h1>
        <p className="text-gray-600 mt-1">
          Genera reportes consolidados en Excel
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Seleccionar Periodo</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="startDate" className="label">
              Fecha Inicial <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="label">
              Fecha Final <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSetWeek}
              className="btn btn-secondary btn-md w-full"
            >
              Esta Semana
            </button>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSetMonth}
              className="btn btn-secondary btn-md w-full"
            >
              Este Mes
            </button>
          </div>
        </div>

        {message.text && (
          <div
            className={`mt-4 p-3 rounded-lg flex items-start space-x-2 ${message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
              }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            )}
            <p
              className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}
            >
              {message.text}
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('discount')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'discount'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center space-x-2">
              <Receipt className="w-5 h-5" />
              <span>Descuento Comedor</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('billing')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'billing'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>Facturación</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'audit'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center space-x-2">
              <FileSearch className="w-5 h-5" />
              <span>Auditoría (Faltantes)</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {
        activeTab === 'discount' && (
          <div className="card">
            <div className="flex items-start space-x-4 mb-6">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Receipt className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Reporte de Descuento Comedor
                </h2>
                <p className="text-sm text-gray-600">
                  Genera un reporte consolidado con los descuentos aplicados a cada empleado
                  en el periodo seleccionado. El reporte incluye:
                </p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5"></div>
                    <span>Información del empleado (DNI, Nombre, Área, Cargo)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5"></div>
                    <span>Descuentos diarios por fecha</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5"></div>
                    <span>Total de descuentos por empleado</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex items-start space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-gray-600 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1">Formato del archivo:</p>
                  <p>Excel (.xlsx) con una pestaña que contiene el consolidado por empleado</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateDiscountReport}
              disabled={generating || !startDate || !endDate}
              className="btn btn-primary btn-lg w-full md:w-auto inline-flex items-center justify-center space-x-2"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Generando...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Descargar Reporte de Descuentos</span>
                </>
              )}
            </button>
          </div>
        )
      }

      {
        activeTab === 'billing' && (
          <div className="card">
            <div className="flex items-start space-x-4 mb-6">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Reporte de Facturación
                </h2>
                <p className="text-sm text-gray-600">
                  Genera un reporte con 3 pestañas mostrando la distribución de costos entre
                  empleados y la empresa:
                </p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5"></div>
                    <span><strong>Pestaña 1:</strong> 25% - Aporte de Empleados</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5"></div>
                    <span><strong>Pestaña 2:</strong> 75% - Subsidio de la Empresa</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5"></div>
                    <span><strong>Pestaña 3:</strong> Resumen Total con IGV (18%)</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex items-start space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-gray-600 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1">Formato del archivo:</p>
                  <p>
                    Excel (.xlsx) con 3 pestañas: "25% Empleado", "75% Empresa" y "Resumen".
                    El resumen incluye el desglose con IGV y la distribución entre boletas y facturas.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Nota Importante</p>
                  <p className="mt-1">
                    El resumen incluye IGV (18%) y distribuye los montos en 50% con boleta y 50% con factura.
                    La factura incluye el desglose de subtotal + IGV.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateBillingReport}
              disabled={generating || !startDate || !endDate}
              className="btn btn-primary btn-lg w-full md:w-auto inline-flex items-center justify-center space-x-2"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Generando...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Descargar Reporte de Facturación</span>
                </>
              )}
            </button>
          </div>
        )
      }

      {
        activeTab === 'audit' && (
          <div className="card">
            <div className="flex items-start space-x-4 mb-6">
              <div className="p-3 bg-red-100 rounded-lg">
                <FileSearch className="w-8 h-8 text-red-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Reporte de Auditoría (Faltantes)
                </h2>
                <p className="text-sm text-gray-600">
                  Genera un reporte listando a los empleados activos que <strong>NO registraron pedido</strong> en las fechas seleccionadas.
                  Ideal para conciliaciones y control de asistencia al comedor.
                </p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5"></div>
                    <span>Lista detallada por fecha y empleado</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5"></div>
                    <span>Excluye empleados cesados</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex items-start space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-gray-600 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1">Formato del archivo:</p>
                  <p>Excel (.xlsx) con una lista plana de incidencias (Fecha, DNI, Nombre).</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateAuditReport}
              disabled={generating || !startDate || !endDate}
              className="btn btn-primary btn-lg w-full md:w-auto inline-flex items-center justify-center space-x-2"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Generando...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Descargar Reporte de Faltantes</span>
                </>
              )}
            </button>
          </div>
        )
      }

      {/* Info Card */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">Información sobre los reportes</p>
            <ul className="space-y-1">
              <li>• Los reportes incluyen pedidos pendientes, confirmados y servidos</li>
              <li>• Los montos se calculan usando los snapshots guardados al momento del pedido</li>
              <li>• Los datos se agrupan por empleado y fecha</li>
              <li>• Puedes abrir los archivos con Microsoft Excel, Google Sheets o LibreOffice</li>
            </ul>
          </div>
        </div>
      </div>
    </div >
  )
}

export default ReportsPage
