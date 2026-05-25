/**
 * supabase.js — Supabase Client
 *
 * Initializes the Supabase client with the ledger schema as default.
 * This ensures all queries route to ledger.* without needing .schema()
 * chaining on every call.
 *
 * These are publishable/anon keys — safe for client-side use.
 * Never use the service_role key in browser code.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL      = 'https://hhyhulqngdkwsxhymmcd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_haKvwV0M7KMj4Qz69M6WGg_KmIfU-aI';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('[Supabase] SUPABASE_URL or SUPABASE_ANON_KEY is not set.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'ledger' }
});

export default supabase;
