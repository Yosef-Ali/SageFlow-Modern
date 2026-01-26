import { z } from 'zod'

const envSchema = z.object({
  // Supabase
  VITE_SUPABASE_URL: z.string().url().min(1, 'VITE_SUPABASE_URL is required'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY is required'),

  // Node environment
  MODE: z.enum(['development', 'production', 'test']).default('development'),

  // Optional services (mapped if they exist in Vite env)
  VITE_RESEND_API_KEY: z.string().optional(),
  VITE_CHAPA_SECRET_KEY: z.string().optional(),
  VITE_GEMINI_API_KEY: z.string().optional(),
})

// Validate environment variables using Vite's import.meta.env
function validateEnv() {
  try {
    const envVars = {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
      MODE: import.meta.env.MODE,
      VITE_RESEND_API_KEY: import.meta.env.VITE_RESEND_API_KEY,
      VITE_CHAPA_SECRET_KEY: import.meta.env.VITE_CHAPA_SECRET_KEY,
      VITE_GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY,
    }
    return envSchema.parse(envVars)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      console.warn('⚠️ Missing environment variables (Check .env.local):\n' + missingVars.join('\n'))
      // Return a safe fallback to prevent crash, since dev might be missing some keys initially
      return {
        VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
        VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        MODE: import.meta.env.MODE,
      } as z.infer<typeof envSchema>
    }
    throw error
  }
}

// Export validated environment variables
export const env = validateEnv()

// Type-safe environment access
export type Env = z.infer<typeof envSchema>

// Alias for compatibility if needed elsewhere, though direct import is preferred
export const NEXTAUTH_URL = window.location.origin
