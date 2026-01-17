import { useState, useEffect } from 'react'
import { UserCog, Plus, Search, Edit2, Trash2, Shield, Factory } from 'lucide-react'
import systemUserService from '@services/systemUserService'
import stationService from '@services/stationService'
import appRoleService from '@services/appRoleService'
// import { ROLES } from '@utils/constants' // Deprecated for dropdown

const SystemUsersPage = () => {
  const [users, setUsers] = useState([])
  const [stations, setStations] = useState([])
  const [rolesList, setRolesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [usersData, stationsData, rolesData] = await Promise.all([
        systemUserService.getAll(),
        stationService.getAll(true), // Include inactive
        appRoleService.getAll()
      ])
      setUsers(usersData)
      setStations(stationsData)
      setRolesList(rolesData)
    } catch (error) {
      console.error('Error loading data:', error)
      alert('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de eliminar este usuario?')) return
    try {
      await systemUserService.delete(id)
      setUsers(users.filter(u => u.id !== id))
      alert('Usuario eliminado')
    } catch (error) {
      alert(error.message)
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setShowModal(true)
  }

  const handleNew = () => {
    setEditingUser(null)
    setShowModal(true)
  }

  const handleSuccess = () => {
    setShowModal(false)
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usuarios del Sistema</h1>
          <p className="text-gray-600 mt-1">Gestión de accesos y roles (Admin, Supervisor, Proveedor)</p>
        </div>
        <button
          onClick={handleNew}
          className="btn btn-primary btn-md mt-4 sm:mt-0 inline-flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estación Asignada</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                        <UserCog className="w-6 h-6" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.station ? (
                      <div className="flex items-center text-sm text-gray-900">
                        <Factory className="w-4 h-4 mr-1 text-gray-400" />
                        {user.station.name}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Global / N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(user)} className="text-primary-600 hover:text-primary-900 mr-3">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <UserModal
          user={editingUser}
          stations={stations}
          rolesList={rolesList}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}

const UserModal = ({ user, stations, rolesList, onClose, onSuccess }) => {
  const isEdit = !!user
  // Default to first role or empty if available, fallback to 'PROVIDER' only if list empty (unlikely)
  const defaultRole = rolesList.length > 0 ? rolesList[0].name : 'PROVIDER'

  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    password: '', // Only for creation or change
    role: user?.role || defaultRole,
    station_id: user?.station_id || '',
    is_active: user?.is_active ?? true
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...formData }
      if (isEdit && !payload.password) delete payload.password

      if (isEdit) {
        await systemUserService.update(user.id, payload)
      } else {
        await systemUserService.create(payload)
      }
      onSuccess()
    } catch (error) {
      console.error(error)
      alert(error.message || 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl animate-fadeIn border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
            <p className="text-sm text-gray-500 mt-1">Complete los datos de acceso y roles del usuario</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <span className="sr-only">Cerrar</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna 1: Información Personal */}
            <div className="space-y-5">
              <h4 className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                <UserCog className="w-4 h-4" /> Información Personal
              </h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre Completo</label>
                <input
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Ej. Juan Perez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo Electrónico</label>
                <input
                  required
                  type="email"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="usuario@gestor360.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {isEdit ? 'Nueva Contraseña' : 'Contraseña'}
                  {isEdit && <span className="text-xs font-normal text-gray-400 ml-2">(Opcional)</span>}
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-mono text-sm"
                  required={!isEdit}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Columna 2: Acceso y Roles */}
            <div className="space-y-5">
              <h4 className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Permisos y Acceso
              </h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Rol del Sistema</label>
                <div className="relative">
                  <select
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all appearance-none cursor-pointer hover:border-gray-300"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                  >
                    {rolesList.map(role => (
                      <option key={role.id} value={role.name}>{role.label}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-1.5 leading-tight">
                  Define qué partes del sistema puede ver y modificar este usuario.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Estación Asignada</label>
                <div className="relative">
                  <select
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all appearance-none cursor-pointer hover:border-gray-300"
                    value={formData.station_id}
                    onChange={e => setFormData({ ...formData, station_id: e.target.value })}
                  >
                    <option value="">🌐 Acceso Global (Todas las estaciones)</option>
                    <option disabled className="text-xs bg-gray-50">──────────</option>
                    {stations.map(st => (
                      <option key={st.id} value={st.id}>🏢 {st.name}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-1.5 leading-tight text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 mt-2">
                  <span className="font-bold">Nota:</span> Si seleccionas una estación, el usuario SOLO verá datos de esa ubicación. El acceso "Global" es exclusivo para Super Admins y Auditores.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <label className="flex items-center cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${formData.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.is_active ? 'transform translate-x-4' : ''}`}></div>
              </div>
              <span className={`ml-3 text-sm font-medium transition-colors ${formData.is_active ? 'text-gray-900' : 'text-gray-500'}`}>
                {formData.is_active ? 'Usuario Habilitado' : 'Usuario Deshabilitado'}
              </span>
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors focus:ring-2 focus:ring-gray-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-medium rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-wait transform active:scale-95"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Procesando...
                  </span>
                ) : (
                  'Guardar Usuario'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SystemUsersPage
