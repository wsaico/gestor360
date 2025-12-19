import { useState, useEffect } from 'react'
import supabase from '@services/supabase'
import { useNotification } from '@contexts/NotificationContext'
import { AlertCircle, Shield, Bell, Save } from 'lucide-react'

const NotificationSettings = () => {
    const { notify } = useNotification()

    const [settings, setSettings] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchSettings()
    }, [])

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

    const getSetting = (key) => settings.find(s => s.key === key)?.value || ''
    const isEnabled = (key) => getSetting(key) === 'true'

    const handleUpdateSetting = (key, newValue) => {
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value: newValue } : s))
    }

    const toggleSetting = (key) => {
        const current = isEnabled(key)
        handleUpdateSetting(key, current ? 'false' : 'true')
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            const updates = settings.map(setting => ({
                key: setting.key,
                value: setting.value,
                updated_at: new Date()
            }))

            const { error } = await supabase
                .from('app_settings')
                .upsert(updates)

            if (error) throw error
            notify.success('Configuración guardada correctamente')
        } catch (error) {
            console.error('Error saving settings:', error)
            notify.error('Error al guardar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="text-center py-8">Cargando configuración...</div>

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notificaciones y Alertas</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Gestiona el servidor de correos y las alertas automáticas del sistema.
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

            {/* SMTP API Section */}
            <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-primary-600" />
                    Configuración del Servidor de Correo (SMTP/API)
                </h3>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-start space-x-3 mb-6">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-200">Integración con Brevo</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            Ingresa tu API Key de Brevo. Esta llave se usa para enviar todos los correos transaccionales (alertas, recuperaciones, etc).
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 max-w-2xl">
                    <div>
                        <label className="label">Brevo API Key (v3)</label>
                        <div className="relative">
                            <input
                                type="password"
                                value={getSetting('BREVO_API_KEY')}
                                onChange={(e) => handleUpdateSetting('BREVO_API_KEY', e.target.value)}
                                className="input pr-10"
                                placeholder="xkeysib-..."
                            />
                            <Shield className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                        </div>
                    </div>

                    <div>
                        <label className="label">Correo Remitente (Sender Email)</label>
                        <input
                            type="email"
                            value={getSetting('SMTP_SENDER_EMAIL')}
                            onChange={(e) => handleUpdateSetting('SMTP_SENDER_EMAIL', e.target.value)}
                            className="input"
                            placeholder="no-reply@tuempresa.com"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Debe ser un dominio verificado en tu proveedor de correo.</p>
                    </div>
                </div>
            </div>

            {/* Alert Toggles */}
            <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                        <Bell className="w-5 h-5 mr-2 text-primary-600" />
                        Tipos de Alerta Activos
                    </h3>

                    <div className="flex items-center">
                        <span className="mr-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {isEnabled('ENABLE_NOTIFICATIONS_GLOBAL') ? 'Sistema Activado' : 'Sistema Pausado'}
                        </span>
                        <button
                            onClick={() => toggleSetting('ENABLE_NOTIFICATIONS_GLOBAL')}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isEnabled('ENABLE_NOTIFICATIONS_GLOBAL') ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'}`}
                        >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled('ENABLE_NOTIFICATIONS_GLOBAL') ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>

                <div className="space-y-4 divide-y divide-gray-100 dark:divide-gray-700">
                    {[
                        { key: 'ENABLE_ALERT_BIRTHDAYS', label: 'Cumpleaños', desc: 'Avisar cumpleaños del día y próximos 7 días' },
                        { key: 'ENABLE_ALERT_EMO', label: 'Exámenes Médicos (EMO)', desc: 'Avisar vencimientos de exámenes médicos' },
                        { key: 'ENABLE_ALERT_PHOTOCHECK', label: 'Fotochecks', desc: 'Avisar vencimientos de fotochecks' },
                        { key: 'ENABLE_ALERT_EPPS', label: 'Renovaciones EPP', desc: 'Avisar entregas de EPP/Uniformes por vencer' },
                        { key: 'ENABLE_ALERT_LOW_STOCK', label: 'Stock Bajo', desc: 'Avisar cuando el inventario cruza el mínimo permitido' },
                    ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between py-3">
                            <div className="flex-1 pr-4">
                                <h5 className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</h5>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                            </div>
                            <button
                                disabled={!isEnabled('ENABLE_NOTIFICATIONS_GLOBAL')}
                                onClick={() => toggleSetting(item.key)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none 
                  ${isEnabled(item.key) ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'} 
                  ${!isEnabled('ENABLE_NOTIFICATIONS_GLOBAL') ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                            >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled(item.key) ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default NotificationSettings
