import { useState, useEffect } from 'react'
import { useAuth } from '@contexts/AuthContext'
import transportService from '@services/transportService'
import systemUserService from '@services/systemUserService'
import { useNotification } from '@contexts/NotificationContext'
import { DollarSign, FileText, CheckCircle, Plus, Calendar, Edit2, Save, Filter, Search, TrendingUp, AlertTriangle, Building2, Clock, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Modal from '@components/Modal'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

const TransportSettlementsPage = () => {
    const { notify } = useNotification()
    const { user, station } = useAuth()
    const isProvider = user?.role === 'PROVIDER' || user?.role_name === 'PROVIDER'
    const [activeTab, setActiveTab] = useState('reconciliation') // 'reconciliation' | 'history'

    // Reconciliation State
    const [unbilledTrips, setUnbilledTrips] = useState([])
    const [reconFilters, setReconFilters] = useState({ provider_id: '', date_start: '', date_end: '' })
    const [editingTrip, setEditingTrip] = useState(null) // { id, cost }

    // Settlements State
    const [settlements, setSettlements] = useState([])
    const [showModal, setShowModal] = useState(false)

    // Effect to auto-fill modal if provider
    useEffect(() => {
        if (isProvider && user?.id) {
            setGenFormData(prev => ({ ...prev, provider_id: user.id }))
        }
    }, [isProvider, user])

    // Shared Data
    const [providers, setProviders] = useState([])
    const [loading, setLoading] = useState(false)

    // Generate Modal State
    const [genFormData, setGenFormData] = useState({
        provider_id: '',
        date_start: '',
        date_end: ''
    })

    useEffect(() => {
        loadInitialData()
    }, [])

    useEffect(() => {
        if (activeTab === 'reconciliation') loadUnbilled()
        else loadSettlements()
    }, [activeTab, reconFilters])

    const loadInitialData = async () => {
        const users = await systemUserService.getAll()
        setProviders(users.filter(u => u.role === 'PROVIDER' || u.role_name === 'PROVIDER'))
    }

    const loadUnbilled = async () => {
        setLoading(true)
        try {
            const data = await transportService.getUnbilledTrips({
                providerId: isProvider ? user.id : reconFilters.provider_id,
                dateFrom: reconFilters.date_start,
                dateTo: reconFilters.date_end,
                stationId: station?.id
            })
            setUnbilledTrips(data)
        } finally { setLoading(false) }
    }

    const loadSettlements = async () => {
        setLoading(true)
        try {
            const data = await transportService.getSettlements({
                providerId: isProvider ? user.id : undefined
            })
            setSettlements(data)
        } finally { setLoading(false) }
    }

    const handleUpdateCost = async (id, newCost) => {
        if (isProvider) {
            notify.error("No tiene permisos para editar costos")
            return
        }
        try {
            await transportService.updateScheduleCost(id, newCost)
            setEditingTrip(null)
            loadUnbilled()
            notify.success("Costo actualizado")
        } catch (error) {
            notify.error("Error al actualizar costo")
        }
    }

    const handleGenerate = async (e) => {
        e.preventDefault()
        try {
            const result = await transportService.generateSettlement(
                genFormData.provider_id,
                genFormData.date_start,
                genFormData.date_end
            )

            if (result.count === 0) {
                notify.warning("No hay viajes pendientes de liquidar para este rango.")
            } else {
                notify.success(`Liquidación Generada por S/. ${result.total_amount}`)
                setShowModal(false)
                loadSettlements()
                setActiveTab('history')
            }
        } catch (error) {
            notify.error("Error al generar liquidación")
        }
    }

    const handleDownloadPDF = async (settlement) => {
        try {
            // Fetch Details
            setLoading(true)
            const trips = await transportService.getSettlementDetails(settlement.id)
            setLoading(false)

            const doc = new jsPDF()

            // --- HEADER ---
            // Corporate Blue Background
            doc.setFillColor(30, 41, 59) // Slate 800
            doc.rect(0, 0, 210, 45, 'F')

            // Title
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(24)
            doc.setFont('helvetica', 'bold')
            doc.text("ESTADO DE CUENTA DE SERVICIOS", 105, 22, { align: 'center' })

            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.text(`LIQUIDACIÓN QUINCENAL # ${settlement.id.substring(0, 8).toUpperCase()}`, 105, 32, { align: 'center' })

            // --- INFO GRID ---
            const startY = 55

            // Left Column (Provider Info)
            doc.setTextColor(30, 41, 59)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.text("PROVEEDOR:", 14, startY)
            doc.setFont('helvetica', 'normal')
            doc.text(settlement.provider?.username || '---', 14, startY + 6)

            doc.setFont('helvetica', 'bold')
            doc.text("PERIODO:", 14, startY + 14)
            doc.setFont('helvetica', 'normal')
            doc.text(`${format(new Date(settlement.period_start), 'dd/MM/yyyy')} al ${format(new Date(settlement.period_end), 'dd/MM/yyyy')}`, 14, startY + 20)

            // Right Column (Totals)
            doc.setFont('helvetica', 'bold')
            doc.text("RESUMEN:", 140, startY)

            doc.setFillColor(241, 245, 249) // Slate 100
            doc.rect(140, startY + 3, 56, 24, 'F')

            doc.setFontSize(14)
            doc.setTextColor(22, 163, 74) // Green
            doc.text(`S/. ${Number(settlement.total_amount).toFixed(2)}`, 192, startY + 14, { align: 'right' })

            doc.setFontSize(9)
            doc.setTextColor(100, 116, 139)
            doc.text(`${settlement.total_trips} Servicios realizados`, 192, startY + 22, { align: 'right' })

            // --- TABLE ---
            const tableColumn = ["Fecha", "Hora", "Ruta / Cliente", "Conductor", "Placa", "Costo (S/.)"]
            const tableRows = trips.map(trip => [
                trip.scheduled_date,
                trip.departure_time,
                `${trip.route?.name || '-'} \n ${trip.route?.organization?.name || '-'}`,
                `${trip.driver?.first_name || ''} ${trip.driver?.last_name || ''}`,
                trip.vehicle?.plate_number || '-',
                `S/. ${Number(trip.cost).toFixed(2)}`
            ])

            autoTable(doc, {
                startY: 90,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                headStyles: {
                    fillColor: [30, 41, 59],
                    textColor: [255, 255, 255],
                    fontSize: 10,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                bodyStyles: {
                    fontSize: 9,
                    cellPadding: 3,
                    valign: 'middle'
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 25 },
                    1: { halign: 'center', cellWidth: 20 },
                    2: { cellWidth: 60 },
                    3: { cellWidth: 40 },
                    4: { halign: 'center', cellWidth: 25 },
                    5: { halign: 'right', cellWidth: 20, fontStyle: 'bold' }
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252]
                },
                margin: { top: 10 }
            })

            // --- FOOTER ---
            const finalY = doc.lastAutoTable.finalY + 20

            doc.setFontSize(8)
            doc.setTextColor(150, 150, 150)
            doc.text("Certifico que los servicios detallados han sido completados a satisfacción.", 14, finalY)
            doc.text("Este documento sirve como sustento para la facturación correspondiente.", 14, finalY + 5)
            doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`, 14, finalY + 12)

            doc.save(`EstadoCuenta_${settlement.provider?.username?.replace(/\s+/g, '')}_${settlement.period_end}.pdf`)
        } catch (error) {
            console.error(error)
            notify.error("Error al descargar el PDF detallado")
            setLoading(false)
        }
    }

    // Stats Logic
    const pendingTotal = unbilledTrips.reduce((acc, trip) => acc + (trip.cost || 0), 0)
    const paidTotal = settlements.filter(s => s.status === 'PAID').reduce((acc, s) => acc + (s.total_amount || 0), 0)

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                        <div className="bg-green-100 p-2 rounded-lg"><DollarSign className="text-green-600 w-8 h-8" /></div>
                        Facturación y Conciliación
                    </h1>
                    <p className="text-gray-500 mt-1 ml-14">Gestiona los pagos a proveedores y concilia servicios ejecutados.</p>
                </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-6 shadow-sm rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">Pendiente de Liquidar</span>
                        <AlertTriangle className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-gray-800">S/. {pendingTotal.toFixed(2)}</div>
                    <div className="text-xs text-blue-400 mt-1">{unbilledTrips.length} servicios pendientes</div>
                </div>

                <div className="card bg-gradient-to-br from-green-50 to-white border border-green-100 p-6 shadow-sm rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-green-600 uppercase tracking-wider">Total Histórico</span>
                        <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-gray-800">S/. {paidTotal.toFixed(2)}</div>
                    <div className="text-xs text-green-400 mt-1">Acumulado pagado</div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700 inline-flex shadow-sm">
                <button
                    onClick={() => setActiveTab('reconciliation')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
                        ${activeTab === 'reconciliation' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <CheckCircle className="w-4 h-4" /> Conciliación (Pendientes)
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
                        ${activeTab === 'history' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <FileText className="w-4 h-4" /> Historial Cierres
                </button>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'reconciliation' && (
                    <motion.div
                        key="recon"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                    >
                        {/* Filters Bar */}
                        <div className="flex flex-wrap gap-4 items-end bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="form-control w-full sm:w-auto min-w-[200px]">
                                <label className="label-text text-xs font-bold text-gray-500 uppercase mb-1">Proveedor</label>
                                {isProvider ? (
                                    <input type="text" className="input input-sm input-bordered w-full bg-gray-100" value={user.username || 'Mi Empresa'} disabled />
                                ) : (
                                    <select className="select select-sm select-bordered w-full"
                                        value={reconFilters.provider_id} onChange={e => setReconFilters({ ...reconFilters, provider_id: e.target.value })}>
                                        <option value="">Todos los Proveedores</option>
                                        {providers.map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
                                    </select>
                                )}
                            </div>
                            <div className="form-control">
                                <label className="label-text text-xs font-bold text-gray-500 uppercase mb-1">Desde</label>
                                <input type="date" className="input input-sm input-bordered"
                                    value={reconFilters.date_start} onChange={e => setReconFilters({ ...reconFilters, date_start: e.target.value })} />
                            </div>
                            <div className="form-control">
                                <label className="label-text text-xs font-bold text-gray-500 uppercase mb-1">Hasta</label>
                                <input type="date" className="input input-sm input-bordered"
                                    value={reconFilters.date_end} onChange={e => setReconFilters({ ...reconFilters, date_end: e.target.value })} />
                            </div>
                            <button className="btn btn-sm btn-ghost hover:bg-gray-100" onClick={loadUnbilled}><Filter className="w-4 h-4 text-gray-500" /></button>
                        </div>

                        {/* Table */}
                        <div className="overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <table className="table w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="font-bold text-gray-500 uppercase text-xs tracking-wider">Fecha / Hora</th>
                                        <th className="font-bold text-gray-500 uppercase text-xs tracking-wider">Validación</th>
                                        <th className="font-bold text-gray-500 uppercase text-xs tracking-wider">Cliente / Ruta</th>
                                        <th className="font-bold text-gray-500 uppercase text-xs tracking-wider">Detalles Proveedor</th>
                                        <th className="font-bold text-gray-500 uppercase text-xs tracking-wider text-right px-8">Costo (S/.)</th>
                                        <th className="font-bold text-gray-500 uppercase text-xs tracking-wider text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {unbilledTrips.map(trip => (
                                        <tr key={trip.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                            <td>
                                                <div className="font-bold text-gray-900 dark:text-gray-200">{trip.scheduled_date}</div>
                                                <div className="text-xs text-gray-400 font-mono">{trip.departure_time}</div>
                                            </td>
                                            {/* Validation Status */}
                                            <td>
                                                {trip.is_provider_validated ? (
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        <span className="text-xs font-bold uppercase">Conforme</span>
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400">
                                                        <Clock className="w-4 h-4" />
                                                        <span className="text-xs font-medium uppercase">Pendiente</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Route & Client */}
                                            <td>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-primary-600 uppercase flex items-center gap-1 mb-0.5">
                                                        <Building2 className="w-3 h-3" />
                                                        {trip.route?.organization?.name || 'ORG'}
                                                    </span>
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {trip.route?.name || 'Sin Ruta'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="badge badge-sm badge-ghost">{trip.provider?.username}</div>
                                                </div>
                                                <div className="text-xs text-gray-500">{trip.driver?.first_name} {trip.driver?.last_name}</div>
                                                <div className="text-xs text-gray-400 font-mono">{trip.vehicle?.plate_number}</div>
                                            </td>
                                            <td className="text-right px-8">
                                                {editingTrip === trip.id ? (
                                                    <input
                                                        autoFocus
                                                        type="number"
                                                        className="input input-sm input-primary w-24 text-right font-bold"
                                                        defaultValue={trip.cost}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleUpdateCost(trip.id, e.target.value)
                                                            if (e.key === 'Escape') setEditingTrip(null)
                                                        }}
                                                        onBlur={(e) => handleUpdateCost(trip.id, e.target.value)}
                                                    />
                                                ) : (
                                                    <span className="font-mono font-bold text-gray-900 group-hover:text-primary-600 transition-colors text-lg">
                                                        S/. {Number(trip.cost).toFixed(2)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                {!isProvider && (
                                                    <button className="btn btn-ghost btn-sm btn-square text-gray-400 hover:text-blue-500" onClick={() => setEditingTrip(trip.id)}>
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {unbilledTrips.length === 0 && (
                                        <tr><td colSpan="5" className="text-center py-12 text-gray-400">
                                            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-100" />
                                            Todo conciliado. No hay viajes pendientes.
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {/* Tab: History */}
                {activeTab === 'history' && (
                    <motion.div
                        key="history"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="flex justify-end mb-6">
                            <button onClick={() => setShowModal(true)} className="btn btn-primary shadow-lg shadow-primary-500/30 gap-2 px-6">
                                <Plus className="w-4 h-4" /> Generar Cierre Quincenal
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {settlements.map(settlement => (
                                <motion.div
                                    whileHover={{ y: -5 }}
                                    key={settlement.id}
                                    className="card bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 overflow-hidden"
                                >
                                    <div className="h-2 bg-green-500 w-full" />
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{settlement.provider?.username || 'Proveedor'}</h3>
                                                <span className="text-xs text-gray-400 uppercase tracking-wider">Cierre # {settlement.id.substring(0, 8)}</span>
                                            </div>
                                            <span className="badge badge-success text-white font-bold shadow-sm">{settlement.status}</span>
                                        </div>

                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg space-y-3 mb-6">
                                            <div className="flex flex-col gap-1 text-sm"> {/* Changed to flex-col for better space management */}
                                                <span className="text-gray-500 flex items-center gap-2 font-bold"><Calendar className="w-4 h-4" /> Periodo</span>
                                                <span className="font-medium text-gray-800 dark:text-gray-200 pl-6">{settlement.period_start} / {settlement.period_end}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm border-t border-gray-200 dark:border-gray-600 pt-2">
                                                <span className="text-gray-500 flex items-center gap-2"><FileText className="w-4 h-4" /> Total Viajes</span>
                                                <span className="font-medium text-gray-800 dark:text-gray-200">{settlement.total_trips}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total a Pagar</p>
                                                <p className="text-2xl font-bold text-green-600">S/. {settlement.total_amount}</p>
                                            </div>
                                            <button
                                                onClick={() => handleDownloadPDF(settlement)}
                                                className="btn btn-circle btn-ghost hover:bg-green-50 text-green-600 tooltip tooltip-left"
                                                data-tip="Descargar Resumen PDF"
                                            >
                                                <FileText className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {settlements.length === 0 && (
                                <div className="text-center py-20 text-gray-400 col-span-full">No hay cierres generados en el historial.</div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal Generator */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Generar Cierre de Quincena">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex gap-3 border border-blue-100 dark:border-blue-800">
                    <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <p>
                        Esta acción agrupará todos los viajes <strong>COMPLETADOS</strong> y <strong>CONCILIADOS</strong> en el rango de fechas seleccionado.
                        Se generará una cuenta de cobro final inmutable.
                    </p>
                </div>
                <form onSubmit={handleGenerate} className="space-y-4">
                    <div className="form-control">
                        <label className="label-text font-bold mb-1">Proveedor de Transporte</label>
                        {isProvider ? (
                            <input
                                type="text"
                                className="input input-bordered w-full bg-gray-100 dark:bg-gray-700 text-gray-500"
                                value={user?.username || 'Mi Empresa'}
                                disabled
                            />
                        ) : (
                            <select className="select select-bordered w-full"
                                required
                                value={genFormData.provider_id}
                                onChange={e => setGenFormData({ ...genFormData, provider_id: e.target.value })}
                            >
                                <option value="">Seleccione un proveedor...</option>
                                {providers.map(p => (
                                    <option key={p.id} value={p.id}>{p.username}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-control">
                            <label className="label-text font-bold mb-1">Fecha Inicio</label>
                            <input type="date" required className="input input-bordered w-full"
                                value={genFormData.date_start}
                                onChange={e => setGenFormData({ ...genFormData, date_start: e.target.value })}
                            />
                        </div>
                        <div className="form-control">
                            <label className="label-text font-bold mb-1">Fecha Fin</label>
                            <input type="date" required className="input input-bordered w-full"
                                value={genFormData.date_end}
                                onChange={e => setGenFormData({ ...genFormData, date_end: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="modal-action pt-4">
                        <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
                        <button type="submit" className="btn btn-primary px-8">Generar Cierre</button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

export default TransportSettlementsPage
