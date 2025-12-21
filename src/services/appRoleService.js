import supabase from './supabase'

/**
 * Servicio para gestionar Roles y Permisos (RBAC)
 */
const appRoleService = {
    /**
     * Obtiene todos los roles disponibles
     * @returns {Promise<Array>} Lista de roles
     */
    async getAll() {
        try {
            const { data, error } = await supabase
                .from('app_roles')
                .select('*')
                .order('name')

            if (error) throw error
            return data
        } catch (error) {
            console.error('Error fetching roles:', error)
            throw error
        }
    },

    /**
     * Obtiene un rol por ID
     * @param {string} id ID del rol
     */
    async getById(id) {
        try {
            const { data, error } = await supabase
                .from('app_roles')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            return data
        } catch (error) {
            console.error('Error fetching role:', error)
            throw error
        }
    },

    /**
     * Crea un nuevo rol
     * @param {Object} roleData Datos del rol
     */
    async create(roleData) {
        try {
            const { data, error } = await supabase
                .from('app_roles')
                .insert([roleData])
                .select()

            if (error) throw error
            return data[0]
        } catch (error) {
            console.error('Error creating role:', error)
            throw error
        }
    },

    /**
     * Actualiza un rol existente
     * @param {string} id ID del rol
     * @param {Object} roleData Datos a actualizar
     */
    async update(id, roleData) {
        try {
            // Evitar que se modifiquen campos críticos de roles de sistema si no es super admin (validado en DB, pero bueno frontend check)
            const { data, error } = await supabase
                .from('app_roles')
                .update(roleData)
                .eq('id', id)
                .select()

            if (error) throw error
            return data[0]
        } catch (error) {
            console.error('Error updating role:', error)
            throw error
        }
    },

    /**
     * Elimina un rol
     * @param {string} id ID del rol
     */
    async delete(id) {
        try {
            const { error } = await supabase
                .from('app_roles')
                .delete()
                .eq('id', id)

            if (error) throw error
            return true
        } catch (error) {
            console.error('Error deleting role:', error)
            throw error
        }
    }
}

export default appRoleService
