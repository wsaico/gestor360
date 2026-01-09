import { useState, useEffect } from 'react'
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
  FileSearch,
  RefreshCw
} from 'lucide-react'
import foodOrderService from '@services/foodOrderService'
import Swal from 'sweetalert2'

const ReportsPage = () => {
  const { station, user, stations, selectStation } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [activeTab, setActiveTab] = useState('discount')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [unpricedCount, setUnpricedCount] = useState(0)
  const [syncedRange, setSyncedRange] = useState({ start: '', end: '', stationId: '' })

  const isPeriodSynced = syncedRange.start === startDate &&
    syncedRange.end === endDate &&
    syncedRange.stationId === station?.id

  useEffect(() => {
    const checkUnpriced = async () => {
      if (station?.id && startDate && endDate) {
        try {
          const count = await foodOrderService.countUnpricedOrders(station.id, startDate, endDate)
          setUnpricedCount(count)
        } catch (error) {
          console.error('Error checking unpriced:', error)
          setUnpricedCount(0)
        }
      } else {
        setUnpricedCount(0)
      }
    }
    checkUnpriced()
  }, [station, startDate, endDate])

  const getWeekRange = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    }
  }

  const handleSetWeek = () => {
    const range = getWeekRange()
    setStartDate(range.start)
    setEndDate(range.end)
  }

  const validateDates = () => {
    if (!station?.id) {
      setMessage({ type: 'error', text: 'Debe seleccionar una estación en la parte superior' })
      return false
    }
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
      if (!isPeriodSynced) {
        setMessage({
          type: 'error',
          text: 'Acción bloqueada: Debe pulsar el botón "Tarifar Periodo" antes de descargar el reporte.'
        })
        setGenerating(false)
        return
      }
      const blob = await reportService.generateDiscountReport(station.id, startDate, endDate, station.name)
      reportService.downloadBlob(blob, `Descuento_Comedor_${startDate}_${endDate}.xlsx`)
      setMessage({ type: 'success', text: 'Reporte de descuento generado correctamente' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Error al generar el reporte' })
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateBillingReport = async () => {
    if (!validateDates()) return
    try {
      setGenerating(true)
      setMessage({ type: '', text: '' })
      if (!isPeriodSynced) {
        setMessage({
          type: 'error',
          text: 'Acción bloqueada: Es MANDATORIO tarifar el periodo antes de generar el reporte.'
        })
        setGenerating(false)
        return
      }
      const blob = await reportService.generateBillingReport(station.id, startDate, endDate, station.name)
      reportService.downloadBlob(blob, `Facturacion_${startDate}_${endDate}.xlsx`)
      setMessage({ type: 'success', text: 'Reporte de facturación generado correctamente' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Error al generar el reporte' })
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateAuditReport = async () => {
    if (!validateDates()) return
    try {
      setGenerating(true)
      setMessage({ type: '', text: '' })
      const blob = await reportService.generateMissingOrdersReport(station.id, startDate, endDate, station.name)
      reportService.downloadBlob(blob, `Auditoria_Faltantes_${startDate}_${endDate}.xlsx`)
      setMessage({ type: 'success', text: 'Reporte de auditoría generado correctamente' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Error al generar el reporte' })
    } finally {
      setGenerating(false)
    }
  }

  const handleSyncTariffs = async () => {
    if (!validateDates()) return

    const { isConfirmed } = await Swal.fire({
      title: '¿Sincronizar Tarifas?',
      text: '¿Desea actualizar los costos de TODOS los pedidos con las tarifas actuales? Se aplicará al rango seleccionado.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, tarifar todo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#f97316', // Color naranja primario
    })

    if (!isConfirmed) return

    try {
      setGenerating(true)
      setMessage({ type: '', text: '' })
      const result = await foodOrderService.recalculateMissingCosts(station.id, startDate, endDate)
      const count = await foodOrderService.countUnpricedOrders(station.id, startDate, endDate)
      setUnpricedCount(count)
      setSyncedRange({ start: startDate, end: endDate, stationId: station.id })
      setMessage({ type: 'success', text: `Tarifado exitoso (${result.updated} pedidos). Ya puede descargar sus reportes.` })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Error al sincronizar tarifas' })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reportes de Alimentación</h1>
        <p className="text-gray-600 mt-1">Genera reportes consolidados en Excel</p>
      </div>

      {!station && isAdmin && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-800">Estación no seleccionada</h3>
              <select onChange={(e) => selectStation(e.target.value)} className="input max-w-xs mt-2">
                <option value="">Seleccione una estación...</option>
                {stations.map(st => <option key={st.id} value={st.id}>{st.code} - {st.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Seleccionar Periodo</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Fecha Inicial</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Fecha Final</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
          </div>
          <div className="flex items-end space-x-2 lg:col-span-2">
            <button onClick={handleSetWeek} className="btn btn-secondary flex-1">Semana Actual</button>
            <button
              onClick={handleSyncTariffs}
              disabled={generating || !startDate || !endDate}
              className={`btn flex-[1.5] inline-flex items-center justify-center space-x-2 ${isPeriodSynced ? 'btn-outline border-green-500 text-green-700' : 'btn-primary pulse'}`}
            >
              {generating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div> : <RefreshCw className="w-4 h-4" />}
              <span>{isPeriodSynced ? 'Periodo Tarifado ✔' : 'Tarifar Periodo'}</span>
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`mt-4 p-3 rounded-lg flex items-start space-x-2 ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 mt-0.5" /> : <AlertCircle className="w-5 h-5 mt-0.5" />}
            <p className="text-sm">{message.text}</p>
          </div>
        )}
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'discount', label: 'Descuento Comedor', icon: Receipt },
            { id: 'billing', label: 'Facturación', icon: DollarSign },
            { id: 'audit', label: 'Auditoría (Faltantes)', icon: FileSearch }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === tab.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="card">
        {activeTab === 'discount' && (
          <div>
            <div className="flex items-start space-x-4 mb-6">
              <div className="p-3 bg-blue-100 rounded-lg"><Receipt className="w-8 h-8 text-blue-600" /></div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Reporte de Descuento Comedor</h2>
                <p className="text-sm text-gray-600">Consolidado de descuentos para planillas.</p>
              </div>
            </div>
            <button onClick={handleGenerateDiscountReport} disabled={generating || !isPeriodSynced} className={`btn btn-lg w-full md:w-auto ${!isPeriodSynced ? 'btn-disabled opacity-50' : 'btn-primary'}`}>
              <Download className="w-5 h-5 mr-2" /> Descargar Descuentos
            </button>
          </div>
        )}

        {activeTab === 'billing' && (
          <div>
            <div className="flex items-start space-x-4 mb-6">
              <div className="p-3 bg-green-100 rounded-lg"><DollarSign className="w-8 h-8 text-green-600" /></div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Reporte de Facturación</h2>
                <p className="text-sm text-gray-600">Distribución de costos (25% Empleado / 75% Empresa).</p>
              </div>
            </div>
            <button onClick={handleGenerateBillingReport} disabled={generating || !isPeriodSynced} className={`btn btn-lg w-full md:w-auto ${!isPeriodSynced ? 'btn-disabled opacity-50' : 'btn-primary'}`}>
              <Download className="w-5 h-5 mr-2" /> Descargar Facturación
            </button>
          </div>
        )}

        {activeTab === 'audit' && (
          <div>
            <div className="flex items-start space-x-4 mb-6">
              <div className="p-3 bg-red-100 rounded-lg"><FileSearch className="w-8 h-8 text-red-600" /></div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Reporte de Auditoría</h2>
                <p className="text-sm text-gray-600">Lista de empleados sin registro de pedido.</p>
              </div>
            </div>
            <button onClick={handleGenerateAuditReport} disabled={generating || !startDate || !endDate} className="btn btn-primary btn-lg w-full md:w-auto">
              <Download className="w-5 h-5 mr-2" /> Descargar Faltantes
            </button>
          </div>
        )}
      </div>

      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Nota:</p>
            <p>Es obligatorio tarifar el periodo seleccionado para asegurar que los precios coincidan con las tarifas vigentes antes de facturar.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportsPage
