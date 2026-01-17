import { createClient } from '@supabase/supabase-js'
import supabase from './supabase'
import emailService from './emailService'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Servicio para gestión de usuarios del sistema
 */
class SystemUserService {
    /**
     * Obtiene todos los usuarios del sistema
     * @returns {Promise<Array>}
     */
    async getAll() {
        try {
            const { data, error } = await supabase
                .from('system_users')
                .select(`
          *,
          station:stations(id, name, code)
        `)
                .order('username', { ascending: true })

            if (error) throw error
            return data || []
        } catch (error) {
            console.error('Error fetching system users:', error)
            throw error
        }
    }

    /**
     * Crea un nuevo usuario
     * @param {Object} userData
     * @returns {Promise<Object>}
     */
    async create(userData) {
        try {
            // 1. Crear usuario en Supabase Auth usando un cliente temporal
            // Esto evita cerrar la sesión del administrador actual
            const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
                auth: {
                    persistSession: false, // No guardar sesión
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            })

            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        username: userData.username,
                        role: userData.role,
                        // Sanitizar station_id: enviar NULL si es string vacío
                        station_id: userData.station_id === '' ? null : userData.station_id
                    }
                }
            })

            if (authError) {
                console.error('Auth signUp error:', authError)
                throw new Error('Error al registrar usuario en Auth: ' + authError.message)
            }

            if (!authData.user) {
                throw new Error('No se pudo crear el usuario en Auth')
            }

            // 2. El registro en system_users se crea automáticamente por Trigger (handle_new_user)
            // Esperamos un momento breve para propagación si fuera necesario, o simplemente consultamos.

            // Verificamos que se haya creado
            const { data, error } = await supabase
                .from('system_users')
                .select()
                .eq('id', authData.user.id)
                .single()

            if (error) {
                // Si no se encuentra, el trigger falló.
                console.error('Error fetching auto-created user:', error)
                throw new Error('El usuario se creó en Auth pero falló la sincronización de perfil.')
            }

            // 3. Enviar correo de bienvenida (No bloqueante)
            emailService.sendWelcomeEmail(
                { username: userData.username, email: userData.email },
                userData.password
            ).catch(err => console.error('Error enviando correo de bienvenida:', err))

            return data
        } catch (error) {
            console.error('Error creating user:', error)
            throw error
        }
    }

    /**
     * Actualiza un usuario
     * @param {string} id
     * @param {Object} userData
     * @returns {Promise<Object>}
     */
    async update(id, userData) {
        try {
            // Separa la contraseña del resto de datos
            const { password, ...profileData } = userData

            // 1. Si hay nueva contraseña, actualizarla vía RPC seguro
            if (password && password.trim() !== '') {
                const { error: rpcError } = await supabase.rpc('admin_update_user_password', {
                    target_user_id: id,
                    new_password: password
                })

                if (rpcError) {
                    console.error('Error updating password via RPC:', rpcError)
                    throw new Error('Error al actualizar la contraseña: ' + rpcError.message)
                }
            }

            // 2. Actualizar datos del perfil en system_users (sin el campo password)
            const { data, error } = await supabase
                .from('system_users')
                .update(profileData)
                .eq('id', id)
                .select()
            // Removed .single() to avoid PGRST116 if RLS hides the return row

            if (error) throw error

            // Revert: We want to know if it failed!
            if (!data || data.length === 0) {
                throw new Error('No se pudo actualizar el usuario (Bloqueo de seguridad RLS).')
            }

            return data[0]
        } catch (error) {
            console.error('Error updating user:', error)
            throw error
        }
    }

    /**
     * Elimina un usuario
     * @param {string} id
     * @returns {Promise<boolean>}
     */
    async delete(id) {
        try {
            const { error } = await supabase
                .from('system_users')
                .delete()
                .eq('id', id)

            if (error) throw error
            return true
        } catch (error) {
            console.error('Error deleting user:', error)
            throw error
        }
    }
}

export default new SystemUserService()
