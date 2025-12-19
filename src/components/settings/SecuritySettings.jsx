import { useState, useEffect } from 'react'
import { Shield, Users, Lock, Check, X, UserCog, Edit2 } from 'lucide-react'
import systemUserService from '@services/systemUserService'
import { ROLES } from '@utils/constants'

// Static Permissions Matrix for display/reference
const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: { label: 'Administrador', access: ['Todo el sistema', 'Gestión de Usuarios', 'Configuración Global', 'Eliminar Registros'] },
    [ROLES.SUPERVISOR]: { label: 'Supervisor', access: ['Gestión de Activos', 'Gestión de Personal', 'Reportes', 'Aprobar Solicitudes'] },
    [ROLES.MONITOR]: { label: 'Monitor', access: ['Ver Inventario', 'Ver Personal', 'Reportes Básicos'] },
    [ROLES.PROVIDER]: { label: 'Proveedor', access: ['Ver sus asignaciones', 'Gestionar entregas asignadas'] }
}

const SecuritySettings = () => {
    const [activeTab, setActiveTab] = useState('USERS') // USERS | ROLES
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [showModal, setShowModal] = useState(false)

    useEffect(() => {
        if (activeTab === 'USERS') {
            fetchUsers()
        }
    }, [activeTab])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const data = await systemUserService.getAll()
            setUsers(data)
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateRole = async (userId, newRole) => {
        try {
            await systemUserService.update(userId, { role: newRole })
            // Update local state
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
            alert('Rol actualizado correctamente')
        } catch (error) {
            alert('Error al actualizar rol: ' + error.message)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Seguridad y Permisos</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Gestiona los usuarios del sistema y sus niveles de acceso.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setActiveTab('USERS')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'USERS'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    <Users className="w-4 h-4" />
                    Gestión de Usuarios
                </button>
                <button
                    onClick={() => setActiveTab('ROLES')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'ROLES'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    <Shield className="w-4 h-4" />
                    Definición de Roles
                </button>
            </div>

            {/* USER MANAGEMENT TAB */}
            {activeTab === 'USERS' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol Actual</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">Cargando usuarios...</td>
                                    </tr>
                                ) : users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                                    <UserCog className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                                className="text-xs font-semibold rounded-full px-2 py-1 bg-blue-50 text-blue-700 border-none focus:ring-2 focus:ring-blue-500 cursor-pointer dark:bg-blue-900/30 dark:text-blue-300"
                                            >
                                                {Object.values(ROLES).map(role => (
                                                    <option key={role} value={role}>{role}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                }`}>
                                                {user.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ROLES DEFINITION TAB */}
            {activeTab === 'ROLES' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(ROLE_PERMISSIONS).map(([role, details]) => (
                        <div key={role} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{details.label}</h3>
                                    <code className="text-xs text-gray-500">{role}</code>
                                </div>
                            </div>
                            <ul className="space-y-2">
                                {details.access.map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                        <Check className="w-4 h-4 text-green-500" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-6 flex flex-col items-center justify-center text-center">
                        <PlusRoleIcon className="w-12 h-12 text-gray-300 mb-2" />
                        <h3 className="font-medium text-gray-900 dark:text-white">Personalizar Roles</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            La creación de roles personalizados estará disponible en una próxima actualización.
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}

// Icon helper
const PlusRoleIcon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
)

export default SecuritySettings
