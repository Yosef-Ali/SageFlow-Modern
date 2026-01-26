import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'

// Load .env.local for local development
config({ path: '.env.local' })

// For Supabase:
// - DIRECT_URL (port 5432) - for migrations (db:push, db:migrate)
// - DATABASE_URL (port 6543 with pgbouncer) - for app queries

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    // Use DIRECT_URL for migrations (bypasses connection pooler)
    // Falls back to DATABASE_URL if DIRECT_URL is not set
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  },
  // Verbose output for debugging
  verbose: true,
  // Strict mode for type safety
  strict: true,
})
