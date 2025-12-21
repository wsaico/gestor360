import { useState, useEffect } from 'react'
import {
    X,
    ChevronRight,
    ChevronLeft,
    UtensilsCrossed,
    List,
    Copy,
    Plus,
    Trash2,
    Check,
    Calendar,
    Layers
} from 'lucide-react'
import menuService from '@services/menuService'
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '@utils/constants'

/**
 * Modes of creation
 */
const MODES = {
    SELECT: 'SELECT',
    SIMPLE: 'SIMPLE',
    GRANULAR: 'GRANULAR',
    COPY: 'COPY'
}

/**
 * Menu Creation Wizard
 */
const MenuWizard = ({ stationId, providerId, onClose, onSuccess }) => {
    const [step, setStep] = useState(1)
    const [mode, setMode] = useState(MODES.SELECT)
    const [loading, setLoading] = useState(false)
    const [availableMenus, setAvailableMenus] = useState([])

    // Form Data
    const [formData, setFormData] = useState({
        station_id: stationId,
        provider_id: providerId,
        serve_date: '',
        meal_type: MEAL_TYPES.LUNCH,
        description: '',
        options: [], // For simple mode (strings)
        sections: [] // For granular mode [{ title: 'Entrada', items: [] }]
    })

    // Initialize date
    useEffect(() => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        setFormData(prev => ({ ...prev, serve_date: tomorrow.toISOString().split('T')[0] }))
    }, [])

    // Navigation handlers
    const handleNext = () => {
        if (step === 1 && mode === MODES.COPY) {
            if (!formData.copyFromId) {
                alert('Selecciona un menú para copiar')
                return
            }
            loadCopiedMenu()
            return
        }
        setStep(prev => prev + 1)
    }

    const handleBack = () => {
        if (step === 2 && mode !== MODES.SELECT) {
            setMode(MODES.SELECT) // Reset to selection on back from editor
            setStep(1)
        } else {
            setStep(prev => prev - 1)
        }
    }

    // Load menu to copy
    const loadCopiedMenu = async () => {
        try {
            setLoading(true)
            const menuToCopy = availableMenus.find(m => m.id === formData.copyFromId)
            if (menuToCopy) {
                // Detect if it was granular or simple
                const isGranular = menuToCopy.options.some(opt => opt.startsWith('SECTION:'))

                if (isGranular) {
                    // Parse sections
                    const sections = []
                    let currentSection = null

                    menuToCopy.options.forEach(opt => {
                        if (opt.startsWith('SECTION:')) {
                            if (currentSection) sections.push(currentSection)
                            currentSection = { title: opt.replace('SECTION:', ''), items: [] }
                        } else if (currentSection) {
                            currentSection.items.push(opt)
                        } else {
                            // Loose items before any section, put in "General" or similar? 
                            // For now let's assume valid structure or ignore loose items at start
                        }
                    })
                    if (currentSection) sections.push(currentSection)

                    setFormData(prev => ({
                        ...prev,
                        meal_type: menuToCopy.meal_type,
                        description: menuToCopy.description,
                        sections,
                        options: []
                    }))
                    setMode(MODES.GRANULAR)
                } else {
                    // Simple mode
                    setFormData(prev => ({
                        ...prev,
                        meal_type: menuToCopy.meal_type,
                        description: menuToCopy.description,
                        options: menuToCopy.options,
                        sections: []
                    }))
                    setMode(MODES.SIMPLE)
                }
                setStep(2)
            }
        } catch (error) {
            console.error(error)
            alert("Error al copiar menú")
        } finally {
            setLoading(false)
        }
    }

    // Fetch history for copy mode
    const fetchHistory = async () => {
        try {
            setLoading(true)
            // Get last 30 days history? Or just use getAll without filters (limit?)
            // For now let's use getAll with a simple date filter if needed, 
            // or just fetch recent ones. Using existing service getAll.
            const data = await menuService.getAll(stationId)
            setAvailableMenus(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    // Final Submit
    const handleSubmit = async () => {
        try {
            setLoading(true)

            // Prepare final options array
            let finalOptions = []

            if (mode === MODES.SIMPLE) {
                finalOptions = formData.options
            } else if (mode === MODES.GRANULAR) {
                // Flatten sections
                formData.sections.forEach(sec => {
                    finalOptions.push(`SECTION:${sec.title}`)
                    finalOptions.push(...sec.items)
                })
            }

            if (finalOptions.length === 0) {
                alert('Debe agregar al menos una opción al menú')
                setLoading(false)
                return
            }

            const payload = {
                station_id: stationId,
                provider_id: providerId,
                serve_date: formData.serve_date,
                meal_type: formData.meal_type,
                options: finalOptions,
                description: formData.description
            }

            await menuService.create(payload)
            onSuccess()

        } catch (error) {
            console.error(error)
            alert(error.message || 'Error al crear menú')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                    {/* Header */}
                    <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {step === 1 && <span className="text-primary-600">Paso 1:</span>}
                                {step === 2 && <span className="text-primary-600">Paso 2:</span>}

                                {step === 1 ? 'Seleccionar Tipo de Menú' : 'Configurar Detalles'}
                            </h3>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="px-4 py-5 sm:p-6 min-h-[400px]">
                        {/* STEP 1: SELECT MODE */}
                        {step === 1 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                                {/* Single/Combo Mode */}
                                <div
                                    onClick={() => { setMode(MODES.SIMPLE); handleNext() }}
                                    className="cursor-pointer group relative p-6 border-2 border-gray-200 dark:border-gray-700 rounded-2xl hover:border-primary-500 dark:hover:border-primary-500 transition-all hover:shadow-lg flex flex-col items-center justify-center text-center space-y-4 bg-gray-50 dark:bg-gray-800/50"
                                >
                                    <div className="p-4 bg-white dark:bg-gray-700 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                        <List className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white mb-1">Menú Simple / Combo</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Opciones completas ("Estofado + Jugo") listas para elegir.
                                        </p>
                                    </div>
                                </div>

                                {/* Granular Mode */}
                                <div
                                    onClick={() => { setMode(MODES.GRANULAR); handleNext() }}
                                    className="cursor-pointer group relative p-6 border-2 border-gray-200 dark:border-gray-700 rounded-2xl hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-lg flex flex-col items-center justify-center text-center space-y-4 bg-gray-50 dark:bg-gray-800/50"
                                >
                                    <div className="p-4 bg-white dark:bg-gray-700 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                        <Layers className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white mb-1">Menú por Secciones</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Categorías separadas ("Entradas", "Fondos", "Postres").
                                        </p>
                                    </div>
                                </div>

                                {/* Copy Mode */}
                                <div
                                    onClick={() => {
                                        setMode(MODES.COPY);
                                        fetchHistory();
                                    }}
                                    className={`cursor-pointer group relative p-6 border-2 rounded-2xl transition-all hover:shadow-lg flex flex-col items-center justify-center text-center space-y-4 bg-gray-50 dark:bg-gray-800/50 ${mode === MODES.COPY ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-purple-500'}`}
                                >
                                    <div className="p-4 bg-white dark:bg-gray-700 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                        <Copy className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white mb-1">Copiar Anterior</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Reutilizar un menú de una fecha pasada.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 1 EXTENSION: COPY SELECTION */}
                        {step === 1 && mode === MODES.COPY && (
                            <div className="mt-8 animate-fade-in-up">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-gray-500" />
                                    Selecciona el menú a copiar:
                                </h4>
                                {loading ? (
                                    <div className="text-center py-4 text-gray-500">Cargando historial...</div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {availableMenus.map(menu => (
                                            <div
                                                key={menu.id}
                                                onClick={() => setFormData(prev => ({ ...prev, copyFromId: menu.id }))}
                                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.copyFromId === menu.id ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-100 dark:border-gray-700 hover:border-purple-300'}`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                        {menu.serve_date}
                                                    </span>
                                                    <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">
                                                        {MEAL_TYPE_LABELS[menu.meal_type]}
                                                    </span>
                                                </div>
                                                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 truncate">
                                                    {menu.options.length} opciones
                                                    {menu.description && <span className="block text-xs text-gray-400 italic truncate">{menu.description}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={handleNext}
                                        disabled={!formData.copyFromId}
                                        className="btn btn-primary btn-md flex items-center gap-2"
                                    >
                                        Continuar <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}


                        {/* STEP 2: DETAILS EDITOR */}
                        {step === 2 && (
                            <div className="animate-fade-in space-y-6">

                                {/* Common Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="label">Fecha de Servicio</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={formData.serve_date}
                                            onChange={e => setFormData(prev => ({ ...prev, serve_date: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Tipo de Comida</label>
                                        <select
                                            className="input"
                                            value={formData.meal_type}
                                            onChange={e => setFormData(prev => ({ ...prev, meal_type: e.target.value }))}
                                        >
                                            {Object.entries(MEAL_TYPE_LABELS).map(([k, v]) => (
                                                <option key={k} value={k}>{v}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Descripción (Opcional)</label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="Ej: Menú Criollo"
                                            value={formData.description}
                                            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                                    {/* EDITOR FOR SIMPLE MODE */}
                                    {mode === MODES.SIMPLE && (
                                        <SimpleMenuEditor
                                            options={formData.options}
                                            onChange={opts => setFormData(prev => ({ ...prev, options: opts }))}
                                        />
                                    )}

                                    {/* EDITOR FOR GRANULAR MODE */}
                                    {mode === MODES.GRANULAR && (
                                        <GranularMenuEditor
                                            sections={formData.sections}
                                            onChange={secs => setFormData(prev => ({ ...prev, sections: secs }))}
                                        />
                                    )}
                                </div>

                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-100 dark:border-gray-700">
                        {step === 2 && (
                            <button
                                type="button"
                                className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-6 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm items-center gap-2 transition-all"
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? 'Guardando...' : 'Guardar Menú'}
                                <Check className="w-4 h-4" />
                            </button>
                        )}

                        {/* Back Button (Only step 2 or copy mode active) */}
                        {(step === 2 || (step === 1 && mode === MODES.COPY)) && (
                            <button
                                type="button"
                                className="mt-3 w-full inline-flex justify-center rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm items-center gap-2"
                                onClick={() => {
                                    if (step === 1 && mode === MODES.COPY) {
                                        setMode(MODES.SELECT) // Cancel copy mode
                                    } else {
                                        handleBack()
                                    }
                                }}
                            >
                                <ChevronLeft className="w-4 h-4" /> Atrás
                            </button>
                        )}

                        {step === 1 && mode !== MODES.COPY && (
                            <button
                                type="button"
                                className="mt-3 w-full inline-flex justify-center rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                onClick={onClose}
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * Editor for Simple List (Combos)
 */
const SimpleMenuEditor = ({ options, onChange }) => {
    const [name, setName] = useState('')
    const [details, setDetails] = useState('')

    const add = () => {
        if (!name.trim()) return
        const entry = details.trim() ? `${name.trim()}|${details.trim()}` : name.trim()
        onChange([...options, entry])
        setName('')
        setDetails('')
    }

    const remove = (idx) => {
        onChange(options.filter((_, i) => i !== idx))
    }

    return (
        <div className="space-y-4">
            <h4 className="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                <List className="w-5 h-5 text-primary-500" />
                Opciones del Menú (Combos)
            </h4>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Nombre del Combo</label>
                        <input
                            type="text"
                            className="input text-sm"
                            placeholder="Ej: Combo 1"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && add()}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Detalles / Contenido</label>
                        <input
                            type="text"
                            className="input text-sm"
                            placeholder="Ej: Jugo, Trucha, Cafe"
                            value={details}
                            onChange={e => setDetails(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && add()}
                        />
                    </div>
                </div>
                <button
                    className="btn btn-primary w-full flex items-center justify-center gap-2"
                    onClick={add}
                    disabled={!name.trim()}
                >
                    <Plus className="w-4 h-4" /> Agregar Opción
                </button>
            </div>

            <ul className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {options.map((opt, i) => {
                    const [optName, optDetails] = opt.split('|')
                    return (
                        <li key={i} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 group hover:border-primary-200 transition-colors">
                            <div className="flex-1 min-w-0">
                                <span className="font-bold text-gray-800 dark:text-gray-200 block">{optName}</span>
                                {optDetails && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 italic block truncate">
                                        {optDetails}
                                    </span>
                                )}
                            </div>
                            <button onClick={() => remove(i)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </li>
                    )
                })}
                {options.length === 0 && (
                    <li className="text-center py-8 bg-gray-50/50 dark:bg-gray-900/20 rounded-xl border-2 border-dashed border-gray-100 dark:border-gray-800 text-gray-400 text-sm italic">
                        Agregue combos a la lista para comenzar
                    </li>
                )}
            </ul>
        </div>
    )
}

/**
 * Editor for Granular Sections
 */
const GranularMenuEditor = ({ sections, onChange }) => {
    const [newSectionTitle, setNewSectionTitle] = useState('')
    const [newItemText, setNewItemText] = useState('')
    const [activeSectionIndex, setActiveSectionIndex] = useState(0) // Default to first if exists, else -1

    // Initialize with a default section if empty?
    useEffect(() => {
        if (sections.length === 0) {
            // Don't force create, let user create
        } else if (activeSectionIndex >= sections.length) {
            setActiveSectionIndex(sections.length - 1)
        }
    }, [sections.length])

    const addSection = () => {
        if (!newSectionTitle.trim()) return
        onChange([...sections, { title: newSectionTitle.trim(), items: [] }])
        setActiveSectionIndex(sections.length) // Switch to new section
        setNewSectionTitle('')
    }

    const removeSection = (idx) => {
        if (!confirm('¿Eliminar esta sección y sus items?')) return
        const newSecs = sections.filter((_, i) => i !== idx)
        onChange(newSecs)
        if (activeSectionIndex === idx) setActiveSectionIndex(Math.max(0, idx - 1))
    }

    const addItemToSection = (sectionIdx) => {
        if (!newItemText.trim()) return
        const newSecs = [...sections]
        newSecs[sectionIdx].items.push(newItemText.trim())
        onChange(newSecs)
        setNewItemText('')
    }

    const removeItemFromSection = (sectionIdx, itemIdx) => {
        const newSecs = [...sections]
        newSecs[sectionIdx].items = newSecs[sectionIdx].items.filter((_, i) => i !== itemIdx)
        onChange(newSecs)
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-500" />
                    Secciones y Platos
                </h4>
            </div>

            {/* Section Creator */}
            <div className="flex gap-2 mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <input
                    type="text"
                    className="input flex-1 bg-white dark:bg-gray-800"
                    placeholder="Nombre de nueva sección (Ej: Entradas)"
                    value={newSectionTitle}
                    onChange={e => setNewSectionTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSection()}
                />
                <button className="btn btn-secondary text-blue-600 dark:text-blue-400" onClick={addSection}>
                    <Plus className="w-5 h-5 mr-1" /> Crear Sección
                </button>
            </div>

            {/* Sections Tabs/Accordion */}
            {sections.length === 0 ? (
                <div className="text-center py-8 text-gray-400 italic">
                    Cree una sección para comenzar (ej: "Entradas", "Platos de Fondo")
                </div>
            ) : (
                <div className="space-y-6">
                    {sections.map((section, sIdx) => (
                        <div key={sIdx} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            {/* Section Header */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <h5 className="font-bold text-gray-800 dark:text-gray-200">{section.title}</h5>
                                <button onClick={() => removeSection(sIdx)} className="text-red-400 hover:text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Section Items */}
                            <div className="p-4">
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                    {section.items.map((item, iIdx) => (
                                        <li key={iIdx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/30 rounded border border-gray-100 dark:border-gray-700">
                                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate mr-2">{item}</span>
                                            <button onClick={() => removeItemFromSection(sIdx, iIdx)} className="text-gray-400 hover:text-red-500">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="input text-sm py-1.5"
                                        placeholder={`Agregar plato a ${section.title}...`}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                const val = e.target.value
                                                if (val.trim()) {
                                                    const newSecs = [...sections]
                                                    newSecs[sIdx].items.push(val.trim())
                                                    onChange(newSecs)
                                                    e.target.value = ''
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default MenuWizard
