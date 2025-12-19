import { useState } from 'react'
import { useAuth } from '@contexts/AuthContext'
import { useNotification } from '@contexts/NotificationContext'
import authService from '@services/authService' // Ensure this exists or use Supabase directly
import supabase from '@services/supabase' // Fallback
import { User, Lock, Save, Camera } from 'lucide-react'

const ProfileSettings = () => {
    const { user, updateUser } = useAuth()
    const { notify } = useNotification()

    const [profile, setProfile] = useState({
        username: user?.username || '',
        full_name: user?.full_name || '', // Assuming this exists in user metadata
        phone: user?.phone || '',
        bio: user?.bio || ''
    })

    // Password State
    const [passwords, setPasswords] = useState({
        newPassword: '',
        confirmPassword: ''
    })

    const [saving, setSaving] = useState(false)

    const handleProfileUpdate = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            // Update user metadata in Supabase
            const { data, error } = await supabase.auth.updateUser({
                data: {
                    username: profile.username,
                    full_name: profile.full_name,
                    phone: profile.phone,
                    bio: profile.bio
                }
            })

            if (error) throw error

            // Update local context
            updateUser({ ...user, ...profile })
            notify.success('Perfil actualizado correctamente')
        } catch (error) {
            console.error('Error updating profile:', error)
            notify.error('Error al actualizar perfil')
        } finally {
            setSaving(false)
        }
    }

    const handlePasswordUpdate = async (e) => {
        e.preventDefault()
        if (passwords.newPassword.length < 6) {
            notify.warning('La contraseña debe tener al menos 6 caracteres')
            return
        }
        if (passwords.newPassword !== passwords.confirmPassword) {
            notify.warning('Las contraseñas no coinciden')
            return
        }

        setSaving(true)
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwords.newPassword
            })

            if (error) throw error
            notify.success('Contraseña actualizada correctamente')
            setPasswords({ newPassword: '', confirmPassword: '' })
        } catch (error) {
            console.error('Error changing password:', error)
            notify.error('Error al cambiar contraseña')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mi Perfil</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Gestiona tu información personal y credenciales de acceso.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Profile Info */}
                <div className="md:col-span-2 space-y-6">
                    <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                            <User className="w-5 h-5 mr-2 text-primary-600" />
                            Información Personal
                        </h3>

                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Nombre de Usuario</label>
                                    <input
                                        type="text"
                                        value={profile.username}
                                        onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="label">Teléfono</label>
                                    <input
                                        type="tel"
                                        value={profile.phone}
                                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                        className="input"
                                        placeholder="+51 999..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Biografía / Cargo</label>
                                <textarea
                                    value={profile.bio}
                                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                    className="input h-24 resize-none"
                                    placeholder="Describe brevemente tu rol..."
                                />
                            </div>

                            <div className="flex justify-end">
                                <button type="submit" disabled={saving} className="btn btn-primary">
                                    <Save className="w-4 h-4 mr-2" />
                                    Actualizar Perfil
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                            <Lock className="w-5 h-5 mr-2 text-primary-600" />
                            Seguridad
                        </h3>

                        <form onSubmit={handlePasswordUpdate} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        value={passwords.newPassword}
                                        onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="label">Confirmar Contraseña</label>
                                    <input
                                        type="password"
                                        value={passwords.confirmPassword}
                                        onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                        className="input"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button type="submit" disabled={saving || !passwords.newPassword} className="btn btn-secondary">
                                    Cambiar Contraseña
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Avatar Section */}
                <div className="md:col-span-1">
                    <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
                        <div className="relative inline-block">
                            <div className="w-32 h-32 rounded-full bg-primary-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4 overflow-hidden border-4 border-white dark:border-gray-600 shadow-lg">
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl text-primary-600 font-bold">{user?.username?.substring(0, 2).toUpperCase()}</span>
                                )}
                            </div>
                            <button className="absolute bottom-4 right-0 bg-primary-600 text-white p-2 rounded-full shadow hover:bg-primary-700">
                                <Camera className="w-4 h-4" />
                            </button>
                        </div>

                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">{user?.username}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user?.role}</p>
                        <p className="text-xs text-gray-400 mt-2">{user?.email}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ProfileSettings
