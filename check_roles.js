
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRoles() {
    const { data, error } = await supabase.from('app_roles').select('*')
    if (error) {
        console.error(error)
    } else {
        console.log('Roles found:', data)
    }
}

checkRoles()
