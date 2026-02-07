import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
// Note: On the server (Next.js actions), we should access process.env
// The Service Role Key allows bypassing RLS policies
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL')
}

if (!supabaseServiceRoleKey) {
  // Warn but don't crash, might be build time
  console.warn('Missing SUPABASE_SERVICE_ROLE_KEY - Admin actions will fail')
}

export const supabaseAdmin = createClient(
  supabaseUrl || '',
  supabaseServiceRoleKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
