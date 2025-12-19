import { useState, useEffect } from 'react'
import { X, Package, Info, DollarSign, MapPin, FileText, Calendar, User, Building, History } from 'lucide-react'
import {
    ASSET_CATEGORY_LABELS,
    ASSET_STATUS_LABELS,
    ASSET_CONDITION_LABELS,
    ACQUISITION_METHODS_LABELS
} from '@/utils/constants'
import assetService from '@/services/assetService' // Import service

const TABS = {
    GENERAL: 'GENERAL',
    TECHNICAL: 'TECHNICAL',
    FINANCIAL: 'FINANCIAL',
    LOCATION: 'LOCATION',
    DOCUMENTS: 'DOCUMENTS',
    HISTORY: 'HISTORY'
}

const TABS_LABELS = {
    GENERAL: 'Información General',
    TECHNICAL: 'Especificaciones',
    FINANCIAL: 'Financiera',
    LOCATION: 'Ubicación',
    DOCUMENTS: 'Documentos',
    HISTORY: 'Historial'
}

export default function AssetDetailModal({ isOpen, onClose, asset }) {
    const [activeTab, setActiveTab] = useState(TABS.GENERAL)
    const [history, setHistory] = useState([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    useEffect(() => {
        if (isOpen && asset && activeTab === TABS.HISTORY) {
            loadHistory()
        }
    }, [isOpen, asset, activeTab])

    const loadHistory = async () => {
        try {
            setLoadingHistory(true)
            const data = await assetService.getMovementHistory(asset.id)
            setHistory(data)
        } catch (error) {
            console.error('Error loading history:', error)
        } finally {
            setLoadingHistory(false)
        }
    }

    if (!isOpen || !asset) return null

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN'
        }).format(amount || 0)
    }

    const formatDate = (dateString) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleDateString('es-PE')
    }

    const calculateAge = (dateString) => {
        if (!dateString) return '-'
        const start = new Date(dateString)
        const end = new Date()

        let years = end.getFullYear() - start.getFullYear()
        let months = end.getMonth() - start.getMonth()

        if (months < 0) {
            years--
            months += 12
        }

        const parts = []
        if (years > 0) parts.push(`${years} año${years !== 1 ? 's' : ''}`)
        if (months > 0) parts.push(`${months} mes${months !== 1 ? 'es' : ''}`)
        if (years === 0 && months === 0) return 'Menos de 1 mes'

        return parts.join(', ')
    }

    // Helper to render a field value or a placeholder
    const Field = ({ label, value, icon: Icon }) => (
        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
                {Icon && <Icon className="w-4 h-4 text-gray-400" />}
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{label}</span>
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                {value || <span className="text-gray-400 italic">No especificado</span>}
            </div>
        </div>
    )

    const Section = ({ title, children }) => (
        <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <div className="w-1 h-4 bg-primary-500 rounded-full"></div>
                {title}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {children}
            </div>
        </div>
    )

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">

                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-md border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                                    {asset.asset_code}
                                </span>
                                {asset.inventory_code && (
                                    <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-md border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                                        {asset.inventory_code}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                                {asset.asset_name}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                {ASSET_CATEGORY_LABELS[asset.asset_category] || asset.asset_category}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 bg-white dark:bg-gray-800">
                    {Object.entries(TABS).map(([key, value]) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(value)}
                            className={`
                py-4 px-4 text-sm font-medium border-b-2 transition-all
                ${activeTab === value
                                    ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50/10 dark:bg-primary-900/10'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:border-gray-300'
                                }
              `}
                        >
                            <div className="flex items-center gap-2">
                                {key === 'GENERAL' && <FileText className="w-4 h-4" />}
                                {key === 'TECHNICAL' && <Package className="w-4 h-4" />}
                                {key === 'FINANCIAL' && <DollarSign className="w-4 h-4" />}
                                {key === 'LOCATION' && <MapPin className="w-4 h-4" />}
                                {key === 'DOCUMENTS' && <FileText className="w-4 h-4" />}
                                {key === 'HISTORY' && <History className="w-4 h-4" />}
                                {TABS_LABELS[key]}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-800">

                    {/* GENERAL */}
                    {activeTab === TABS.GENERAL && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            <Section title="Información Básica">
                                <Field label="Categoría" value={ASSET_CATEGORY_LABELS[asset.asset_category]} />
                                <Field label="Subcategoría" value={asset.asset_subcategory} />
                                <Field label="Marca" value={asset.brand} />
                                <Field label="Modelo" value={asset.model} />
                            </Section>

                            <Section title="Estado y Condición">
                                <Field label="Estado" value={ASSET_STATUS_LABELS[asset.status]} />
                                <Field label="Condición" value={ASSET_CONDITION_LABELS[asset.condition]} />
                            </Section>

                            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-100 dark:border-yellow-800/30">
                                <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Descripción</h4>
                                <p className="text-sm text-yellow-900/80 dark:text-yellow-100/80">
                                    {asset.description || 'Sin descripción'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TECHNICAL */}
                    {activeTab === TABS.TECHNICAL && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            <Section title="Identificadores Técnicos">
                                <Field label="Número de Serie" value={asset.serial_number} />
                                <Field label="IMEI" value={asset.imei} />
                                <Field label="Dirección MAC" value={asset.mac_address} />
                                <Field label="Dirección IP" value={asset.ip_address} />
                            </Section>

                            <Section title="Especificaciones de Hardware">
                                <Field label="Procesador" value={asset.specifications?.processor} />
                                <Field label="Memoria RAM" value={asset.specifications?.ram} />
                                <Field label="Almacenamiento" value={asset.specifications?.storage} />
                            </Section>

                            <Section title="Software y Licencias">
                                <Field label="Sistema Operativo" value={asset.specifications?.operating_system} />
                                <Field label="Licencia" value={asset.specifications?.license_key} />
                            </Section>
                        </div>
                    )}

                    {/* FINANCIAL */}
                    {activeTab === TABS.FINANCIAL && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-100 dark:border-green-800/30 text-center">
                                    <div className="text-xs text-green-600 dark:text-green-400 mb-1">VALOR DE ADQUISICIÓN</div>
                                    <div className="text-xl font-bold text-green-700 dark:text-green-300">
                                        {formatCurrency(asset.acquisition_value)}
                                    </div>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800/30 text-center">
                                    <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">VALOR RESIDUAL</div>
                                    <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                                        {formatCurrency(asset.residual_value)}
                                    </div>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-lg border border-purple-100 dark:border-purple-800/30 text-center">
                                    <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">VALOR ACTUAL</div>
                                    <div className="text-xl font-bold text-purple-700 dark:text-purple-300">
                                        {formatCurrency(asset.current_value)}
                                    </div>
                                </div>
                            </div>

                            <Section title="Detalles de Compra">
                                <Field label="Método de Adquisición" value={ACQUISITION_METHODS_LABELS[asset.acquisition_method]} />
                                <Field label="Fecha de Adquisición" value={formatDate(asset.acquisition_date)} icon={Calendar} />
                                <Field
                                    label="Tiempo de Uso"
                                    value={asset.acquisition_date ? calculateAge(asset.acquisition_date) : '-'}
                                    icon={History}
                                />
                                <Field label="Proveedor" value={asset.supplier} />
                                <Field label="Número de Factura" value={asset.invoice_number} />
                                <Field label="Orden de Compra" value={asset.purchase_order} />
                            </Section>

                            <Section title="Garantía y Depreciación">
                                <Field label="Meses de Garantía" value={asset.warranty_months ? `${asset.warranty_months} meses` : ''} />
                                <Field label="Vencimiento Garantía" value={formatDate(asset.warranty_expiry_date)} icon={Calendar} />
                                <Field label="Tasa de Depreciación" value={asset.depreciation_rate ? `${asset.depreciation_rate}%` : ''} />
                            </Section>
                        </div>
                    )}

                    {/* LOCATION */}
                    {activeTab === TABS.LOCATION && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            <Section title="Ubicación Actual">
                                <Field label="Estación" value={asset.station?.name} icon={Building} />
                                <Field label="Área" value={asset.area?.name} icon={MapPin} />
                                <Field label="Organización" value={asset.organization?.name} />
                                <Field label="Detalle Ubicación" value={asset.location_detail} />
                            </Section>

                            <Section title="Asignación">
                                <Field
                                    label="Empleado Responsable"
                                    value={asset.assigned_employee ? `${asset.assigned_employee.first_name} ${asset.assigned_employee.last_name}` : 'Sin asignar'}
                                    icon={User}
                                />
                                <Field
                                    label="DNI Responsable"
                                    value={asset.assigned_employee?.document_number}
                                />
                            </Section>
                        </div>
                    )}

                    {/* DOCUMENTS */}
                    {activeTab === TABS.DOCUMENTS && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                            {[
                                { label: 'Factura', url: asset.invoice_document },
                                { label: 'Garantía', url: asset.warranty_document },
                                { label: 'Manual', url: asset.manual_url },
                                { label: 'Foto', url: asset.photo_url }
                            ].map((doc, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600 shadow-sm">
                                            <FileText className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">{doc.label}</div>
                                            <div className="text-xs text-gray-500">{doc.url ? 'Documento adjunto disponible' : 'No adjuntado'}</div>
                                        </div>
                                    </div>
                                    {doc.url ? (
                                        <a
                                            href={doc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 text-xs font-medium bg-primary-50 text-primary-700 rounded-md hover:bg-primary-100 transition-colors"
                                        >
                                            Ver / Descargar
                                        </a>
                                    ) : (
                                        <span className="text-xs text-gray-400 px-3 py-1.5">No disponible</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* HISTORY */}
                    {activeTab === TABS.HISTORY && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            {loadingHistory ? (
                                <div className="text-center py-8 text-gray-500">Cargando historial...</div>
                            ) : history.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">No hay movimientos registrados</div>
                            ) : (
                                <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-8">
                                    {history.map((move, index) => (
                                        <div key={move.id || index} className="relative pl-8">
                                            {/* Timeline dot */}
                                            <span className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${move.movement_type === 'BAJA' ? 'bg-red-500' :
                                                move.movement_type === 'TRANSFERENCIA' ? 'bg-orange-500' :
                                                    move.movement_type === 'ASIGNACION' ? 'bg-blue-500' :
                                                        'bg-green-500'
                                                }`}></span>

                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-1">
                                                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                                                    {move.movement_type}
                                                </h4>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                                    {new Date(move.created_at).toLocaleString()}
                                                </span>
                                            </div>

                                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                                {move.notes || 'Sin observaciones'}
                                            </p>

                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded text-xs space-y-1 border border-gray-100 dark:border-gray-700">
                                                {move.performed_by_user && (
                                                    <div className="flex gap-2">
                                                        <span className="font-medium text-gray-700 dark:text-gray-300">Realizado por:</span>
                                                        <span className="text-gray-600 dark:text-gray-400">{move.performed_by_user.username}</span>
                                                    </div>
                                                )}

                                                {/* Logic to show transfer details if available */}
                                                {(move.from_station || move.to_station) && (
                                                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                        <div>
                                                            <div className="font-medium text-gray-500 mb-1">Origen</div>
                                                            <div>{move.from_station?.name || '-'}</div>
                                                            <div>{move.from_area?.name || '-'}</div>
                                                            <div>{move.from_employee?.full_name || '-'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-500 mb-1">Destino</div>
                                                            <div>{move.to_station?.name || '-'}</div>
                                                            <div>{move.to_area?.name || '-'}</div>
                                                            <div>{move.to_employee?.full_name || '-'}</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}
