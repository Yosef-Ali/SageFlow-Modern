// This file acts as a placeholder for the client-side app.
// Direct database access via 'postgres' driver is not possible in the browser.
// We are using Supabase Client (@supabase/supabase-js) which connects via HTTP.

import * as schema from './schema';

export const db = new Proxy({}, {
  get: function (target, prop) {
    // Prevent crashing if something imports db, but warn developer
    console.warn(`Attempted to access db.${String(prop)} on client-side. Use Supabase client instead.`);
    return () => { }; // Return safe no-op function
  }
});

// Mock query builder for schema compatibility if needed, though mostly unused now
export { schema };
