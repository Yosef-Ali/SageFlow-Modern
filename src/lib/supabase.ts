import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug logging
console.log('Supabase config:', {
  url: supabaseUrl,
  keyLength: supabaseAnonKey?.length,
  keyPrefix: supabaseAnonKey?.substring(0, 20) + '...',
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing! Check .env.local')
  console.error('VITE_SUPABASE_URL:', supabaseUrl || 'MISSING')
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'MISSING')
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)
