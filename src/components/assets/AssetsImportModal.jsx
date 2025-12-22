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
import assetService from '@/services/assetService'
import { useNotification } from '@/contexts/NotificationContext'
import {
    ASSET_CATEGORIES,
    ASSET_STATUS,
    ASSET_CONDITIONS
} from '@/utils/constants'

// Get valid values for validation
const VALID_CATEGORIES = Object.keys(ASSET_CATEGORIES)
const VALID_STATUSES = Object.keys(ASSET_STATUS)
const VALID_CONDITIONS = Object.keys(ASSET_CONDITIONS)

const AssetsImportModal = ({ isOpen, onClose, onSuccess, stationId }) => {
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
            'NOMBRE',           // Required
            'CATEGORIA',        // Required (Enum key)
            'CODIGO_ACTIVO',    // Optional (System generated if empty)
            'MARCA',            // Optional
            'MODELO',           // Optional
            'SERIE',            // Optional
            'ESTADO',           // Optional (Default: DISPONIBLE)
            'CONDICION',        // Optional (Default: NUEVO)
            'VALOR',            // Optional (Number)
            'FECHA_ADQUISICION' // Optional (YYYY-MM-DD)
        ]

        const sampleRow = [
            'Laptop Dell Latitude',
            'EQUIPOS_COMPUTO',
            'SST-EC-001',
            'Dell',
            'Latitude 5420',
            'ABC123XYZ',
            'DISPONIBLE',
            'NUEVO',
            '1500.00',
            new Date().toISOString().split('T')[0]
        ]

        const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow])

        // Set column widths
        ws['!cols'] = [
            { wch: 30 }, // NOMBRE
            { wch: 20 }, // CATEGORIA
            { wch: 15 }, // CODIGO
            { wch: 15 }, // MARCA
            { wch: 15 }, // MODELO
            { wch: 15 }, // SERIE
            { wch: 15 }, // ESTADO
            { wch: 15 }, // CONDICION
            { wch: 12 }, // VALOR
            { wch: 15 }  // FECHA
        ]

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Activos')
        XLSX.writeFile(wb, 'plantilla_carga_activos.xlsx')
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
        const idxCat = headers.indexOf('CATEGORIA')
        const idxCode = headers.indexOf('CODIGO_ACTIVO')
        const idxBrand = headers.indexOf('MARCA')
        const idxModel = headers.indexOf('MODELO')
        const idxSerial = headers.indexOf('SERIE')
        const idxStatus = headers.indexOf('ESTADO')
        const idxCond = headers.indexOf('CONDICION')
        const idxValue = headers.indexOf('VALOR')
        const idxDate = headers.indexOf('FECHA_ADQUISICION')

        if (idxName === -1 || idxCat === -1) {
            notify.error('Faltan columnas obligatorias: NOMBRE y CATEGORIA')
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
            const categoryRaw = row[idxCat] ? String(row[idxCat]).trim() : ''
            const statusRaw = row[idxStatus] ? String(row[idxStatus]).trim() : 'DISPONIBLE'
            const conditionRaw = row[idxCond] ? String(row[idxCond]).trim() : 'NUEVO'

            // Validation 1: Required Fields
            if (!name) errors.push('Falta Nombre')
            if (!categoryRaw) errors.push('Falta Categoría')

            // Validation 2: Enums
            if (categoryRaw && !VALID_CATEGORIES.includes(categoryRaw)) {
                // Try to be smart? For now strict.
                errors.push(`Categoría inválida: ${categoryRaw}`)
            }

            if (!VALID_STATUSES.includes(statusRaw)) {
                errors.push(`Estado inválido: ${statusRaw}`)
            }

            if (!VALID_CONDITIONS.includes(conditionRaw)) {
                errors.push(`Condición inválida: ${conditionRaw}`)
            }

            // Build data object
            const assetData = {
                station_id: stationId,
                asset_code: row[idxCode] || '', // If empty, service logic handles it or we might need auto-gen logic here
                asset_name: name,
                asset_category: categoryRaw,
                brand: row[idxBrand] || '',
                model: row[idxModel] || '',
                serial_number: row[idxSerial] || '',
                status: statusRaw,
                condition: conditionRaw,
                current_value: row[idxValue] ? parseFloat(row[idxValue]) || 0 : 0,
                acquisition_date: row[idxDate] || null,
                is_active: true
            }

            // Clean undefined
            if (!assetData.acquisition_date) delete assetData.acquisition_date
            if (!assetData.asset_code) delete assetData.asset_code

            const status = errors.length > 0 ? 'ERROR' : 'VALID'
            if (status === 'VALID') validCount++
            else invalidCount++

            processed.push({
                row: index + 2,
                data: assetData,
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
            await assetService.createBulk(validRows)

            notify.success(`${validRows.length} activos importados correctamente`)
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
                            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                            Importación Masiva de Activos
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Carga inventario de activos desde Excel.
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
                                                <th className="px-4 py-3">Activo</th>
                                                <th className="px-4 py-3">Categoría</th>
                                                <th className="px-4 py-3">Valor</th>
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
                                                        {item.data.asset_name}
                                                        <div className="text-xs text-slate-400">{item.data.brand || ''} {item.data.model || ''}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                                        {item.data.asset_category}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-slate-600">
                                                        {item.data.current_value}
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

export default AssetsImportModal
