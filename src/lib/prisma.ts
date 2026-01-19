// Re-export Drizzle database connection for backward compatibility
// This file exists to maintain import paths during migration
export { db } from '@/db';
export * from '@/db/schema';
