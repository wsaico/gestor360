import { useState, useRef } from 'react'
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
import masterProductService from '@services/masterProductService'
import { useNotification } from '@contexts/NotificationContext'

const MasterProductImportModal = ({ isOpen, onClose, onSuccess, types = [], areas = [] }) => {
    const { notify } = useNotification()
    const fileInputRef = useRef(null)

    const [file, setFile] = useState(null)
    const [previewData, setPreviewData] = useState([]) // { row, data, status, errors }
    const [validating, setValidating] = useState(false)
    const [importing, setImporting] = useState(false)
    const [summary, setSummary] = useState({ valid: 0, invalid: 0 })

    if (!isOpen) return null

    // --- 1. Template Download ---
    const handleDownloadTemplate = () => {
        const headers = [
            'NOMBRE',          // Required
            'TIPO',            // Required
            'AREA',            // Optional (Suggested Area)
            'TALLA',           // Optional
            'CODIGO_SAP',      // Optional
            'DESCRIPCION',     // Optional
            'PRECIO_BASE',     // Optional
            'UNIDAD'           // Optional
        ]

        const sampleRow = [
            'GUANTES DE SEGURIDAD',
            types[0]?.name || 'EPP',
            areas[0]?.name || 'GENERAL',
            'L',
            'SAP12345',
            'Guantes de protección',
            '15.50',
            'PAR'
        ]

        const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow])

        // Set column widths for better UX
        ws['!cols'] = [
            { wch: 30 }, // NOMBRE
            { wch: 20 }, // TIPO
            { wch: 20 }, // AREA
            { wch: 10 }, // TALLA
            { wch: 15 }, // SAP
            { wch: 40 }, // DESCRIPCION
            { wch: 12 }, // PRECIO
            { wch: 10 }  // UNIDAD
        ]

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
        XLSX.writeFile(wb, 'plantilla_productos_maestros.xlsx')
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
        const idxName = headers.indexOf('NOMBRE')
        const idxType = headers.indexOf('TIPO')
        const idxArea = headers.indexOf('AREA')
        const idxTalla = headers.indexOf('TALLA')
        const idxSap = headers.indexOf('CODIGO_SAP')
        const idxDesc = headers.indexOf('DESCRIPCION')
        const idxPrice = headers.indexOf('PRECIO_BASE')
        const idxUnit = headers.indexOf('UNIDAD')

        if (idxName === -1 || idxType === -1) {
            notify.error('Faltan columnas obligatorias: NOMBRE y TIPO')
            setValidating(false)
            return
        }

        let validCount = 0
        let invalidCount = 0
        const processed = []

        body.forEach((row, index) => {
            // Skip empty rows
            if (row.length === 0 || !row[idxName]) return

            const errors = []
            const name = row[idxName]
            const typeName = row[idxType]

            // Validation 1: Name Required
            if (!name) errors.push('Falta Nombre')

            // Validation 2: Type Exists
            let typeId = null
            if (typeName) {
                const foundType = types.find(t => t.name.toLowerCase() === String(typeName).toLowerCase())
                if (foundType) {
                    typeId = foundType.id
                } else {
                    errors.push(`Tipo '${typeName}' no existe en catálogo`)
                }
            } else {
                errors.push('Falta Tipo')
            }

            // Validation 3: Area mapping (Optional)
            let areaId = null
            const areaName = row[idxArea]
            if (areaName) {
                const foundArea = areas.find(a => a.name.toLowerCase() === String(areaName).toLowerCase())
                if (foundArea) {
                    areaId = foundArea.id
                } else {
                    errors.push(`Área '${areaName}' no existe`)
                }
            }

            // Build data object
            const productData = {
                name: name,
                sap_code: row[idxSap] || null,
                description: row[idxDesc] || '',
                base_price: row[idxPrice] ? parseFloat(row[idxPrice]) : 0,
                unit_measurement: row[idxUnit] || 'UNIDAD',
                size: row[idxTalla] || '',
                area_id: areaId,
                type_id: typeId,
                is_active: true
            }

            const status = errors.length > 0 ? 'ERROR' : 'VALID'
            if (status === 'VALID') validCount++
            else invalidCount++

            processed.push({
                row: index + 2, // Excel row number (1-header + 1-index)
                data: productData,
                status,
                errors
            })
        })

        setPreviewData(processed)
        setSummary({ valid: validCount, invalid: invalidCount })
        setValidating(false)
    }

    const handleImport = async () => {
        let validRows = previewData.filter(item => item.status === 'VALID').map(item => item.data)

        // Deduplicate by sap_code within the batch (taking the last one found)
        const uniqueMap = new Map()
        validRows.forEach(row => {
            if (row.sap_code) {
                uniqueMap.set(row.sap_code, row)
            } else {
                // If no sap_code, treat as unique entry (using a temp key or just add array later)
                // Actually, duplicate nulls are allowed in DB if not constrained, but here we want them.
                // We'll separate items with sap_code from items without.
            }
        })

        const itemsWithCode = Array.from(uniqueMap.values())
        const itemsWithoutCode = validRows.filter(r => !r.sap_code)

        validRows = [...itemsWithCode, ...itemsWithoutCode]

        if (validRows.length === 0) {
            notify.warning('No hay filas válidas para importar')
            return
        }

        try {
            setImporting(true)

            // Call service to batch create
            await masterProductService.createBulk(validRows)

            notify.success(`${validRows.length} productos importados correctamente`)
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
                            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                            Importación Masiva de Productos
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Carga productos desde Excel validando tipos y datos obligatorios.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

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
                                                <th className="px-4 py-3">Item</th>
                                                <th className="px-4 py-3">Tipo</th>
                                                <th className="px-4 py-3">Observaciones</th>
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
                                                        {item.data.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                                        {item.data.type_id ? types.find(t => t.id === item.data.type_id)?.name : '-'}
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
                                                                Listo Importar
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
                        disabled={importing || summary.valid === 0}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
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

export default MasterProductImportModal
