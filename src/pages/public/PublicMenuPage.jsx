import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UtensilsCrossed, Calendar, Coffee, Sun, Moon, Check, X, AlertCircle, ChevronRight, User, MapPin } from 'lucide-react'
import menuService from '@services/menuService'
import employeeService from '@services/employeeService'
import foodOrderService from '@services/foodOrderService'
import pricingService from '@services/pricingService'
import { MEAL_TYPES, MEAL_TYPE_LABELS, ORDER_TYPES, ORDER_TYPE_LABELS } from '@utils/constants'
import { formatDate } from '@utils/helpers'

const STEPS = {
    DNI_INPUT: 0,
    MENU_SELECTION: 1,
    CONFIRMATION: 2
}

const PublicMenuPage = () => {
    const [currentStep, setCurrentStep] = useState(STEPS.DNI_INPUT)
    const [dni, setDni] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Data State
    const [employee, setEmployee] = useState(null)
    const [menus, setMenus] = useState([])
    const [stationId, setStationId] = useState(null)
    const [stationName, setStationName] = useState('')
    const [pricing, setPricing] = useState(null)

    // Selection State
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]) // Today
    const [selectedMenu, setSelectedMenu] = useState(null)
    const [selectedOption, setSelectedOption] = useState('')
    const [orderType, setOrderType] = useState(ORDER_TYPES.NORMAL)
    const [discountPercent, setDiscountPercent] = useState(0)
    const [orderSuccess, setOrderSuccess] = useState(false)

    // Handlers
    const handleDniChange = async (e) => {
        const value = e.target.value.replace(/[^0-9]/g, '')
        if (value.length <= 8) {
            setDni(value)
            setError(null)

            if (value.length === 8) {
                await fetchEmployee(value)
            }
        }
    }

    const fetchEmployee = async (dniValue) => {
        setLoading(true)
        setError(null)
        try {
            const emp = await employeeService.getByDocumentNumber(dniValue)

            if (!emp) {
                setError('No se encontró un empleado activo con este DNI.')
                setLoading(false)
                return
            }

            // Validar Horario (Solo si es para "HOY", para mañana permitir? Asumimos validacion al momento de PEDIR)
            // Pero el usuario dijo "apertura y cierra de pedidos", usualmente es para el dia actual.
            // Si pido para mañana, ¿aplica horario? Supongamos que el horario es de operación del sistema.

            // Obtener hora actual en Lima
            const nowLima = new Date().toLocaleString("en-US", { timeZone: "America/Lima" })
            const dateLima = new Date(nowLima)
            const currentHour = dateLima.getHours()
            const currentMin = dateLima.getMinutes()
            const currentTimeVal = currentHour * 60 + currentMin

            // Convertir horarios de estación a minutos
            const parseTime = (timeStr) => {
                if (!timeStr) return null
                const [h, m] = timeStr.split(':').map(Number)
                return h * 60 + m
            }

            const start = parseTime(emp.station_start_time)
            const end = parseTime(emp.station_end_time)

            if (start !== null && end !== null) {
                if (currentTimeVal < start || currentTimeVal > end) {
                    setError(`El horario de pedidos es de ${emp.station_start_time.slice(0, 5)} a ${emp.station_end_time.slice(0, 5)}.`)
                    setLoading(false)
                    return
                }
            }

            setEmployee(emp)
            // En la función RPC, station_id viene directamente. 
            // Si la función retorna station_id, lo usamos.
            // Si retorna el objeto station completo, ajustamos.
            // Según RPC: retorna station_id (UUID)
            setStationId(emp.station_id)

            // Intentar obtener nombre de estación (opcional, si el frontend puede leer stations)
            // Asumimos que podemos obtener basic info o ya lo tenemos en el objeto si modificamos el RPC
            // Por ahora, solo usamos ID.

            // Cargar Menus y Precios
            await loadStationData(emp.station_id, emp.role_name)

            setCurrentStep(STEPS.MENU_SELECTION)
        } catch (err) {
            console.error(err)
            setError('Error al consultar el empleado. Intente nuevamente.')
        } finally {
            setLoading(false)
        }
    }

    const loadStationData = async (stId, roleName) => {
        try {
            // Load Menus (Today & Tomorrow)
            const today = new Date().toISOString().split('T')[0]
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

            const menusData = await menuService.getAll(stId, {
                startDate: today,
                endDate: tomorrow
            })
            setMenus(menusData)

            // Load Pricing
            try {
                const pricingData = await pricingService.getByRole(stId, roleName)
                setPricing(pricingData)
            } catch (err) {
                console.warn('No pricing found', err)
                setPricing(null)
            }
        } catch (err) {
            console.error('Error loading station data', err)
            throw err // Propagate to fetchEmployee catch
        }
    }

    const handleOrderSubmit = async () => {
        if (!selectedMenu || !selectedOption) return

        setLoading(true)
        try {
            // Calculate costs
            const employeeCost = pricing ? Number(pricing.employee_cost) : 0
            const companySubsidy = pricing ? Number(pricing.company_subsidy) : 0
            const totalCost = employeeCost + companySubsidy

            let finalEmployeeCost = employeeCost
            let finalCompanySubsidy = companySubsidy

            if (orderType === ORDER_TYPES.SPECIAL && discountPercent > 0) {
                const discountAmount = totalCost * (discountPercent / 100)
                finalEmployeeCost = Math.max(0, employeeCost - discountAmount)
            }

            const orderData = {
                station_id: stationId,
                employee_id: employee.id || employee.employee_id, // Fix: Use correct ID property
                menu_id: selectedMenu.id,
                menu_date: selectedMenu.serve_date,
                meal_type: selectedMenu.meal_type,
                selected_option: selectedOption,
                cost_applied: totalCost,
                order_type: orderType,
                discount_applied: orderType === ORDER_TYPES.SPECIAL ? discountPercent : 0,
                employee_cost_snapshot: finalEmployeeCost,
                company_subsidy_snapshot: finalCompanySubsidy,
                status: 'PENDING'
            }

            await foodOrderService.create(orderData)
            setOrderSuccess(true)
            setCurrentStep(STEPS.CONFIRMATION)
        } catch (err) {
            console.error(err)
            setError('Error al crear el pedido: ' + (err.message || 'Error desconocido'))
        } finally {
            setLoading(false)
        }
    }

    const resetFlow = () => {
        setDni('')
        setEmployee(null)
        setMenus([])
        setStationId(null)
        setCurrentStep(STEPS.DNI_INPUT)
        setOrderSuccess(false)
        setError(null)
        setSelectedMenu(null)
        setSelectedOption('')
    }

    // Render Helpers
    const getMealIcon = (type) => {
        switch (type) {
            case MEAL_TYPES.BREAKFAST: return <Coffee className="w-5 h-5" />
            case MEAL_TYPES.LUNCH: return <Sun className="w-5 h-5" />
            case MEAL_TYPES.DINNER: return <Moon className="w-5 h-5" />
            default: return <UtensilsCrossed className="w-5 h-5" />
        }
    }

    const getMealColor = (type) => {
        switch (type) {
            case MEAL_TYPES.BREAKFAST: return 'bg-orange-500'
            case MEAL_TYPES.LUNCH: return 'bg-yellow-500'
            case MEAL_TYPES.DINNER: return 'bg-purple-500'
            default: return 'bg-primary-500'
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans text-slate-800 flex flex-col items-center justify-center p-4 sm:p-6">

            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50 relative">

                {/* Header Branding */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-6 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <UtensilsCrossed className="w-24 h-24" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Gestor360°</h1>
                    <p className="text-primary-100 text-sm">Alimentación Corporativa</p>
                </div>

                <div className="p-6">
                    <AnimatePresence mode='wait'>

                        {/* STEP 0: DNI INPUT */}
                        {currentStep === STEPS.DNI_INPUT && (
                            <motion.div
                                key="step-dni"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                <div className="text-center space-y-2">
                                    <h2 className="text-xl font-semibold text-slate-800">Bienvenido</h2>
                                    <p className="text-slate-500 text-sm">Ingresa tu DNI para comenzar</p>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={8}
                                        value={dni}
                                        onChange={handleDniChange}
                                        disabled={loading}
                                        className="block w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-2xl tracking-widest text-center font-bold text-slate-800 focus:border-primary-500 focus:ring-0 transition-colors placeholder:text-slate-300"
                                        placeholder="00000000"
                                        autoFocus
                                    />
                                    {loading && (
                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                                            <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full"></div>
                                        </div>
                                    )}
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2"
                                    >
                                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <span>{error}</span>
                                    </motion.div>
                                )}

                                <p className="text-xs text-center text-slate-400">
                                    Ingresa los 8 dígitos para continuar automáticamente
                                </p>
                            </motion.div>
                        )}

                        {/* STEP 1: MENU SELECTION */}
                        {currentStep === STEPS.MENU_SELECTION && (
                            <motion.div
                                key="step-menu"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                {/* Error Display in Menu Selection */}
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2 border border-red-100"
                                    >
                                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <span>{error}</span>
                                    </motion.div>
                                )}

                                {/* User Info Bar */}
                                <div className="flex items-center justify-between bg-slate-100 rounded-xl p-3">
                                    <div className="flex items-center space-x-3 overflow-hidden">
                                        <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-sm text-primary-600 font-bold">
                                            {employee?.fullname?.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm truncate">{employee?.fullname}</p>
                                            <p className="text-xs text-slate-500 truncate">{employee?.role_name}</p>
                                        </div>
                                    </div>
                                    <button onClick={resetFlow} className="text-xs text-slate-400 hover:text-red-500 px-2">
                                        Salir
                                    </button>
                                </div>

                                {/* Date Tabs */}
                                <div className="flex gap-2 mb-4">
                                    {[
                                        { label: 'Hoy', date: new Date().toISOString().split('T')[0] },
                                        { label: 'Mañana', date: new Date(Date.now() + 86400000).toISOString().split('T')[0] }
                                    ].map((tab) => (
                                        <button
                                            key={tab.date}
                                            onClick={() => {
                                                setFilterDate(tab.date)
                                                setSelectedMenu(null)
                                            }}
                                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${filterDate === tab.date
                                                ? 'bg-primary-600 text-white shadow-md'
                                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                                                }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Menus Grid */}
                                <div className="space-y-3 h-[400px] overflow-y-auto pr-1 pb-4 scrollbar-hide">
                                    {menus.filter(m => m.serve_date === filterDate).length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                                            <UtensilsCrossed className="w-12 h-12 mb-2 opacity-50" />
                                            <p className="text-sm">No hay menús para esta fecha</p>
                                        </div>
                                    ) : (
                                        menus
                                            .filter(m => m.serve_date === filterDate)
                                            .map((menu) => (
                                                <div
                                                    key={menu.id}
                                                    onClick={() => setSelectedMenu(menu)}
                                                    className={`relative bg-white rounded-xl p-4 border transition-all cursor-pointer ${selectedMenu?.id === menu.id
                                                        ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-lg'
                                                        : 'border-slate-100 hover:border-primary-200 hover:shadow-md'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className={`px-2 py-1 rounded-md text-xs font-bold text-white uppercase tracking-wider ${getMealColor(menu.meal_type)}`}>
                                                            {MEAL_TYPE_LABELS[menu.meal_type]}
                                                        </span>
                                                        {pricing && (
                                                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                                                S/ {(Number(pricing.employee_cost) + Number(pricing.company_subsidy)).toFixed(2)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {menu.description && (
                                                        <p className="text-sm text-slate-500 mb-3">{menu.description}</p>
                                                    )}

                                                    {selectedMenu?.id === menu.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            className="mt-4 pt-3 border-t border-slate-100 space-y-3"
                                                        >
                                                            <div>
                                                                <label className="text-xs font-semibold text-slate-700 block mb-2">
                                                                    Elige tu opción:
                                                                </label>
                                                                <div className="space-y-2">
                                                                    {menu.options.map((opt, i) => (
                                                                        <label key={i} className="flex items-center space-x-3 p-2 rounded-lg border border-slate-200 has-[:checked]:bg-primary-50 has-[:checked]:border-primary-200 transition-colors cursor-pointer">
                                                                            <input
                                                                                type="radio"
                                                                                name="menuOption"
                                                                                value={opt}
                                                                                checked={selectedOption === opt}
                                                                                onChange={(e) => setSelectedOption(e.target.value)}
                                                                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                                                                            />
                                                                            <span className="text-sm text-slate-700">{opt}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleOrderSubmit()
                                                                }}
                                                                disabled={!selectedOption || loading}
                                                                className="w-full btn btn-primary py-3 rounded-lg shadow-lg shadow-primary-500/30 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:shadow-none"
                                                            >
                                                                {loading ? (
                                                                    <span className="animate-pulse">Procesando...</span>
                                                                ) : (
                                                                    <>
                                                                        <span>Enviar Pedido</span>
                                                                        <ChevronRight className="w-4 h-4" />
                                                                    </>
                                                                )}
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </div>
                                            ))
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: CONFIRMATION */}
                        {currentStep === STEPS.CONFIRMATION && (
                            <motion.div
                                key="step-confirm"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-8 space-y-6"
                            >
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 shadow-xl shadow-green-100/50">
                                    <Check className="w-10 h-10" />
                                </div>

                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">¡Pedido Enviado!</h2>
                                    <p className="text-slate-500 mt-2">
                                        Tu pedido para el {formatDate(selectedMenu?.serve_date)} ha sido registrado.
                                    </p>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl text-left text-sm space-y-2 border border-slate-100">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Opción:</span>
                                        <span className="font-medium text-slate-700">{selectedOption}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Total:</span>
                                        <span className="font-bold text-primary-600">
                                            S/ {(Number(pricing?.employee_cost) + Number(pricing?.company_subsidy)).toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        onClick={resetFlow}
                                        className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                                    >
                                        Nuevo Pedido
                                    </button>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-4 border-t border-slate-100 text-center text-xs text-slate-400">
                    <p>© 2024 Gestor360° - Todos los derechos reservados</p>
                </div>
            </div>
        </div>
    )
}

export default PublicMenuPage
