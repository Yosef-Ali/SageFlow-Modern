import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().min(1, 'DATABASE_URL is required'),

  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url().min(1, 'NEXTAUTH_URL is required'),

  // Optional services
  RESEND_API_KEY: z.string().optional(),
  CHAPA_SECRET_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // AWS Storage (optional)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_BUCKET_NAME: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

// Validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      console.error('❌ Invalid environment variables:\n' + missingVars.join('\n'))
      throw new Error('Invalid environment variables')
    }
    throw error
  }
}

// Export validated environment variables
export const env = validateEnv()

// Type-safe environment access
export type Env = z.infer<typeof envSchema>
