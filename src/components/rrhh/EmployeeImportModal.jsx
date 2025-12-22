import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import {
    X,
    Upload,
    Download,
    AlertTriangle,
    CheckCircle,
    FileSpreadsheet,
    Loader,
    AlertCircle
} from 'lucide-react'
import employeeService from '@/services/employeeService'
import jobRoleService from '@/services/jobRoleService'
import areaService from '@/services/areaService'
import { useNotification } from '@/contexts/NotificationContext'
import { CONTRACT_TYPES } from '@/utils/constants'

// Valid Contract Types
const VALID_CONTRACTS = Object.keys(CONTRACT_TYPES)

const EmployeeImportModal = ({ isOpen, onClose, onSuccess, stationId }) => {
    const { notify } = useNotification()
    const fileInputRef = useRef(null)

    const [file, setFile] = useState(null)
    const [previewData, setPreviewData] = useState([]) // { row, data, status, errors }
    const [validating, setValidating] = useState(false)
    const [importing, setImporting] = useState(false)
    const [summary, setSummary] = useState({ valid: 0, invalid: 0 })

    // Lookup Maps
    const [areasMap, setAreasMap] = useState({}) // Name -> ID
    const [rolesMap, setRolesMap] = useState({}) // Name -> ID
    const [existingDnis, setExistingDnis] = useState(new Set())
    const [loadingLookups, setLoadingLookups] = useState(true)

    // Load Lookups on Open
    useEffect(() => {
        if (isOpen && stationId) {
            loadLookups()
        }
    }, [isOpen, stationId])

    const loadLookups = async () => {
        try {
            setLoadingLookups(true)
            const [areas, roles, employees] = await Promise.all([
                areaService.getAll(stationId, true),
                jobRoleService.getAll(),
                employeeService.getAll(stationId, {}, 1, 1000)
            ])

            // Build Maps (Keys Upper, Values Object for casing preservation)
            const aMap = {}
            areas.forEach(a => {
                aMap[a.name.toUpperCase().trim()] = { id: a.id, name: a.name }
            })

            const rMap = {}
            roles.forEach(r => {
                rMap[r.name.toUpperCase().trim()] = { id: r.id, name: r.name }
            })

            const dnis = new Set(employees?.data?.map(e => e.dni) || [])
            setExistingDnis(dnis)

            setAreasMap(aMap)
            setRolesMap(rMap)
        } catch (error) {
            console.error('Error loading lookups:', error)
            notify.error('Error al cargar listas de Áreas y Cargos')
        } finally {
            setLoadingLookups(false)
        }
    }

    if (!isOpen) return null

    // --- 1. Template Download ---
    const handleDownloadTemplate = () => {
        const headers = [
            'DNI',             // Required (Unique)
            'NOMBRES',         // Required
            'APELLIDOS',       // Required
            'CARGO',           // Required (Match Name)
            'AREA',            // Required (Match Name)
            'CORREO',          // Optional
            'CELULAR',         // Optional
            'TIPO_CONTRATO',   // Optional (Enum)
            'FECHA_NACIMIENTO',// Optional (YYYY-MM-DD)
            'FECHA_INGRESO'    // Optional (YYYY-MM-DD)
        ]

        const sampleRow = [
            '12345678',
            'Juan',
            'Perez',
            'Operario de Limpieza',
            'Mantenimiento',
            'juan.perez@example.com',
            '987654321',
            'INDETERMINADO',
            '1990-01-01',
            new Date().toISOString().split('T')[0]
        ]

        const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow])

        // Set column widths
        ws['!cols'] = [
            { wch: 12 }, // DNI
            { wch: 20 }, // NOMBRES
            { wch: 20 }, // APELLIDOS
            { wch: 25 }, // CARGO
            { wch: 20 }, // AREA
            { wch: 25 }, // CORREO
            { wch: 15 }, // CELU
            { wch: 20 }, // CONTRATO
            { wch: 15 }  // FECHA
        ]

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Empleados')
        XLSX.writeFile(wb, 'plantilla_carga_empleados.xlsx')
    }

    // --- 2. File Upload & Parsing ---
    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0]
        if (!selectedFile) return

        setFile(selectedFile)
        setValidating(true)
        setPreviewData([])
        setSummary({ valid: 0, invalid: 0 })

        const reader = new FileReader()
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result
                const wb = XLSX.read(bstr, { type: 'binary' })
                const wsName = wb.SheetNames[0]
                const ws = wb.Sheets[wsName]
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) // Array of arrays

                validateData(data)
            } catch (error) {
                console.error('Error parsing excel:', error)
                notify.error('Error al leer el archivo Excel')
                setValidating(false)
            }
        }
        reader.readAsBinaryString(selectedFile)
    }

    // --- 3. Validation Logic ---
    const validateData = (rows) => {
        if (rows.length < 2) {
            notify.warning('El archivo parece estar vacío o sin datos')
            setValidating(false)
            return
        }

        const headers = rows[0].map(h => String(h).trim().toUpperCase())
        const body = rows.slice(1)

        // Map header indexes
        const idxDni = headers.indexOf('DNI')
        const idxName = headers.indexOf('NOMBRES')
        const idxLast = headers.indexOf('APELLIDOS')
        const idxRole = headers.indexOf('CARGO')
        const idxArea = headers.indexOf('AREA')
        const idxEmail = headers.indexOf('CORREO')
        const idxPhone = headers.indexOf('CELULAR')
        const idxType = headers.indexOf('TIPO_CONTRATO')
        const idxBirth = headers.indexOf('FECHA_NACIMIENTO')
        const idxHire = headers.indexOf('FECHA_INGRESO')

        if (idxDni === -1 || idxName === -1 || idxLast === -1) {
            notify.error('Faltan columnas obligatorias: DNI, NOMBRES, APELLIDOS')
            setValidating(false)
            return
        }

        let validCount = 0
        let invalidCount = 0
        const processed = []

        body.forEach((row, index) => {
            // Skip empty rows
            if (row.length === 0 || !row[idxDni]) return

            const errors = []
            const dni = String(row[idxDni] || '').trim()
            const name = String(row[idxName] || '').trim()
            const lastName = String(row[idxLast] || '').trim()
            const roleName = row[idxRole] ? String(row[idxRole]).trim().toUpperCase() : ''
            const areaName = row[idxArea] ? String(row[idxArea]).trim().toUpperCase() : ''
            const contractType = row[idxType] ? String(row[idxType]).trim().toUpperCase() : 'INDETERMINADO'

            // Validation 1: Required Basics
            if (!dni) errors.push('Falta DNI')
            if (!name) errors.push('Falta Nombre')
            if (!lastName) errors.push('Falta Apellido')
            if (dni.length < 8) errors.push('DNI inválido (mín 8 chars)')
            if (existingDnis.has(dni)) errors.push('DNI ya registrado')

            // Validation 2: Lookups
            let roleId = null
            let areaId = null
            let finalRoleName = ''
            let finalAreaName = ''

            if (roleName) {
                const match = rolesMap[roleName]
                if (match) {
                    roleId = match.id
                    finalRoleName = match.name // Use DB casing
                } else {
                    errors.push(`Cargo no encontrado: ${roleName}`)
                }
            } else {
                errors.push('Falta Cargo')
            }

            if (areaName) {
                const match = areasMap[areaName]
                if (match) {
                    areaId = match.id
                    finalAreaName = match.name // Use DB casing
                } else {
                    errors.push(`Área no encontrada: ${areaName}`)
                }
            }

            // Validation 3: Enums
            if (!VALID_CONTRACTS.includes(contractType)) {
                // Flexible match?
                if (contractType.includes('INDETERMINADO')) { } // ok
                else if (contractType.includes('INCREMENTO')) { } // ok
                else {
                    errors.push(`Tipo Contrato inválido: ${contractType}`)
                }
            }

            // Build data object
            const employeeData = {
                station_id: stationId,
                dni: dni,
                full_name: `${name} ${lastName}`.trim(),
                role_name: finalRoleName || roleName, // Use original casing if found
                area_id: areaId,
                area: finalAreaName || areaName, // Use original casing if found
                email: row[idxEmail] || '',
                phone: row[idxPhone] || '',
                contract_type: contractType,
                birth_date: row[idxBirth] || null,
                hire_date: row[idxHire] || new Date().toISOString().split('T')[0],
                status: 'ACTIVO',
                uniform_size: 'M' // Default
            }

            const status = errors.length > 0 ? 'ERROR' : 'VALID'
            if (status === 'VALID') validCount++
            else invalidCount++

            processed.push({
                row: index + 2,
                data: employeeData,
                status,
                errors
            })
        })

        setPreviewData(processed)
        setSummary({ valid: validCount, invalid: invalidCount })
        setValidating(false)
    }

    // --- 4. Import Action ---
    const handleImport = async () => {
        const validRows = previewData.filter(item => item.status === 'VALID').map(item => item.data)

        if (validRows.length === 0) {
            notify.warning('No hay filas válidas para importar')
            return
        }

        try {
            setImporting(true)

            // Call service
            await employeeService.createBulk(validRows)

            notify.success(`${validRows.length} empleados importados correctamente`)
            onSuccess()
            onClose()
        } catch (error) {
            console.error('Import error:', error)
            notify.error('Error al guardar datos: ' + error.message)
        } finally {
            setImporting(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                            Importación Masiva de Empleados
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Carga personal desde Excel vinculando Cargos y Áreas automáticamente.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Loading Lookups */}
                    {loadingLookups ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                            <span className="ml-2 text-slate-600">Cargando catálogo de Áreas y Cargos...</span>
                        </div>
                    ) : (
                        <>
                            {/* Action Bar */}
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">1. Descargar Plantilla</span>
                                    <button
                                        onClick={handleDownloadTemplate}
                                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors w-fit"
                                    >
                                        <Download className="w-4 h-4" />
                                        Descargar formato Excel
                                    </button>
                                </div>

                                <div className="hidden sm:block w-px h-12 bg-slate-200 dark:bg-slate-700"></div>

                                <div className="flex flex-col gap-2 flex-1 w-full sm:w-auto">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">2. Subir Archivo</span>
                                    <div className="flex gap-2">
                                        <input
                                            type="file"
                                            accept=".xlsx, .xls"
                                            onChange={handleFileChange}
                                            ref={fileInputRef}
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current.click()}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors"
                                        >
                                            <Upload className="w-4 h-4" />
                                            Seleccionar Archivo
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Validation Summary */}
                            {(previewData.length > 0 || validating) && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-2 text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full">
                                            <CheckCircle className="w-4 h-4" />
                                            {summary.valid} Válidos
                                        </div>
                                        <div className="flex items-center gap-2 text-rose-600 font-medium bg-rose-50 dark:bg-rose-900/20 px-3 py-1 rounded-full">
                                            <AlertCircle className="w-4 h-4" />
                                            {summary.invalid} Errores
                                        </div>
                                    </div>

                                    {/* Table Preview */}
                                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                        <div className="max-h-[300px] overflow-y-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800 sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-3">Fila</th>
                                                        <th className="px-4 py-3">Estado</th>
                                                        <th className="px-4 py-3">Empleado</th>
                                                        <th className="px-4 py-3">Cargo/Área</th>
                                                        <th className="px-4 py-3">Error</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                    {previewData.map((item, idx) => (
                                                        <tr key={idx} className={`bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 ${item.status === 'ERROR' ? 'bg-rose-50/50 dark:bg-rose-900/10' : ''}`}>
                                                            <td className="px-4 py-3 font-mono text-slate-500">{item.row}</td>
                                                            <td className="px-4 py-3">
                                                                {item.status === 'VALID' ? (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                                                                        Válido
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                                                                        Error
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                                {item.data.full_name}
                                                                <div className="text-xs text-slate-400">DNI: {item.data.dni}</div>
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                                                <div>{item.data.role_name}</div>
                                                                {/* Just label match, real name might differ but id is set */}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-500">
                                                                {item.errors.length > 0 ? (
                                                                    <span className="text-rose-600 flex items-center gap-1">
                                                                        <AlertTriangle className="w-3 h-3" />
                                                                        {item.errors.join(', ')}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-emerald-600 flex items-center gap-1">
                                                                        <CheckCircle className="w-3 h-3" />
                                                                        Listo
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700"
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={handleImport}
                        disabled={importing || summary.valid === 0 || loadingLookups}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        {importing ? (
                            <>
                                <Loader className="w-4 h-4 animate-spin" />
                                Importando...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                Importar {summary.valid > 0 ? `(${summary.valid})` : ''}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default EmployeeImportModal
