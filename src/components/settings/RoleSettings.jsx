import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Shield, Check, Lock, X, Save } from 'lucide-react'
import appRoleService from '@services/appRoleService'
import { PERMISSION_LABELS, MODULE_GROUPS } from '@utils/constants'
import Modal from '../Modal' // Fix relative import to be safe

const RoleSettings = () => {
    const [roles, setRoles] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingRole, setEditingRole] = useState(null)

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        label: '',
        description: '',
        permissions: []
    })

    useEffect(() => {
        console.log('RoleSettings: Component Mounted')
        fetchRoles()
    }, [])

    const fetchRoles = async () => {
        try {
            setLoading(true)
            const data = await appRoleService.getAll()
            setRoles(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error('Error loading roles:', error)
            setRoles([])
        } finally {
            setLoading(false)
        }
    }

    const openCreateModal = () => {
        setEditingRole(null)
        setFormData({ name: '', label: '', description: '', permissions: [] })
        setShowModal(true)
    }

    const openEditModal = (role) => {
        setEditingRole(role)
        setFormData({
            name: role.name || '',
            label: role.label || '',
            description: role.description || '',
            permissions: Array.isArray(role.permissions) ? role.permissions : []
        })
        setShowModal(true)
    }

    const handlePermissionToggle = (permissionKey) => {
        setFormData(prev => {
            const currentPermissions = Array.isArray(prev.permissions) ? prev.permissions : []
            if (currentPermissions.includes(permissionKey)) {
                return { ...prev, permissions: currentPermissions.filter(p => p !== permissionKey) }
            } else {
                return { ...prev, permissions: [...currentPermissions, permissionKey] }
            }
        })
    }

    const handleGroupToggle = (groupPermissions) => {
        const currentParams = Array.isArray(formData.permissions) ? formData.permissions : []
        const allSelected = groupPermissions.every(p => currentParams.includes(p))

        setFormData(prev => {
            if (allSelected) {
                // Deselect all
                return { ...prev, permissions: (prev.permissions || []).filter(p => !groupPermissions.includes(p)) }
            } else {
                // Select all
                const newPerms = [...(prev.permissions || [])]
                groupPermissions.forEach(p => {
                    if (!newPerms.includes(p)) newPerms.push(p)
                })
                return { ...prev, permissions: newPerms }
            }
        })
    }

    const handleSave = async () => {
        if (!formData.name || !formData.label) {
            alert('El nombre y la etiqueta son obligatorios')
            return
        }

        try {
            if (!editingRole) {
                const created = await appRoleService.create({
                    name: formData.name.toUpperCase().replace(/\s+/g, '_'),
                    label: formData.label,
                    description: formData.description,
                    permissions: formData.permissions
                })
                setRoles([...roles, created])
            } else {
                const updated = await appRoleService.update(editingRole.id, {
                    label: formData.label,
                    description: formData.description,
                    permissions: formData.permissions
                })
                setRoles(roles.map(r => r.id === updated.id ? updated : r))
            }
            setShowModal(false)
        } catch (error) {
            console.error('Error saving role:', error)
            alert('Error al guardar el rol. Verifique que el código no exista ya.')
        }
    }

    const handleDelete = async (role) => {
        if (!role || role.is_system) return
        if (!confirm('¿Estás seguro de eliminar este rol? Esta acción no se puede deshacer.')) return

        try {
            await appRoleService.delete(role.id)
            setRoles(roles.filter(r => r.id !== role.id))
        } catch (error) {
            console.error('Error deleting role:', error)
            alert('Error al eliminar el rol')
        }
    }

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    )

    return (
        <div className="p-2 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary-600" />
                        Roles y Permisos
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Gestiona los roles de usuario y sus capacidades dentro del sistema.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="btn btn-primary btn-md inline-flex items-center gap-2 shadow-lg shadow-primary-600/20"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Rol
                </button>
            </div>

            {/* Roles Graph/Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles && roles.length > 0 ? (
                    roles.map(role => (
                        <div
                            key={role.id}
                            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-300 group"
                        >
                            <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                                        {role.label}
                                    </h3>
                                    {role.is_system ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-800/50">
                                            <Lock className="w-3 h-3" /> Sistema
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-200 dark:border-blue-800/50">
                                            Personalizado
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-xs font-mono text-gray-500 bg-white dark:bg-gray-900 px-2 py-1 rounded border border-gray-100 dark:border-gray-700 w-fit">
                                    {role.name}
                                </div>
                            </div>

                            <div className="p-5">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 min-h-[40px]">
                                    {role.description || 'Sin descripción definida para este rol.'}
                                </p>

                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-xs font-medium text-gray-500">Permisos activos:</span>
                                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300">
                                        {Array.isArray(role.permissions) ? role.permissions.length : 0}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <button
                                        onClick={() => openEditModal(role)}
                                        className="flex-1 btn btn-secondary btn-sm flex items-center justify-center gap-2"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        Editar
                                    </button>
                                    {!role.is_system && (
                                        <button
                                            onClick={() => handleDelete(role)}
                                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Eliminar Rol"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-center text-gray-500">
                        <div className="bg-gray-100 p-4 rounded-full mb-3">
                            <Shield className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="font-medium">No se encontraron roles.</p>
                        <p className="text-sm">Asegúrate de haber ejecutado los scripts de migración.</p>
                    </div>
                )}
            </div>

            {/* Modal Editor */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingRole ? `Editar Rol: ${editingRole.label}` : 'Crear Nuevo Rol'}
                maxWidth="max-w-5xl"
            >
                <div className="flex flex-col h-[calc(100vh-200px)]">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-1">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre Visible (Etiqueta)</label>
                            <input
                                type="text"
                                value={formData.label}
                                onChange={e => setFormData({ ...formData, label: e.target.value })}
                                className="input w-full font-bold"
                                placeholder="Ej. Gerente de RRHH"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                Código Interno (ID)
                                <span className="ml-1 text-xs font-normal text-gray-500">(Automático)</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                                disabled={editingRole && editingRole.is_system}
                                className="input w-full font-mono text-sm bg-gray-50"
                                placeholder="ROL_ID"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="textarea w-full"
                                rows="2"
                                placeholder="Describe las responsabilidades de este rol..."
                            />
                        </div>
                    </div>

                    {/* Permissions Grid */}
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar border-t border-gray-100 dark:border-gray-700 pt-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary-600" />
                                Configuración de Permisos
                            </h3>
                            <div className="text-xs text-gray-500">
                                {Array.isArray(formData.permissions) ? formData.permissions.length : 0} permisos seleccionados
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 pb-6">
                            {MODULE_GROUPS && Object.entries(MODULE_GROUPS).map(([key, group]) => {
                                const currentPerms = Array.isArray(formData.permissions) ? formData.permissions : []
                                const groupSelectedCount = group.permissions.filter(p => currentPerms.includes(p)).length
                                const allSelected = groupSelectedCount === group.permissions.length

                                return (
                                    <div key={key} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        <div className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-8 rounded-full ${groupSelectedCount > 0 ? 'bg-primary-500' : 'bg-gray-300'}`}></div>
                                                <h4 className="font-bold text-gray-900 dark:text-gray-100">
                                                    {group.label}
                                                </h4>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleGroupToggle(group.permissions)}
                                                className="text-xs font-bold text-primary-600 hover:text-primary-700"
                                            >
                                                {allSelected ? 'Desmarcar Todos' : 'Marcar Todos'}
                                            </button>
                                        </div>
                                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {group.permissions.map(permKey => {
                                                const isSelected = currentPerms.includes(permKey)
                                                return (
                                                    <label
                                                        key={permKey}
                                                        className={`
                                                            relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 select-none
                                                            ${isSelected
                                                                ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800'
                                                                : 'bg-white border-transparent hover:border-gray-200'
                                                            }
                                                        `}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox checkbox-primary checkbox-sm mt-0.5"
                                                            checked={isSelected}
                                                            onChange={() => handlePermissionToggle(permKey)}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className={`text-sm font-medium ${isSelected ? 'text-primary-900 dark:text-primary-100' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                {PERMISSION_LABELS[permKey] || permKey}
                                                            </span>
                                                            <code className="text-[10px] text-gray-400 mt-0.5 block">{permKey}</code>
                                                        </div>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 mt-4 bg-white dark:bg-gray-800 sticky bottom-0 z-10">
                        <button
                            onClick={() => setShowModal(false)}
                            className="btn btn-secondary"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="btn btn-primary shadow-lg shadow-primary-600/20"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Guardar Rol
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default RoleSettings
