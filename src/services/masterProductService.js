import supabase from './supabase'

/**
 * Service for managing the global Master Product Catalog
 */
class MasterProductService {
    /**
     * Search master products
     */
    async search(query) {
        try {
            const { data, error } = await supabase
                .from('master_products')
                .select(`
                    *,
                    category:product_categories(name),
                    type:product_types(name)
                `)
                .or(`name.ilike.%${query}%,sap_code.ilike.%${query}%`)
                .eq('is_active', true)
                .limit(10)

            if (error) throw error
            return data || []
        } catch (error) {
            console.error('Error searching master products:', error)
            return []
        }
    }

    // --- TYPES ---
    async getTypes() {
        try {
            const { data, error } = await supabase
                .from('product_types')
                .select('*')
                .order('name')
            if (error) throw error
            return data || []
        } catch (error) {
            console.error('Error fetching types:', error)
            throw error;
        }
    }

    async createType(typeData) {
        try {
            const { data, error } = await supabase
                .from('product_types')
                .insert([typeData])
                .select().single()
            if (error) throw error
            return data
        } catch (error) { throw error }
    }

    async deleteType(id) {
        try {
            const { error } = await supabase.from('product_types').delete().eq('id', id)
            if (error) throw error
            return true
        } catch (error) { throw error }
    }


    // --- CATEGORIES ---
    async getCategories() {
        try {
            const { data, error } = await supabase
                .from('product_categories')
                .select('*')
                .order('name')
            if (error) throw error
            return data || []
        } catch (error) {
            console.error('Error fetching categories:', error)
            return []
        }
    }

    async createCategory(categoryData) {
        try {
            const { data, error } = await supabase
                .from('product_categories')
                .insert([categoryData])
                .select().single()
            if (error) throw error
            return data
        } catch (error) { throw error }
    }

    async deleteCategory(id) {
        try {
            const { error } = await supabase.from('product_categories').delete().eq('id', id)
            if (error) throw error
            return true
        } catch (error) { throw error }
    }


    // --- PRODUCTS ---
    async getProducts({ page = 1, limit = 20, search = '', categoryId = '', typeId = '' }) {
        try {
            const from = (page - 1) * limit
            const to = from + limit - 1

            let query = supabase
                .from('master_products')
                .select(`
                    *, 
                    category:product_categories(name),
                    type:product_types(name)
                `, { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(from, to)

            if (search) {
                query = query.or(`name.ilike.%${search}%,sap_code.ilike.%${search}%`)
            }

            if (categoryId && categoryId !== 'ALL') {
                query = query.eq('category_id', categoryId)
            }
            if (typeId && typeId !== 'ALL') {
                query = query.eq('type_id', typeId)
            }

            const { data, error, count } = await query
            if (error) throw error
            return { data: data || [], count: count || 0 }
        } catch (error) {
            console.error('Error fetching master products:', error)
            throw error
        }
    }

    async createProduct(productData) {
        try {
            const { data, error } = await supabase
                .from('master_products')
                .insert([productData])
                .select().single()
            if (error) throw error
            return data
        } catch (error) { throw error }
    }

    /**
     * Bulk create products
     * @param {Array} products 
     */
    async createBulk(products) {
        try {
            const { data, error } = await supabase
                .from('master_products')
                .insert(products)
                .select()
            if (error) throw error
            return data
        } catch (error) { throw error }
    }

    async updateProduct(id, productData) {
        try {
            const { data, error } = await supabase
                .from('master_products')
                .update(productData)
                .eq('id', id)
                .select().single()
            if (error) throw error
            return data
        } catch (error) { throw error }
    }

    async deleteProduct(id) {
        try {
            const { error } = await supabase
                .from('master_products')
                .delete()
                .eq('id', id)
            if (error) {
                if (error.code === '23503') throw new Error('No se puede eliminar: El producto está en uso.')
                throw error
            }
            return true
        } catch (error) { throw error }
    }
}

export default new MasterProductService()
