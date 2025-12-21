
import { createClient } from '@supabase/supabase-js'

// Hardcoded for debugging - normally use env vars but this is a quick script
// I will get these from the previous read_resource output or assume standard process.env if run with --env-file (Node 20+)
// Since I can't easily pass env vars in run_command, I'll paste the keys from the .env file I just read.
// Wait, I haven't read .env yet (it's in the queue).
// I will start by reading .env first, then write this file. 
// Actually I can just expect the user to have them or use placeholders if I could, 
// but asking to read .env is better.
// Retrying strategy: I'll use placeholders that I'll replace with real values in the next step after reading .env
// OR I can use the `dotenv` package if it's in package.json.
// Let's assume standard Vite project has `dotenv`.
// Checking package.json... I viewed it earlier (Step 233 Checkpoint).
// It has `vite`. `dotenv` might not be explicitly installed for node scripts.
// safely reading .env in the script:

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../../.env')

let SUPABASE_URL = ''
let SUPABASE_KEY = ''

try {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=')
        if (key && value) {
            if (key.trim() === 'VITE_SUPABASE_URL') SUPABASE_URL = value.trim()
            if (key.trim() === 'VITE_SUPABASE_ANON_KEY') SUPABASE_KEY = value.trim()
        }
    })
} catch (err) {
    console.error('Error reading .env', err)
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Could not find Supabase credentials in .env')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function debug() {
    console.log('--- DEBUGGING DNI 41500801 ---')

    // 1. Direct Query to Employees
    const { data: employees, error } = await supabase
        .from('employees')
        .select(`
            *,
            station:stations(*)
        `)
        .eq('dni', '41500801')

    if (error) {
        console.error('Error fetching employee:', error)
    } else {
        console.log('Employee Records Found:', employees.length)
        employees.forEach(emp => {
            console.log('ID:', emp.id)
            console.log('Name:', emp.full_name)
            console.log('DNI:', emp.dni)
            console.log('Station ID:', emp.station_id)
            console.log('Station Name (Joined):', emp.station?.name)
            console.log('Station Code (Joined):', emp.station?.code)
            console.log('-------------------')
        })
    }

    // 2. RPC Call Check
    console.log('\n--- TESTING RPC get_employee_by_dni_public ---')
    const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_employee_by_dni_public', { p_dni: '41500801' })

    if (rpcError) {
        console.error('RPC Error:', rpcError)
    } else {
        console.log('RPC Result:', rpcData)
    }
}

debug()
