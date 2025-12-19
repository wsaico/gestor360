import { useState, useEffect } from 'react'
import { UserCog, Plus, Search, Edit2, Trash2, Shield, Factory } from 'lucide-react'
import systemUserService from '@services/systemUserService'
import stationService from '@services/stationService'
import { ROLES } from '@utils/constants'

const SystemUsersPage = () => {
  const [users, setUsers] = useState([])
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [usersData, stationsData] = await Promise.all([
        systemUserService.getAll(),
        stationService.getAll(true) // Include inactive
      ])
      setUsers(usersData)
      setStations(stationsData)
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
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}

const UserModal = ({ user, stations, onClose, onSuccess }) => {
  const isEdit = !!user
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    password: '', // Only for creation or change
    role: user?.role || ROLES.PROVIDER,
    station_id: user?.station_id || '',
    is_active: user?.is_active ?? true
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...formData }
      // Remove empty password if editing
      if (isEdit && !payload.password) delete payload.password
      // Hashear password idealmente se hace en backend. Aqui simulamos o mandamos raw temporalmente.
      // Para el propósito de este demo, asumimos que el backend maneja el hash o lo mandamos así.
      // NOTA IMPORTANTE: En producción usar Auth de Supabase real.
      // Aquí vamos a simular hash simple si es nuevo
      // Enviar password raw al servicio para que pueda crear el usuario en Supabase Auth
      // El servicio se encargará de gestionar el hash para la tabla system_users si es necesario

      if (isEdit) {
        await systemUserService.update(user.id, payload)
      } else {
        await systemUserService.create(payload)
      }
      onSuccess()
    } catch (error) {
      console.error(error)
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-bold mb-4">{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Usuario</label>
            <input
              required
              className="input"
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              required
              type="email"
              className="input"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">{isEdit ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}</label>
            <input
              type="password"
              className="input"
              required={!isEdit}
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Rol</label>
            <select
              className="input"
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
            >
              {Object.values(ROLES).map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Estación Asignada</label>
            <select
              className="input"
              value={formData.station_id}
              onChange={e => setFormData({ ...formData, station_id: e.target.value })}
            >
              <option value="">Sin estación (Global)</option>
              {stations.map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Requerido para Proveedores y Supervisores</p>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
              className="mr-2"
            />
            <label>Usuario Activo</label>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SystemUsersPage
