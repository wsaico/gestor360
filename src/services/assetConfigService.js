import supabase from '@/services/supabase'

const assetConfigService = {
    // ==========================================
    // CATEGORIES
    // ==========================================
    async getCategories() {
        const { data, error } = await supabase
            .from('asset_categories')
            .select('*')
            .order('name')

        if (error) throw error
        return data
    },

    async createCategory(category) {
        const { data, error } = await supabase
            .from('asset_categories')
            .insert([category])
            .select()
            .single()

        if (error) throw error
        return data
    },

    async updateCategory(id, updates) {
        const { data, error } = await supabase
            .from('asset_categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async deleteCategory(id) {
        const { error } = await supabase
            .from('asset_categories')
            .delete()
            .eq('id', id)

        if (error) throw error
        return true
    },

    // ==========================================
    // SUBCATEGORIES
    // ==========================================
    async getSubcategories(categoryId = null) {
        let query = supabase
            .from('asset_subcategories')
            .select('*, category:asset_categories(name)')
            .order('name')

        if (categoryId) {
            query = query.eq('category_id', categoryId)
        }

        const { data, error } = await query

        if (error) throw error
        return data
    },

    async createSubcategory(subcategory) {
        const { data, error } = await supabase
            .from('asset_subcategories')
            .insert([subcategory])
            .select()
            .single()

        if (error) throw error
        return data
    },

    async updateSubcategory(id, updates) {
        const { data, error } = await supabase
            .from('asset_subcategories')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async deleteSubcategory(id) {
        const { error } = await supabase
            .from('asset_subcategories')
            .delete()
            .eq('id', id)

        if (error) throw error
        return true
    },

    // ==========================================
    // BRANDS
    // ==========================================
    async getBrands() {
        const { data, error } = await supabase
            .from('asset_brands')
            .select('*')
            .order('name')

        if (error) throw error
        return data
    },

    async createBrand(brand) {
        const { data, error } = await supabase
            .from('asset_brands')
            .insert([brand])
            .select()
            .single()

        if (error) throw error
        return data
    },

    async updateBrand(id, updates) {
        const { data, error } = await supabase
            .from('asset_brands')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async deleteBrand(id) {
        const { error } = await supabase
            .from('asset_brands')
            .delete()
            .eq('id', id)

        if (error) throw error
        return true
    },

    // ==========================================
    // MODELS
    // ==========================================
    async getModels(brandId = null) {
        let query = supabase
            .from('asset_models')
            .select('*, brand:asset_brands(name)')
            .order('name')

        if (brandId) {
            query = query.eq('brand_id', brandId)
        }

        const { data, error } = await query

        if (error) throw error
        return data
    },

    async createModel(model) {
        const { data, error } = await supabase
            .from('asset_models')
            .insert([model])
            .select()
            .single()

        if (error) throw error
        return data
    },

    async updateModel(id, updates) {
        const { data, error } = await supabase
            .from('asset_models')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async deleteModel(id) {
        const { error } = await supabase
            .from('asset_models')
            .delete()
            .eq('id', id)

        if (error) throw error
        return true
    }
}

export default assetConfigService
