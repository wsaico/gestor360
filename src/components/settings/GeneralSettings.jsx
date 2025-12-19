import { useState, useEffect } from 'react'
import supabase from '@services/supabase'
import { useNotification } from '@contexts/NotificationContext'
import { Building2, Save, Globe } from 'lucide-react'

const GeneralSettings = () => {
    const { notify } = useNotification()
    const [settings, setSettings] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [uploadingLogo, setUploadingLogo] = useState(false)

    useEffect(() => {
        fetchSettings()
    }, [])

    const handleLogoUpload = async (event) => {
        try {
            setUploadingLogo(true)
            const file = event.target.files[0]
            if (!file) return

            const fileExt = file.name.split('.').pop()
            const fileName = `company_logo_${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            // Upload to 'settings' bucket (assuming it exists or public)
            const { data, error: uploadError } = await supabase.storage
                .from('settings')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('settings')
                .getPublicUrl(filePath)

            // Update state and DB
            handleUpdateSetting('COMPANY_LOGO_URL', publicUrl)

            // Upsert immediately to save the new logo
            await supabase.from('app_settings').upsert({
                key: 'COMPANY_LOGO_URL',
                value: publicUrl,
                updated_at: new Date()
            })

            notify.success('Logo actualizado correctamente')
        } catch (error) {
            console.error('Error uploading logo:', error)
            notify.error('Error al subir logo: ' + error.message)
        } finally {
            setUploadingLogo(false)
        }
    }

    const fetchSettings = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('app_settings')
                .select('*')
                .order('key')

            if (error) throw error
            setSettings(data || [])
        } catch (error) {
            console.error('Error fetching settings:', error)
            notify.error('Error al cargar configuración')
        } finally {
            setLoading(false)
        }
    }

    const getSetting = (key) => {
        const val = settings.find(s => s.key === key)?.value || ''
        // Clean up quotes for display if it's a string
        if (typeof val === 'string' && (key === 'CURRENCY_SYMBOL' || key === 'CURRENCY_CODE')) {
            return val.replace(/['"]+/g, '')
        }
        return val
    }

    // Helper boolean
    const isEnabled = (key) => {
        const val = getSetting(key)
        return val === 'true' || val === true
    }

    const handleUpdateSetting = (key, newValue) => {
        const existing = settings.find(s => s.key === key)
        if (existing) {
            setSettings(prev => prev.map(s => s.key === key ? { ...s, value: newValue } : s))
        } else {
            // Create logic if not exists in state (but ideally keys should be pre-seeded)
            setSettings(prev => [...prev, { key, value: newValue }])
        }
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            // Upsert modified settings
            const updates = settings.map(setting => ({
                key: setting.key,
                value: setting.value,
                updated_at: new Date()
            }))

            const { error } = await supabase
                .from('app_settings')
                .upsert(updates)

            if (error) throw error
            notify.success('Configuración general guardada')
        } catch (error) {
            console.error('Error saving:', error)
            notify.error('Error al guardar cambios')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configuración General</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Información básica de la empresa, reportes y configuración regional.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary inline-flex items-center space-x-2"
                >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
            </div>

            <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-primary-600" />
                    Identidad Corporativa
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Logo Section */}
                    <div className="col-span-1 md:col-span-2">
                        <label className="label mb-2">Logotipo de la Empresa</label>
                        <div className="flex items-center space-x-6">
                            <div className="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900 relative">
                                {getSetting('COMPANY_LOGO_URL') ? (
                                    <img
                                        src={getSetting('COMPANY_LOGO_URL')}
                                        alt="Logo"
                                        className="w-full h-full object-contain p-2"
                                    />
                                ) : (
                                    <span className="text-xs text-center text-gray-400 p-2">Sin Logo</span>
                                )}
                                {uploadingLogo && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 max-w-md">
                                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Subir nuevo logo</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    disabled={uploadingLogo}
                                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">SVG, PNG, JPG (Recomendado fondo transparente).</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="label">Razón Social</label>
                        <input
                            type="text"
                            value={getSetting('COMPANY_NAME')}
                            onChange={(e) => handleUpdateSetting('COMPANY_NAME', e.target.value)}
                            className="input"
                            placeholder="Ej: Servicios Aeroportuarios S.A.C."
                        />
                    </div>

                    <div>
                        <label className="label">RUC</label>
                        <input
                            type="text"
                            value={getSetting('COMPANY_RUC')}
                            onChange={(e) => handleUpdateSetting('COMPANY_RUC', e.target.value)}
                            className="input"
                            placeholder="Ej: 20100000001"
                        />
                    </div>

                    <div>
                        <label className="label">Domicilio Fiscal</label>
                        <input
                            type="text"
                            value={getSetting('COMPANY_ADDRESS')}
                            onChange={(e) => handleUpdateSetting('COMPANY_ADDRESS', e.target.value)}
                            className="input"
                            placeholder="Av. Principal 123 - Lima"
                        />
                    </div>

                    <div>
                        <label className="label">Actividad Económica</label>
                        <input
                            type="text"
                            value={getSetting('COMPANY_ACTIVITY')}
                            onChange={(e) => handleUpdateSetting('COMPANY_ACTIVITY', e.target.value)}
                            className="input"
                            placeholder="Ej: Servicios de Carga"
                        />
                    </div>
                </div>
            </div>

            {/* PDF Report Configuration */}
            <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                    <Save className="w-5 h-5 mr-2 text-primary-600" />
                    Formato de Reportes (Actas de Entrega)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="label">Código Documento</label>
                        <input
                            type="text"
                            value={getSetting('REPORT_CODE')}
                            onChange={(e) => handleUpdateSetting('REPORT_CODE', e.target.value)}
                            className="input"
                            placeholder="Ej: FOR-OPE-001"
                        />
                    </div>
                    <div>
                        <label className="label">Versión</label>
                        <input
                            type="text"
                            value={getSetting('REPORT_VERSION')}
                            onChange={(e) => handleUpdateSetting('REPORT_VERSION', e.target.value)}
                            className="input"
                            placeholder="Ej: 5"
                        />
                    </div>
                    <div>
                        <label className="label">Fecha Emisión (Formato)</label>
                        <input
                            type="date"
                            value={getSetting('REPORT_DATE_EMISSION')}
                            onChange={(e) => handleUpdateSetting('REPORT_DATE_EMISSION', e.target.value)}
                            className="input"
                        />
                    </div>
                </div>

                <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-4">
                    <label className="flex items-center space-x-3 mb-2">
                        <input
                            type="checkbox"
                            checked={isEnabled('REPORT_AUTO_EMPLOYEE_COUNT')}
                            onChange={() => handleUpdateSetting('REPORT_AUTO_EMPLOYEE_COUNT', !isEnabled('REPORT_AUTO_EMPLOYEE_COUNT') ? 'true' : 'false')}
                            className="form-checkbox h-5 w-5 text-primary-600 rounded border-gray-300"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Contar empleados automáticamente</span>
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 ml-8">
                        Si se activa, el reporte mostrará el total de empleados activos en el sistema.
                    </p>

                    {!isEnabled('REPORT_AUTO_EMPLOYEE_COUNT') && (
                        <div className="ml-8 max-w-xs">
                            <label className="label">Nro. Trabajadores Manual</label>
                            <input
                                type="number"
                                value={getSetting('REPORT_MANUAL_EMPLOYEE_COUNT')}
                                onChange={(e) => handleUpdateSetting('REPORT_MANUAL_EMPLOYEE_COUNT', e.target.value)}
                                className="input"
                                placeholder="Ej: 25"
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                    <Globe className="w-5 h-5 mr-2 text-primary-600" />
                    Configuración Regional
                </h3>

                <div className="max-w-md">
                    <label className="label">Zona Horaria Global</label>
                    <select
                        className="input"
                        value={getSetting('TIMEZONE') || 'America/Lima'}
                        onChange={(e) => handleUpdateSetting('TIMEZONE', e.target.value)}
                    >
                        <option value="America/Lima">America/Lima (GMT-5)</option>
                        <option value="America/Bogota">America/Bogota (GMT-5)</option>
                        <option value="America/New_York">America/New_York (GMT-5/4)</option>
                        <option value="UTC">UTC (GMT+0)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-2 rounded">
                        Nota: Cambiar la zona horaria afectará cómo se registran y muestran las fechas futuras en el sistema.
                    </p>
                </div>
            </div>

            {/* Inventory Configuration */}
            <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-primary-600" />
                    Configuración de Inventario
                </h3>

                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-gray-900 dark:text-white">
                                Valorización de Inventario
                            </label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Habilitar seguimiento de costos y precios unitarios en items y entregas.
                            </p>
                        </div>
                        <div className="flex items-center">
                            <button
                                onClick={() => handleUpdateSetting('INVENTORY_VALORIZATION_ENABLED', !getSetting('INVENTORY_VALORIZATION_ENABLED'))}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${getSetting('INVENTORY_VALORIZATION_ENABLED') ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${getSetting('INVENTORY_VALORIZATION_ENABLED') ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>

                    {getSetting('INVENTORY_VALORIZATION_ENABLED') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                            <div>
                                <label className="label">Moneda Principal</label>
                                <select
                                    className="input"
                                    value={getSetting('CURRENCY_CODE') || 'PEN'}
                                    onChange={(e) => {
                                        const code = e.target.value
                                        let symbol = 'S/'
                                        if (code === 'USD') symbol = '$'
                                        else if (code === 'EUR') symbol = '€'
                                        else if (code === 'MXN') symbol = '$'
                                        else if (code === 'COP') symbol = '$'
                                        else if (code === 'CLP') symbol = '$'

                                        handleUpdateSetting('CURRENCY_CODE', code)
                                        handleUpdateSetting('CURRENCY_SYMBOL', symbol)
                                    }}
                                >
                                    <option value="PEN">Soles (PEN)</option>
                                    <option value="USD">Dólares Americanos (USD)</option>
                                    <option value="EUR">Euros (EUR)</option>
                                    <option value="MXN">Pesos Mexicanos (MXN)</option>
                                    <option value="COP">Pesos Colombianos (COP)</option>
                                    <option value="CLP">Pesos Chilenos (CLP)</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Símbolo</label>
                                <input
                                    type="text"
                                    className="input bg-gray-50"
                                    value={getSetting('CURRENCY_SYMBOL') || 'S/'}
                                    readOnly
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default GeneralSettings
