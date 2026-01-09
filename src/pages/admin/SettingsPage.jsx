import { useState, useEffect } from 'react'
import supabase from '@services/supabase'
import areaService from '@services/areaService'
import { useAuth } from '@contexts/AuthContext'
import {
  Settings,
  Mail,
  Bell,
  Shield,
  Save,
  AlertCircle,
  Map,
  Plus,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react'

const SettingsPage = () => {
  const { station } = useAuth()
  const [activeTab, setActiveTab] = useState('notifications')

  // Settings State
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Areas State
  const [areas, setAreas] = useState([])
  const [loadingAreas, setLoadingAreas] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')
  const [creatingArea, setCreatingArea] = useState(false)

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

      // Save to settings
      await handleUpdateSetting('COMPANY_LOGO_URL', publicUrl)
      // Save immediately to DB to ensure persistence
      await supabase.from('app_settings').upsert({
        key: 'COMPANY_LOGO_URL',
        value: publicUrl,
        updated_at: new Date()
      })

      alert('Logo subido correctamente')
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert('Error al subir logo: ' + error.message)
    } finally {
      setUploadingLogo(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'areas' && station?.id) {
      fetchAreas()
    }
  }, [activeTab, station?.id])

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
    } finally {
      setLoading(false)
    }
  }

  const fetchAreas = async () => {
    try {
      setLoadingAreas(true)
      const data = await areaService.getAll(station.id)
      setAreas(data)
    } catch (error) {
      console.error('Error fetching areas:', error)
      // Silent error or toast
    } finally {
      setLoadingAreas(false)
    }
  }

  const handleUpdateSetting = async (key, newValue) => {
    try {
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value: newValue } : s))
    } catch (error) {
      console.error(error)
    }
  }

  const saveAllSettings = async () => {
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
      alert('Configuración guardada correctamente')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error al guardar: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Area Handlers
  const handleCreateArea = async (e) => {
    e.preventDefault()
    if (!newAreaName.trim()) return

    try {
      setCreatingArea(true)
      await areaService.create({
        station_id: station.id,
        name: newAreaName.trim().toUpperCase()
      })
      setNewAreaName('')
      await fetchAreas()
      alert('Área creada correctamente')
    } catch (error) {
      console.error('Error creating area:', error)
      alert(error.message)
    } finally {
      setCreatingArea(false)
    }
  }

  const handleToggleArea = async (area) => {
    try {
      await areaService.toggleActive(area.id, !area.is_active)
      await fetchAreas()
    } catch (error) {
      console.error('Error updating area:', error)
      alert('Error al actualizar el área')
    }
  }

  // Helper para renders
  const getSetting = (key) => settings.find(s => s.key === key)?.value || ''
  const isEnabled = (key) => getSetting(key) === 'true'

  const toggleSetting = (key) => {
    const current = isEnabled(key)
    handleUpdateSetting(key, current ? 'false' : 'true')
  }

  if (loading) return <div className="p-8 text-center">Cargando configuración...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p className="text-gray-600 mt-1">Gestión de alertas, áreas y parámetros globales</p>
        </div>
        {activeTab !== 'areas' && (
          <button
            onClick={saveAllSettings}
            disabled={saving}
            className="btn btn-primary inline-flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`${activeTab === 'notifications' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Mail className="w-4 h-4 mr-2" />
            Servidor de Correo
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`${activeTab === 'alerts' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Bell className="w-4 h-4 mr-2" />
            Tipos de Alerta
          </button>
          <button
            onClick={() => setActiveTab('areas')}
            className={`${activeTab === 'areas' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Map className="w-4 h-4 mr-2" />
            Gestión de Áreas
          </button>
          <button
            onClick={() => setActiveTab('customization')}
            className={`${activeTab === 'customization' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Settings className="w-4 h-4 mr-2" />
            Personalización
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`${activeTab === 'security' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Shield className="w-4 h-4 mr-2" />
            Seguridad
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="card space-y-6">

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Configuración SMTP (Brevo)</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Ingresa aquí tu API Key de Brevo. Esta llave se guardará de forma segura y será usada por el servidor para enviar los correos.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brevo API Key (v3)</label>
                <div className="relative">
                  <input
                    type="password"
                    value={getSetting('BREVO_API_KEY')}
                    onChange={(e) => handleUpdateSetting('BREVO_API_KEY', e.target.value)}
                    className="input w-full pr-10"
                    placeholder="xkeysib-..."
                  />
                  <Shield className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Clave secreta. No compartir.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Remitente (Sender Email)</label>
                <input
                  type="email"
                  value={getSetting('SMTP_SENDER_EMAIL')}
                  onChange={(e) => handleUpdateSetting('SMTP_SENDER_EMAIL', e.target.value)}
                  className="input w-full"
                  placeholder="notificaciones@tuempresa.com"
                />
                <p className="text-xs text-gray-500 mt-1">Debe ser un remitente verificado en Brevo.</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => alert('Función de prueba pendiente de backend')}
              >
                Enviar correo de prueba
              </button>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Sistema Global de Notificaciones</h3>
                <p className="text-sm text-gray-500">Interruptor maestro. Si se apaga, no se envía NADA.</p>
              </div>
              <button
                onClick={() => toggleSetting('ENABLE_NOTIFICATIONS_GLOBAL')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isEnabled('ENABLE_NOTIFICATIONS_GLOBAL') ? 'bg-primary-600' : 'bg-gray-200'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled('ENABLE_NOTIFICATIONS_GLOBAL') ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Alertas Específicas</h4>
              <div className="space-y-4">
                {[
                  { key: 'ENABLE_ALERT_BIRTHDAYS', label: 'Cumpleaños', desc: 'Avisar cumpleaños del día y próximos 7 días' },
                  { key: 'ENABLE_ALERT_EMO', label: 'Exámenes Médicos (EMO)', desc: 'Avisar vencimientos de exámenes médicos' },
                  { key: 'ENABLE_ALERT_PHOTOCHECK', label: 'Fotochecks', desc: 'Avisar vencimientos de fotochecks' },
                  { key: 'ENABLE_ALERT_EPPS', label: 'Renovaciones EPP', desc: 'Avisar entregas de EPP/Uniformes por vencer' },
                  { key: 'ENABLE_ALERT_LOW_STOCK', label: 'Stock Bajo', desc: 'Avisar cuando el inventario cruza el mínimo permitido' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-3">
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-gray-900">{item.label}</h5>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                    <button
                      disabled={!isEnabled('ENABLE_NOTIFICATIONS_GLOBAL')}
                      onClick={() => toggleSetting(item.key)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isEnabled(item.key) ? 'bg-green-500' : 'bg-gray-200'} ${!isEnabled('ENABLE_NOTIFICATIONS_GLOBAL') ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled(item.key) ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'areas' && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Gestión de Áreas Operativas</h3>
              <p className="text-sm text-gray-600">
                Define las áreas de tu estación (Ej: RAMPA, PAX, OMA). Estas áreas se usarán para clasificar inventario y empleados.
              </p>
            </div>

            {/* Create Area Form */}
            <form onSubmit={handleCreateArea} className="flex gap-4 items-end">
              <div className="flex-1 max-w-sm">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Área</label>
                <input
                  type="text"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  className="input w-full"
                  placeholder="Ej: ALMACÉN GENERAL"
                  disabled={creatingArea}
                />
              </div>
              <button
                type="submit"
                disabled={creatingArea || !newAreaName.trim()}
                className="btn btn-primary h-[42px] inline-flex items-center"
              >
                {creatingArea ? 'Creando...' : <><Plus className="w-4 h-4 mr-2" /> Agregar</>}
              </button>
            </form>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadingAreas ? (
                    <tr>
                      <td colSpan="3" className="px-6 py-8 text-center text-gray-500">Cargando áreas...</td>
                    </tr>
                  ) : areas.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-6 py-8 text-center text-gray-500">No hay áreas registradas</td>
                    </tr>
                  ) : (
                    areas.map((area) => (
                      <tr key={area.id}>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-900">{area.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${area.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {area.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <button
                            onClick={() => handleToggleArea(area)}
                            className={`text-sm hover:underline ${area.is_active ? 'text-red-600' : 'text-green-600'}`}
                          >
                            {area.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'customization' && (
          <div className="space-y-8">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Personalización de Formatos</h3>
              <p className="text-sm text-gray-600">
                Configura la apariencia y los datos que aparecen en tus reportes PDF (Actas de Entrega, Inspecciones, etc).
                Estos datos se reflejan automáticamente en los documentos generados.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Columna Izquierda: Identidad Corporativa */}
              <div className="space-y-6">
                <h4 className="text-md font-bold text-gray-900 border-b pb-2 flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Identidad Corporativa
                </h4>

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logotipo de la Empresa</label>
                  <div className="flex items-center space-x-4">
                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-white">
                      {getSetting('COMPANY_LOGO_URL') ? (
                        <img src={getSetting('COMPANY_LOGO_URL')} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xs text-center text-gray-400 p-2">Sin Logo</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="block w-full text-sm text-gray-500
                             file:mr-4 file:py-2 file:px-4
                             file:rounded-full file:border-0
                             file:text-sm file:font-semibold
                             file:bg-primary-50 file:text-primary-700
                             hover:file:bg-primary-100
                           "
                      />
                      <p className="text-xs text-gray-500 mt-2">Recomendado: 200x200px, Fondo Transparente (PNG).</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                  <input
                    type="text"
                    value={getSetting('COMPANY_NAME')}
                    onChange={(e) => handleUpdateSetting('COMPANY_NAME', e.target.value)}
                    className="input w-full"
                    placeholder="Ej: Mi Empresa S.A.C."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RUC</label>
                  <input
                    type="text"
                    value={getSetting('COMPANY_RUC')}
                    onChange={(e) => handleUpdateSetting('COMPANY_RUC', e.target.value)}
                    className="input w-full"
                    placeholder="Ej: 20123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domicilio Fiscal</label>
                  <input
                    type="text"
                    value={getSetting('COMPANY_ADDRESS')}
                    onChange={(e) => handleUpdateSetting('COMPANY_ADDRESS', e.target.value)}
                    className="input w-full"
                    placeholder="Ej: Av. Principal 123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Actividad Económica</label>
                  <input
                    type="text"
                    value={getSetting('COMPANY_ACTIVITY')}
                    onChange={(e) => handleUpdateSetting('COMPANY_ACTIVITY', e.target.value)}
                    className="input w-full"
                    placeholder="Ej: Servicios Generales"
                  />
                </div>
              </div>

              {/* Columna Derecha: Formato de Reporte */}
              <div className="space-y-6">
                <h4 className="text-md font-bold text-gray-900 border-b pb-2 flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Formato: Acta de Entrega
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código Documento</label>
                    <input
                      type="text"
                      value={getSetting('REPORT_CODE')}
                      onChange={(e) => handleUpdateSetting('REPORT_CODE', e.target.value)}
                      className="input w-full"
                      placeholder="Ej: FOR-SST-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Versión</label>
                    <input
                      type="text"
                      value={getSetting('REPORT_VERSION')}
                      onChange={(e) => handleUpdateSetting('REPORT_VERSION', e.target.value)}
                      className="input w-full"
                      placeholder="Ej: 5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Emisión (del formato)</label>
                  <input
                    type="date"
                    value={getSetting('REPORT_DATE_EMISSION')}
                    onChange={(e) => handleUpdateSetting('REPORT_DATE_EMISSION', e.target.value)}
                    className="input w-full"
                  />
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <label className="flex items-center space-x-3 mb-3">
                    <input
                      type="checkbox"
                      checked={isEnabled('REPORT_AUTO_EMPLOYEE_COUNT')}
                      onChange={() => toggleSetting('REPORT_AUTO_EMPLOYEE_COUNT')}
                      className="form-checkbox h-5 w-5 text-primary-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Contar empleados automáticamente</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-3 ml-8">Si se activa, usará el total de empleados registrados en el sistema.</p>

                  {!isEnabled('REPORT_AUTO_EMPLOYEE_COUNT') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nro. Trabajadores Manual</label>
                      <input
                        type="number"
                        value={getSetting('REPORT_MANUAL_EMPLOYEE_COUNT')}
                        onChange={(e) => handleUpdateSetting('REPORT_MANUAL_EMPLOYEE_COUNT', e.target.value)}
                        className="input w-full"
                        placeholder="Ej: 25"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-amber-50 p-4 rounded-lg flex items-start space-x-3">
              <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900">Políticas de Acceso Público</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Controla quién puede acceder y crear cuentas en tu plataforma. Activar el registro público permite que cualquier persona con el link se una como Operador.
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Registro Autónomo de Usuarios</h3>
                  <p className="text-sm text-gray-500">Permitir que nuevos usuarios creen sus propias cuentas desde el login.</p>
                </div>
                <button
                  onClick={() => toggleSetting('ENABLE_PUBLIC_REGISTRATION')}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isEnabled('ENABLE_PUBLIC_REGISTRATION') ? 'bg-primary-600' : 'bg-gray-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled('ENABLE_PUBLIC_REGISTRATION') ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl mt-4 border border-gray-100">
                <h5 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-primary-500" /> Nota de Configuración
                </h5>
                <ul className="text-xs text-gray-500 space-y-2 list-disc ml-4">
                  <li>Los nuevos usuarios registrados tendrán el rol de <b>OPERADOR</b> por defecto.</li>
                  <li>Deberás asignarles una estación manualmente después de que se registren.</li>
                  <li>Puedes desactivar esta opción en cualquier momento para bloquear nuevos registros.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default SettingsPage
