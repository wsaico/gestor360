import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    UtensilsCrossed, Coffee, Sun, Moon, Check, AlertCircle,
    ChevronRight, User, MapPin, CheckCircle2,
    ArrowRight, MessageSquare, Clock, Utensils, AlertTriangle, History, X, Filter, ShoppingBag
} from 'lucide-react'
import menuService from '@services/menuService'
import employeeService from '@services/employeeService'
import foodOrderService from '@services/foodOrderService'
import pricingService from '@services/pricingService'
import stationService from '@services/stationService' // Added station service
import AnnouncementModal from '../../components/AnnouncementModal' // Import Modal
import ConfirmDialog from '../../components/ConfirmDialog' // Import Confirm Dialog
import { announcementService } from '../../services/announcementService' // Import Service
import { MEAL_TYPES, MEAL_TYPE_LABELS, ORDER_TYPES, DINING_OPTIONS, DINING_OPTION_LABELS } from '@utils/constants'
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
    const [systemClosed, setSystemClosed] = useState({ isOpen: true, start: '', end: '', contact: '' }) // System Availability State

    // Data State
    const [employee, setEmployee] = useState(null)
    const [validationError, setValidationError] = useState(null) // Validation error for granular selection
    // Announcements State
    const [announcements, setAnnouncements] = useState([])
    const [showAnnouncements, setShowAnnouncements] = useState(false)

    // History State
    const [showHistory, setShowHistory] = useState(false)
    const [historyOrders, setHistoryOrders] = useState([])
    const [historyFilter, setHistoryFilter] = useState('payroll_period') // 'payroll_period' | 'custom' | 'last_50'
    const [customStartDate, setCustomStartDate] = useState('')
    const [customEndDate, setCustomEndDate] = useState('')
    const [showFilters, setShowFilters] = useState(false) // Collapsible filters

    // Confirmation Dialog State
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [confirmDialogData, setConfirmDialogData] = useState({ dateText: '', mealTypeText: '', selectedOptions: '' })

    const [station, setStation] = useState(null) // Separate station state
    const [menus, setMenus] = useState([])
    const [existingOrder, setExistingOrder] = useState(null) // Check if already ordered
    const [pricing, setPricing] = useState(null)

    // Auto Open History feature
    const [autoOpenHistory, setAutoOpenHistory] = useState(false)

    useEffect(() => {
        if (currentStep === STEPS.MENU_SELECTION && autoOpenHistory && employee) {
            // Use timeout to ensure render
            setTimeout(() => {
                loadHistory()
                setAutoOpenHistory(false)
            }, 500)
        }
    }, [currentStep, autoOpenHistory, employee])

    // Reload history when filter changes
    useEffect(() => {
        if (showHistory && employee) {
            loadHistory()
        }
    }, [historyFilter, customStartDate, customEndDate])

    // Selection State
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]) // Today
    const [selectedMenu, setSelectedMenu] = useState(null)
    const [selections, setSelections] = useState({})
    const [suggestions, setSuggestions] = useState('')

    const [orderType] = useState(ORDER_TYPES.NORMAL)
    const [discountPercent] = useState(0)
    const [orderSuccess, setOrderSuccess] = useState(false)
    const [diningOption, setDiningOption] = useState(null) // Dining option state - null until user selects
    const [showSuggestions, setShowSuggestions] = useState(false) // Collapsible suggestions

    // Auto-select tomorrow if no menus for today (intelligent fallback)
    useEffect(() => {
        if (menus.length > 0 && filterDate === new Date().toISOString().split('T')[0]) {
            const todayMenus = menus.filter(m => m.serve_date === filterDate)
            if (todayMenus.length === 0) {
                // No menus for today, check if there are menus for tomorrow
                const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
                const tomorrowMenus = menus.filter(m => m.serve_date === tomorrow)
                if (tomorrowMenus.length > 0) {
                    console.log('No menus for today, auto-selecting tomorrow')
                    setFilterDate(tomorrow)
                }
            }
        }
    }, [menus, filterDate])

    // Helpers
    const getMealColor = (type) => {
        switch (type) {
            case MEAL_TYPES.BREAKFAST: return 'bg-orange-500'
            case MEAL_TYPES.LUNCH: return 'bg-yellow-500'
            case MEAL_TYPES.DINNER: return 'bg-purple-600'
            default: return 'bg-primary-600'
        }
    }

    const getMealIcon = (type) => {
        switch (type) {
            case MEAL_TYPES.BREAKFAST: return <Coffee className="w-4 h-4" />
            case MEAL_TYPES.LUNCH: return <Sun className="w-4 h-4" />
            case MEAL_TYPES.DINNER: return <Moon className="w-4 h-4" />
            default: return <UtensilsCrossed className="w-4 h-4" />
        }
    }

    const getPayrollPeriod = () => {
        const today = new Date()
        const currentDay = today.getDate()

        let startDate, endDate

        if (currentDay >= 16) {
            // Segunda quincena: del 16 de este mes al 15 del próximo
            startDate = new Date(today.getFullYear(), today.getMonth(), 16)
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 15)
        } else {
            // Primera quincena: del 16 del mes pasado al 15 de este mes
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 16)
            endDate = new Date(today.getFullYear(), today.getMonth(), 15)
        }

        return {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
            label: `${startDate.getDate()}/${startDate.toLocaleString('es', { month: 'short' })} - ${endDate.getDate()}/${endDate.toLocaleString('es', { month: 'short' })}`
        }
    }

    const getDynamicDateText = (dateString) => {
        const today = new Date().toISOString().split('T')[0]
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

        if (dateString === today) return 'hoy'
        if (dateString === tomorrow) return 'mañana'

        // Return formatted date
        const date = new Date(dateString + 'T00:00:00')
        return date.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        })
    }

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

            // Fetch Station Details Explicitly to get the Name
            let stationData = null
            if (emp.station_id) {
                stationData = await stationService.getById(emp.station_id)
                setStation(stationData)
            }

            // Validar Horario Station
            const nowLima = new Date().toLocaleString("en-US", { timeZone: "America/Lima" })
            const dateLima = new Date(nowLima)
            const currentHour = dateLima.getHours()
            const currentMin = dateLima.getMinutes()
            const currentTimeVal = currentHour * 60 + currentMin

            const parseTime = (timeStr) => {
                if (!timeStr) return null
                const [h, m] = timeStr.split(':').map(Number)
                return h * 60 + m
            }

            // Use station data for times if available, otherwise employee fields (which might be from view/rpc)
            // employee object from RPC usually has station_start_time if joined, but let's prefer stationData if fetched
            const startTimeStr = stationData?.order_start_time || emp.station_start_time
            const endTimeStr = stationData?.order_end_time || emp.station_end_time

            const start = parseTime(startTimeStr)
            const end = parseTime(endTimeStr)

            if (start !== null && end !== null) {
                if (currentTimeVal < start || currentTimeVal > end) {
                    // setError(`⚠️ El horario de pedidos es de ${startTimeStr?.slice(0, 5)} a ${endTimeStr?.slice(0, 5)}.`)
                    setSystemClosed({
                        isOpen: false,
                        start: startTimeStr?.slice(0, 5),
                        end: endTimeStr?.slice(0, 5),
                        contact: 'Contacto del Proveedor (999-999-999)' // Should come from station config in DB
                    })
                    setLoading(false)
                    return
                }
            }

            setEmployee(emp)
            await loadStationData(emp.station_id, emp.role_name, emp.id)
            setCurrentStep(STEPS.MENU_SELECTION)
        } catch (err) {
            console.error(err)
            setError('Error al consultar el empleado. Intente nuevamente.')
        } finally {
            setLoading(false)
        }
    }

    const loadStationData = async (stId, roleName, empId) => {
        try {
            const today = new Date().toISOString().split('T')[0]
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

            // 1. Fetch Menus
            const menusData = await menuService.getAll(stId, {
                startDate: today,
                endDate: tomorrow
            })
            setMenus(menusData)

            // 2. Fetch Pricing
            try {
                const pricingData = await pricingService.getByRole(stId, roleName)
                setPricing(pricingData)
            } catch (err) {
                console.warn('No pricing found', err)
                setPricing(null)
            }

            // 3. Check for Existing Orders for Today/Tomorrow (Lightweight check)
            try {
                // Use getPublicOrders to avoid RLS lookup issues on joined tables
                const orders = await foodOrderService.getPublicOrders(empId, today, tomorrow)
                setExistingOrder(orders)
            } catch (err) {
                console.warn('Error fetching existing orders', err)
            }

            // 4. Load Station Announcements
            try {
                const news = await announcementService.getPublicAnnouncements(stId, 'FOOD_KIOSK')
                setAnnouncements(news)
                // Modal will auto-show based on its internal Smart Logic (localStorage check)
                // But we must render it.
                if (news && news.length > 0) {
                    setShowAnnouncements(true)
                }
            } catch (err) {
                console.error('Error loading announcements', err)
            }

        } catch (err) {
            console.error('Error loading station data', err)
            throw err
        }
    }

    const loadHistory = async () => {
        if (!employee) return
        try {
            setLoading(true)

            // Build options based on filter type
            let options = {}

            if (historyFilter === 'payroll_period') {
                options.currentPayrollPeriod = true
            } else if (historyFilter === 'custom') {
                if (customStartDate) options.startDate = customStartDate
                if (customEndDate) options.endDate = customEndDate
            }
            // If 'last_50', no options needed (default behavior)

            const history = await foodOrderService.getPublicHistory(
                employee.id || employee.employee_id,
                options
            )
            setHistoryOrders(history)
            setShowHistory(true)
        } catch (error) {
            console.error(error)
            setError('Error al cargar historial')
        } finally {
            setLoading(false)
        }
    }

    // --- LOGIC: Filter & Deduplicate Menus ---
    // User wants "Smart Logic": If multiple menus exist for same date/meal, pick one (e.g. latest created).
    const availableMenus = useMemo(() => {
        const dateMenus = menus.filter(m => m.serve_date === filterDate)

        // Group by meal_type
        const grouped = {}
        dateMenus.forEach(m => {
            if (!grouped[m.meal_type]) grouped[m.meal_type] = []
            grouped[m.meal_type].push(m)
        })

        // For each meal type, pick the one with highest ID (latest)
        const result = []
        Object.keys(grouped).forEach(mealType => {
            const group = grouped[mealType]
            // Sort by ID desc (assuming auto-increment or UUID which might not sort by time, but created_at usually correlates)
            // If we have created_at use it, otherwise use ID.
            // Let's assume the API returns them order by created_at desc or we sort here.
            // Safe bet: just take the first one if we don't have created_at, or sort if we do. 
            // Previous menuService fetch sends simple select. Let's assume the backend or JS filter is enough.
            // To be safe, let's trust the service order (usually DB returns insert order or we can't control without sort).
            // Actually `menuService` orders by `serve_date`.
            // Let's take the LAST one in the array as "Latest" if duplicates exist, or First?
            // Usually "Latest created" overrides. Assuming standard SQL behavior or `order by created_at desc`.
            // Let's just pick one.
            result.push(group[0])
        })

        // Sort by Meal Type Order (Breakfast < Lunch < Dinner)
        const order = [MEAL_TYPES.BREAKFAST, MEAL_TYPES.LUNCH, MEAL_TYPES.DINNER]
        return result.sort((a, b) => order.indexOf(a.meal_type) - order.indexOf(b.meal_type))
    }, [menus, filterDate])


    // Check if there is an ACTIVE order for the current filterDate
    const currentExistingOrder = useMemo(() => {
        if (!existingOrder) return null
        return existingOrder.find(o =>
            o.menu_date === filterDate &&
            o.status !== 'CANCELLED' &&
            o.status !== 'REJECTED'
        )
    }, [existingOrder, filterDate])


    // Logic to parse Granular Menus
    const parsedMenuOptions = useMemo(() => {
        if (!selectedMenu) return []

        const rawOptions = selectedMenu.options || []
        const hasSections = rawOptions.some(opt => typeof opt === 'string' && opt.startsWith('SECTION:'))

        if (!hasSections) {
            return [{ title: 'default', items: rawOptions }]
        }

        const sections = []
        let currentSection = { title: 'General', items: [] }

        rawOptions.forEach(opt => {
            if (typeof opt === 'string' && opt.startsWith('SECTION:')) {
                if (currentSection.items.length > 0) {
                    sections.push(currentSection)
                }
                currentSection = { title: opt.replace('SECTION:', ''), items: [] }
            } else {
                currentSection.items.push(opt)
            }
        })
        if (currentSection.items.length > 0) {
            sections.push(currentSection)
        }

        return sections

    }, [selectedMenu])

    // Reset selections when menu changes
    useEffect(() => {
        setSelections({})
        setSuggestions('')
    }, [selectedMenu])


    const handleOrderSubmit = async () => {
        if (!selectedMenu) return

        const missingSections = parsedMenuOptions.filter(s => !selections[s.title])
        if (missingSections.length > 0) return

        setLoading(true)
        try {
            // Pricing Logic with Visitor Support
            let costUser = pricing ? Number(pricing.employee_cost) : 0
            let subsidyCompany = pricing ? Number(pricing.company_subsidy) : 0

            // Check Visitor Rules
            if (employee?.visitor_discount_type) {
                const fullPrice = costUser + subsidyCompany

                if (employee.visitor_discount_type === 'NONE') {
                    // No Discount (User pays full)
                    costUser = fullPrice
                    subsidyCompany = 0
                } else if (employee.visitor_discount_type === 'COURTESY') {
                    // Courtesy (Just a record, no monetary value in this system flow)
                    costUser = 0
                    subsidyCompany = 0
                }
                // 'STANDARD' is default (costUser = employee_cost)
            }

            const totalCost = costUser + subsidyCompany
            const finalEmployeeCost = costUser
            const finalCompanySubsidy = subsidyCompany

            let selectedOptionString = ''
            if (parsedMenuOptions.length === 1 && parsedMenuOptions[0].title === 'default') {
                const rawSelection = selections['default']
                // Split by | to store a clean record but keeping both info for the provider
                if (typeof rawSelection === 'string' && rawSelection.includes('|')) {
                    const [name, details] = rawSelection.split('|')
                    selectedOptionString = `${name} (${details})`
                } else {
                    selectedOptionString = rawSelection
                }
            } else {
                selectedOptionString = parsedMenuOptions
                    .map(s => {
                        const sel = selections[s.title]
                        if (typeof sel === 'string' && sel.includes('|')) {
                            const [name, details] = sel.split('|')
                            return `${name} (${details})`
                        }
                        return sel
                    })
                    .filter(Boolean)
                    .join(' + ')
            }

            const orderData = {
                station_id: station?.id || employee?.station_id,
                employee_id: employee.id || employee.employee_id,
                menu_id: selectedMenu.id,
                menu_date: selectedMenu.serve_date,
                meal_type: selectedMenu.meal_type,
                selected_option: selectedOptionString,
                cost_applied: finalEmployeeCost, // Used to be totalCost, but logic usually stores user cost in cost_applied? No, cost_applied is usually user cost.
                order_type: employee?.is_visitor ? 'VISITOR' : orderType, // Set type to VISITOR if flag is true
                discount_applied: 0,
                employee_cost_snapshot: finalEmployeeCost,
                company_subsidy_snapshot: finalCompanySubsidy,
                status: 'PENDING',
                notes: suggestions,
                dining_option: diningOption
            }

            // Show confirmation dialog with dynamic date
            const dateText = getDynamicDateText(selectedMenu.serve_date)
            const mealTypeText = selectedMenu.meal_type === MEAL_TYPES.BREAKFAST ? 'desayuno' :
                selectedMenu.meal_type === MEAL_TYPES.LUNCH ? 'almuerzo' : 'cena'

            // Store data and show dialog
            setConfirmDialogData({
                dateText,
                mealTypeText,
                selectedOptions: selectedOptionString,
                diningOption,
                orderData
            })
            setShowConfirmDialog(true)
            setLoading(false)

        } catch (err) {
            console.error(err)
            setError('Error al preparar el pedido: ' + (err.message || 'Error desconocido'))
            setLoading(false)
        }
    }

    const handleConfirmOrder = async () => {
        setShowConfirmDialog(false)
        setLoading(true)

        try {
            await foodOrderService.create(confirmDialogData.orderData)
            setOrderSuccess(true)
            setCurrentStep(STEPS.CONFIRMATION)

            // Refresh orders to show the new one if they go back
            loadStationData(station?.id || employee?.station_id, employee.role_name, employee.id)

        } catch (err) {
            console.error(err)
            if (err.message.includes('Ya realizaste un pedido') || err.message.includes('unique') || err.message.includes('conflict')) {
                // If duplicate, refresh data to show the alert and notify user
                await loadStationData(station?.id || employee?.station_id, employee.role_name, employee.id)
                setError('⚠️ Ya existe un pedido registrado para esta fecha. Hemos actualizado la información.')
            } else {
                setError('Error al crear el pedido: ' + (err.message || 'Error desconocido'))
            }
        } finally {
            setLoading(false)
        }
    }

    const resetFlow = () => {
        setDni('')
        setEmployee(null)
        setMenus([])
        setStation(null)
        setCurrentStep(STEPS.DNI_INPUT)
        setOrderSuccess(false)
        setError(null)
        setSelectedMenu(null)
        setSelections({})
        setSuggestions('')
        setExistingOrder(null)
        setDiningOption(null) // Reset dining option to null
    }

    const handleSelection = (sectionTitle, item) => {
        setSelections(prev => ({
            ...prev,
            [sectionTitle]: item
        }))
    }

    const isReadyToOrder = useMemo(() => {
        if (!selectedMenu) return false
        if (parsedMenuOptions.length === 0) return false
        if (!diningOption) return false // Must select dining option
        return parsedMenuOptions.every(section => !!selections[section.title])
    }, [selectedMenu, parsedMenuOptions, selections, diningOption])


    const displayedPrice = useMemo(() => {
        if (!pricing) return '0.00'
        let cost = Number(pricing.employee_cost)

        if (employee?.visitor_discount_type) {
            const fullPrice = Number(pricing.employee_cost) + Number(pricing.company_subsidy)
            if (employee.visitor_discount_type === 'COURTESY') return '0.00'
            if (employee.visitor_discount_type === 'NONE') return fullPrice.toFixed(2)
        }

        return cost.toFixed(2)
    }, [pricing, employee])
    const displayName = useMemo(() => {
        if (employee?.full_name) {
            const names = employee.full_name.split(' ')
            return names[0] // First name
        }
        return 'Comensal'
    }, [employee])

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">

            {/* --- STEP 0: DNI INPUT --- */}
            {currentStep === STEPS.DNI_INPUT && (
                <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-primary-600 to-primary-900">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl"
                    >
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center">
                                <UtensilsCrossed className="w-10 h-10 text-primary-600 animate-pulse" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">¡Hola! 👋</h1>
                        <p className="text-center text-gray-500 mb-8 text-sm">Ingresa tu DNI para ver el menú de hoy</p>

                        <div className="space-y-4">
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={8}
                                    value={dni}
                                    onChange={handleDniChange}
                                    placeholder="DNI del Empleado"
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all font-bold text-lg text-center tracking-widest text-gray-800"
                                />
                            </div>

                            {error && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-red-500 text-xs bg-red-50 p-3 rounded-lg">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{error}</span>
                                </motion.div>
                            )}

                            {loading && (
                                <div className="text-center text-primary-600 text-sm font-medium animate-pulse">
                                    Verificando...
                                </div>
                            )}

                            <div className="pt-2 border-t border-gray-100 mt-2">
                                <button
                                    onClick={async () => {
                                        if (dni.length === 8) {
                                            setAutoOpenHistory(true)
                                            await fetchEmployee(dni)
                                        } else {
                                            setError('Para ver tu historial, ingresa tu DNI completo arriba.')
                                        }
                                    }}
                                    className="w-full py-3 text-gray-500 font-medium text-sm hover:bg-gray-50 rounded-xl transition-colors flex items-center justify-center gap-2 group"
                                >
                                    <History className="w-4 h-4 group-hover:text-primary-600 transition-colors" />
                                    <span className="group-hover:text-primary-600 transition-colors">Ver Mis Pedidos Anteriores</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                    <p className="mt-8 text-primary-100 text-xs opacity-70">Gestor360° Alimentación</p>
                </div>
            )}



            {/* --- SYSTEM CLOSED OVERLAY --- */}
            {
                systemClosed && !systemClosed.isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm"
                    >
                        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl space-y-4">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Clock className="w-10 h-10 text-red-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">Sistema Cerrado</h2>
                            <p className="text-gray-500 text-sm">
                                El horario de atención es de <span className="font-bold text-gray-800">{systemClosed.start}</span> a <span className="font-bold text-gray-800">{systemClosed.end}</span>.
                            </p>

                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4">
                                <p className="text-xs text-blue-600 font-bold uppercase mb-1">¿Necesitas un adicional?</p>
                                <p className="text-sm text-gray-700">Contacta al proveedor:</p>
                                <p className="text-lg font-bold text-blue-700">{systemClosed.contact}</p>
                            </div>

                            <button
                                onClick={() => window.location.reload()}
                                className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl mt-4 hover:bg-gray-200 transition-colors"
                            >
                                Entendido
                            </button>
                        </div>
                    </motion.div>
                )
            }

            {/* --- STEP 1: MENU SELECTION --- */}
            {
                currentStep === STEPS.MENU_SELECTION && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="max-w-md mx-auto min-h-screen bg-gray-50 relative"
                    >
                        {/* Header Pinned */}
                        {/* Header Pinned */}
                        <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-100 px-4 py-3">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-primary-600" />
                                    <span className="font-bold text-gray-800 text-sm truncate max-w-[150px]">
                                        {station?.name || 'Estación'} {(station?.code && station.code !== 'UNK') ? `(${station.code})` : ''}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={loadHistory}
                                        className="flex items-center gap-1 text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-full hover:bg-primary-100 transition-colors border border-primary-100"
                                    >
                                        <History className="w-3.5 h-3.5" />
                                        Mis Pedidos
                                    </button>
                                    <button onClick={resetFlow} className="text-xs text-gray-400 font-medium hover:text-red-500">
                                        Salir
                                    </button>
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 leading-tight">
                                Hola, <span className="text-primary-600">{displayName}</span>
                            </h2>
                            <p className="text-xs text-gray-500">¿Qué te gustaría comer {filterDate === new Date().toISOString().split('T')[0] ? 'hoy' : 'mañana'}?</p>
                        </div>

                        {/* Date Tabs */}
                        <div className="flex p-4 gap-3 overflow-x-auto scrollbar-hide bg-white border-b border-gray-100 sticky top-[72px] z-20">
                            {[
                                { label: 'Hoy', date: new Date().toISOString().split('T')[0] },
                                { label: 'Mañana', date: new Date(Date.now() + 86400000).toISOString().split('T')[0] }
                            ].map((tab) => {
                                const isActive = filterDate === tab.date;
                                return (
                                    <button
                                        key={tab.date}
                                        onClick={() => {
                                            setFilterDate(tab.date)
                                            setSelectedMenu(null)
                                            setSelections({})
                                            setSuggestions('')
                                        }}
                                        className={`flex-1 py-2 px-4 rounded-full text-sm font-bold whitespace-nowrap transition-all ${isActive
                                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-200 ring-2 ring-primary-100'
                                            : 'bg-gray-100 text-gray-500'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Error Alert in Step 1 */}
                        {error && (
                            <div className="mx-4 mt-4 animate-fade-in-down">
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-md">
                                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-red-800">Ha ocurrido un error</h3>
                                        <p className="text-sm text-red-700 mt-1 leading-relaxed">{error}</p>
                                        <button
                                            onClick={() => window.location.reload()}
                                            className="mt-2 text-xs font-bold text-red-600 underline hover:text-red-800"
                                        >
                                            Recargar página
                                        </button>
                                    </div>
                                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Content */}
                        <div className="p-4 space-y-6 pb-48">
                            {currentExistingOrder ? (
                                // --- SHOW NICE ALERT IF ALREADY ORDERED ---
                                <div className="bg-green-50 rounded-3xl p-8 border border-green-100 text-center shadow-sm">
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-green-900 mb-2">¡Pedido Confirmado!</h3>
                                    <p className="text-green-700 mb-6">Ya realizaste un pedido para esta fecha.</p>

                                    <div className="bg-white rounded-2xl p-4 shadow-sm text-left mb-6">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-green-100 rounded-lg">
                                                {getMealIcon(currentExistingOrder.meal_type)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800">{currentExistingOrder.selected_option}</p>
                                                <p className="text-xs text-gray-500 mt-1">{formatDate(filterDate)} - <span className="uppercase">{MEAL_TYPE_LABELS[currentExistingOrder.meal_type]}</span></p>
                                            </div>
                                        </div>
                                        {currentExistingOrder.notes && (
                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                                <p className="text-xs text-gray-500 font-medium uppercase">Tus observaciones:</p>
                                                <p className="text-sm text-gray-600 italic">"{currentExistingOrder.notes}"</p>
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-xs text-green-600">Para cambios, contacta al administrador.</p>
                                </div>
                            ) : availableMenus.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <UtensilsCrossed className="w-16 h-16 mb-4 opacity-20" />
                                    <p className="text-sm font-medium">No hay menús programados para esta fecha.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Horizontal Categories (Breakfast, Lunch, Dinner) */}
                                    {availableMenus.map((menu) => (
                                        <div key={menu.id} className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`p-1.5 rounded-lg text-white ${getMealColor(menu.meal_type)}`}>
                                                    {getMealIcon(menu.meal_type)}
                                                </span>
                                                <h3 className="font-bold text-gray-800 text-lg uppercase tracking-tight">
                                                    {MEAL_TYPE_LABELS[menu.meal_type]}
                                                </h3>
                                            </div>

                                            {/* Menu Content Card */}
                                            <div
                                                onClick={() => setSelectedMenu(menu)}
                                                className={`bg-white rounded-2xl p-4 border-2 transition-all cursor-pointer ${selectedMenu?.id === menu.id
                                                    ? 'border-primary-500 ring-4 ring-primary-50 shadow-xl'
                                                    : 'border-transparent shadow-sm hover:shadow-md'
                                                    }`}
                                            >
                                                {menu.description && (
                                                    <div className="mb-4 bg-yellow-50 text-yellow-800 text-xs p-3 rounded-xl flex gap-2">
                                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                                        <p>{menu.description}</p>
                                                    </div>
                                                )}

                                                {selectedMenu?.id === menu.id ? (
                                                    <div className="space-y-4 animate-fadeIn">
                                                        {parsedMenuOptions.map((section, idx) => (
                                                            <div key={idx}>
                                                                {section.title !== 'default' && (
                                                                    <h4 className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">
                                                                        <span>{section.title}</span>
                                                                        {selections[section.title] ? (
                                                                            <span className="text-green-500 flex items-center gap-1">
                                                                                <Check className="w-3 h-3" /> Seleccionado
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-orange-400 text-[10px]">Requerido</span>
                                                                        )}
                                                                    </h4>
                                                                )}
                                                                <div className="space-y-2">
                                                                    {section.items.map((item, i) => {
                                                                        const isSelected = selections[section.title] === item
                                                                        return (
                                                                            <label
                                                                                key={i}
                                                                                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${isSelected
                                                                                    ? 'bg-primary-50 border-primary-200'
                                                                                    : 'bg-white border-gray-100 hover:border-gray-200'
                                                                                    }`}
                                                                            >
                                                                                <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isSelected
                                                                                    ? 'border-primary-500 bg-primary-500'
                                                                                    : 'border-gray-300 bg-white'
                                                                                    }`}>
                                                                                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                                                                </div>
                                                                                <input
                                                                                    type="radio"
                                                                                    name={`section-${menu.id}-${idx}`}
                                                                                    value={item}
                                                                                    checked={isSelected}
                                                                                    onChange={() => handleSelection(section.title, item)}
                                                                                    className="hidden"
                                                                                />
                                                                                <div className="flex flex-col">
                                                                                    {(() => {
                                                                                        const isString = typeof item === 'string'
                                                                                        const [name, details] = isString && item.includes('|') ? item.split('|') : [item, null]
                                                                                        return (
                                                                                            <>
                                                                                                <span className={`text-sm ${isSelected ? 'font-black text-primary-900' : 'font-bold text-gray-800'}`}>
                                                                                                    {name}
                                                                                                </span>
                                                                                                {details && (
                                                                                                    <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                                                                                                        {details}
                                                                                                    </span>
                                                                                                )}
                                                                                            </>
                                                                                        )
                                                                                    })()}
                                                                                </div>
                                                                            </label>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-2 text-primary-600 font-medium text-sm flex items-center justify-center gap-1">
                                                        <span>Ver Opciones</span>
                                                        <ChevronRight className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions Sticky - Only show if NO existing order */}
                        {selectedMenu && !currentExistingOrder && (
                            <motion.div
                                initial={{ y: 100 }}
                                animate={{ y: 0 }}
                                className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-40 max-w-md mx-auto"
                            >
                                {/* Suggestions - Collapsible */}
                                {!showSuggestions ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowSuggestions(true)}
                                        className="mb-3 w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 py-2 px-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 hover:border-primary-400 transition-all"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        <span>Agregar sugerencias (opcional)</span>
                                    </button>
                                ) : (
                                    <div className="mb-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
                                                <MessageSquare className="w-3 h-3" />
                                                <span>Sugerencias / Comentarios</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowSuggestions(false)
                                                    setSuggestions('')
                                                }}
                                                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <textarea
                                            value={suggestions}
                                            onChange={(e) => setSuggestions(e.target.value)}
                                            placeholder="Ej: Sin cebolla, extra arroz..."
                                            className="w-full text-sm p-3 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none resize-none h-20"
                                            autoFocus
                                        />
                                    </div>
                                )}

                                {pricing && employee?.visitor_discount_type !== 'COURTESY' && (
                                    <div className="mb-3 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                                        <div className="flex justify-between items-center text-xs mb-1">
                                            <span className="text-blue-400">La empresa asume:</span>
                                            <span className="font-bold text-blue-600">S/ {pricing.company_subsidy}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs border-b border-blue-200 pb-1 mb-1">
                                            <span className="text-gray-400">Costo real del menú:</span>
                                            <span className="text-gray-500">S/ {(Number(pricing.employee_cost) + Number(pricing.company_subsidy)).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600 font-bold text-xs">Tu descuento en planilla:</span>
                                            <span className="font-black text-gray-900 text-lg">
                                                S/ {displayedPrice}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {pricing && employee?.visitor_discount_type === 'COURTESY' && (
                                    <div className="mb-3 bg-green-50 p-3 rounded-lg border border-green-100 flex justify-between items-center">
                                        <span className="text-green-700 font-bold">Cortesía / Visita</span>
                                        <span className="font-black text-green-700 text-lg">S/ 0.00</span>
                                    </div>
                                )}
                                {!pricing && (
                                    <div className="flex items-center justify-between mb-3 text-sm">
                                        <span className="text-gray-500">Tu parte a pagar:</span>
                                        <span className="font-bold text-gray-900 text-lg">
                                            S/ {displayedPrice}
                                        </span>
                                    </div>
                                )}

                                {/* Dining Option Selector */}
                                <div className={`mb-4 p-4 rounded-xl border-2 transition-all ${!diningOption ? 'border-orange-300 bg-orange-50/50 dark:bg-orange-900/10' : 'border-transparent'
                                    }`}>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        ¿Dónde consumirás tu pedido? <span className="text-orange-600">*</span>
                                    </label>
                                    {!diningOption && (
                                        <p className="text-xs text-orange-600 dark:text-orange-400 mb-3">
                                            Por favor selecciona una opción
                                        </p>
                                    )}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setDiningOption(DINING_OPTIONS.DINE_IN)}
                                            className={`p-4 rounded-xl border-2 transition-all ${diningOption === DINING_OPTIONS.DINE_IN
                                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600'
                                                }`}
                                        >
                                            <UtensilsCrossed className={`w-6 h-6 mx-auto mb-2 ${diningOption === DINING_OPTIONS.DINE_IN
                                                ? 'text-primary-600 dark:text-primary-400'
                                                : 'text-gray-400'
                                                }`} />
                                            <span className={`block font-medium text-sm ${diningOption === DINING_OPTIONS.DINE_IN
                                                ? 'text-primary-700 dark:text-primary-300'
                                                : 'text-gray-600 dark:text-gray-400'
                                                }`}>
                                                En restaurante
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setDiningOption(DINING_OPTIONS.TAKEAWAY)}
                                            className={`p-4 rounded-xl border-2 transition-all ${diningOption === DINING_OPTIONS.TAKEAWAY
                                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600'
                                                }`}
                                        >
                                            <ShoppingBag className={`w-6 h-6 mx-auto mb-2 ${diningOption === DINING_OPTIONS.TAKEAWAY
                                                ? 'text-primary-600 dark:text-primary-400'
                                                : 'text-gray-400'
                                                }`} />
                                            <span className={`block font-medium text-sm ${diningOption === DINING_OPTIONS.TAKEAWAY
                                                ? 'text-primary-700 dark:text-primary-300'
                                                : 'text-gray-600 dark:text-gray-400'
                                                }`}>
                                                Para llevar
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={handleOrderSubmit}
                                    disabled={!isReadyToOrder || loading}
                                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
                                >
                                    {loading ? 'Procesando...' : 'Confirmar Pedido'}
                                    {!loading && <ArrowRight className="w-5 h-5" />}
                                </button>
                            </motion.div>
                        )}
                    </motion.div>
                )
            }

            {/* --- STEP 2: CONFIRMATION --- */}
            {
                currentStep === STEPS.CONFIRMATION && (
                    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-center">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-500 shadow-green-200 shadow-xl"
                        >
                            <CheckCircle2 className="w-12 h-12" />
                        </motion.div>

                        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">¡Pedido Listo!</h2>
                        <p className="text-gray-500 mb-8 max-w-[250px] mx-auto">
                            Tu comida ha sido reservada para el <span className="font-bold text-gray-800">{formatDate(selectedMenu?.serve_date)}</span>.
                        </p>

                        <div className="w-full max-w-xs bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
                            <div className="flex flex-col gap-4 text-left">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Detalle</p>
                                    <div className="text-gray-700 font-medium whitespace-pre-line mt-1">
                                        {Object.entries(selections).map(([key, value]) => {
                                            if (key === 'default') return <div key={key}>{value}</div>
                                            return <div key={key} className="text-sm"><span className="text-gray-400 font-normal">{key}:</span> {value}</div>
                                        })}
                                    </div>
                                </div>

                                {suggestions && (
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Variaciones / Notas</p>
                                        <p className="text-gray-600 text-sm italic mt-1">"{suggestions}"</p>
                                    </div>
                                )}

                                {pricing && employee?.visitor_discount_type !== 'COURTESY' ? (
                                    <div className="pt-4 border-t border-gray-200 space-y-1">
                                        <div className="flex justify-between items-center text-xs text-blue-500 bg-blue-50 p-1 px-2 rounded">
                                            <span>♥️ La empresa cubre:</span>
                                            <span className="font-bold">S/ {pricing.company_subsidy}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-gray-600 font-bold">Descuento en planilla</span>
                                            <span className="text-primary-600 font-bold text-xl">
                                                S/ {displayedPrice}
                                            </span>
                                        </div>
                                    </div>
                                ) : employee?.visitor_discount_type === 'COURTESY' ? (
                                    <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                                        <span className="text-gray-600 font-bold">Total a Pagar</span>
                                        <span className="text-green-600 font-bold text-xl">
                                            S/ 0.00 (Cortesía)
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex justify-between border-t border-gray-200 pt-4">
                                        <span className="text-gray-500 font-medium">Descuento planilla</span>
                                        <span className="text-primary-600 font-bold text-xl">
                                            S/ {displayedPrice}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={resetFlow}
                            className="text-gray-400 font-medium hover:text-gray-800 transition-colors"
                        >
                            Realizar otro pedido
                        </button>

                    </div>
                )
            }
            {/* Footer */}
            <footer className="py-6 text-center mt-auto">
                <div className="flex flex-col items-center justify-center space-y-1">
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <span>Sistema creado con <span className="text-red-500 animate-pulse">♥️</span> por</span>
                        <a href="https://wsaico.com" target="_blank" rel="noopener noreferrer" className="font-bold text-gray-800 hover:text-primary-600 transition-colors">wsaico</a>
                    </div>
                </div>
            </footer>

            {/* Announcement Modal (Global) */}
            <AnnouncementModal
                announcements={announcements}
                onClose={() => setShowAnnouncements(false)}
            />

            {/* History Modal */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
                        onClick={() => setShowHistory(false)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] md:max-h-[80vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">Mis Pedidos</h2>
                                    <p className="text-xs text-gray-500">
                                        {historyFilter === 'payroll_period' && `Período: ${getPayrollPeriod().label}`}
                                        {historyFilter === 'custom' && 'Fechas personalizadas'}
                                        {historyFilter === 'last_50' && 'Últimos 50 pedidos'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                                        title="Filtros"
                                    >
                                        <Filter size={18} className="text-gray-600" />
                                    </button>
                                    <button
                                        onClick={() => setShowHistory(false)}
                                        className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                                    >
                                        <X size={20} className="text-gray-500" />
                                    </button>
                                </div>
                            </div>

                            {/* Filter Tabs - Collapsible */}
                            {showFilters && (
                                <div className="p-3 bg-white border-b border-gray-100">
                                    <div className="flex gap-2 mb-2">
                                        <button
                                            onClick={() => setHistoryFilter('payroll_period')}
                                            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${historyFilter === 'payroll_period'
                                                ? 'bg-primary-600 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            Período Planilla
                                        </button>
                                        <button
                                            onClick={() => setHistoryFilter('custom')}
                                            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${historyFilter === 'custom'
                                                ? 'bg-primary-600 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            Personalizado
                                        </button>
                                        <button
                                            onClick={() => setHistoryFilter('last_50')}
                                            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${historyFilter === 'last_50'
                                                ? 'bg-primary-600 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            Últimos 50
                                        </button>
                                    </div>

                                    {/* Custom Date Inputs */}
                                    {historyFilter === 'custom' && (
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Desde</label>
                                                <input
                                                    type="date"
                                                    value={customStartDate}
                                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                                    className="w-full text-xs p-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Hasta</label>
                                                <input
                                                    type="date"
                                                    value={customEndDate}
                                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                                    className="w-full text-xs p-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Resumen Mensual con Diseño Mejorado */}
                            <div className="bg-gradient-to-br from-primary-600 to-primary-800 p-3 text-white text-center rounded-none sm:rounded-none relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                                    <div className="absolute top-10 right-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
                                    <div className="absolute bottom-10 left-10 w-24 h-24 bg-white rounded-full blur-2xl"></div>
                                </div>

                                <p className="text-primary-100 text-xs font-medium uppercase tracking-wider mb-1">
                                    En lo que va de {new Date().toLocaleString('es-ES', { month: 'long' })}
                                </p>
                                <h3 className="text-3xl font-black mb-1">
                                    S/ {historyOrders
                                        .filter(o => new Date(o.menu_date).getMonth() === new Date().getMonth())
                                        .reduce((sum, o) => sum + Number(o.company_subsidy_snapshot || 0), 0)
                                        .toFixed(2)}
                                </h3>
                                <p className="text-white/80 text-sm font-medium mb-4 flex items-center justify-center gap-1">
                                    <span className="bg-white/20 p-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /></span>
                                    <span>Asumido por la empresa</span>
                                </p>

                                <div className="flex justify-center gap-4 text-xs border-t border-white/10 pt-4">
                                    <div className="text-right pr-4 border-r border-white/20">
                                        <p className="text-primary-200">Tu Aporte</p>
                                        <p className="font-bold text-lg">S/ {historyOrders
                                            .filter(o => new Date(o.menu_date).getMonth() === new Date().getMonth())
                                            .reduce((sum, o) => sum + Number(o.cost_applied), 0)
                                            .toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="text-left pl-2">
                                        <p className="text-primary-200">Pedidos del Mes</p>
                                        <p className="font-bold text-lg">
                                            {historyOrders.filter(o => new Date(o.menu_date).getMonth() === new Date().getMonth()).length}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {loading && Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm animate-pulse flex gap-3 items-center">
                                        <div className="w-1 h-12 bg-gray-100 rounded-full"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="flex justify-between">
                                                <div className="h-3 bg-gray-100 rounded w-20"></div>
                                                <div className="h-3 bg-gray-100 rounded w-12"></div>
                                            </div>
                                            <div className="h-3 bg-gray-100 rounded w-3/4"></div>
                                        </div>
                                    </div>
                                ))}
                                {!loading && historyOrders.length === 0 && (
                                    <div className="text-center py-12 text-gray-400">
                                        <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No tienes pedidos recientes.</p>
                                    </div>
                                )}
                                {historyOrders.map(order => (
                                    <div key={order.id} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                        {/* Status Line */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${order.status === 'CONFIRMED' ? 'bg-green-500' :
                                            order.status === 'CONSUMED' ? 'bg-blue-500' :
                                                order.status === 'CANCELLED' ? 'bg-red-500' : 'bg-yellow-500'
                                            }`} />

                                        <div className="pl-3">
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-gray-800 text-xs whitespace-nowrap">
                                                        {formatDate(order.menu_date)}
                                                    </p>
                                                    <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase bg-gray-50 px-1.5 py-0.5 rounded">
                                                        {MEAL_TYPE_LABELS[order.meal_type]}
                                                    </span>
                                                    {order.order_type === 'MANUAL' && (
                                                        <span className="text-[9px] font-bold tracking-wider text-purple-700 uppercase bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                                            MANUAL
                                                        </span>
                                                    )}
                                                </div>
                                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${order.status === 'CONFIRMED' ? 'bg-green-50 text-green-700' :
                                                    order.status === 'CONSUMED' ? 'bg-blue-50 text-blue-700' :
                                                        order.status === 'CANCELLED' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                                                    }`}>
                                                    {order.status === 'PENDING' ? 'Pendiente' :
                                                        order.status === 'CONFIRMED' ? 'Confirmado' :
                                                            order.status === 'CONSUMED' ? 'Consumido' : 'Cancelado'}
                                                </div>
                                            </div>

                                            <p className="text-xs text-gray-700 mb-1 truncate font-medium">
                                                {order.selected_option}
                                            </p>

                                            <div className="flex justify-between items-center border-t border-gray-50 pt-1.5 mt-1 text-[10px]">
                                                <div className="text-gray-400">
                                                    {order.company_subsidy_snapshot > 0 && (
                                                        <span>Ahorro: <span className="text-green-600">S/ {order.company_subsidy_snapshot}</span></span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-gray-400">Tu costo:</span>
                                                    <span className="font-bold text-gray-900 text-xs">S/ {order.cost_applied}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showConfirmDialog}
                title={`Confirmar pedido de ${confirmDialogData.mealTypeText}`}
                message={
                    <div className="space-y-3">
                        <p className="text-base">
                            ¿Deseas confirmar tu pedido para{' '}
                            <span className={`font-bold text-lg ${confirmDialogData.dateText === 'hoy' ? 'text-green-600 dark:text-green-400' :
                                confirmDialogData.dateText === 'mañana' ? 'text-blue-600 dark:text-blue-400' :
                                    'text-primary-600 dark:text-primary-400'
                                }`}>
                                {confirmDialogData.dateText}
                            </span>?
                        </p>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {confirmDialogData.selectedOptions}
                            </p>
                            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                {confirmDialogData.diningOption === DINING_OPTIONS.DINE_IN ? (
                                    <UtensilsCrossed className="w-3.5 h-3.5 text-gray-500" />
                                ) : (
                                    <ShoppingBag className="w-3.5 h-3.5 text-gray-500" />
                                )}
                                <span className="text-xs text-gray-500">
                                    {DINING_OPTION_LABELS[confirmDialogData.diningOption]}
                                </span>
                            </div>
                        </div>
                    </div>
                }
                confirmText="Sí, confirmar"
                cancelText="Cancelar"
                onConfirm={handleConfirmOrder}
                onCancel={() => setShowConfirmDialog(false)}
                type="info"
            />

        </div >
    )
}

export default PublicMenuPage
