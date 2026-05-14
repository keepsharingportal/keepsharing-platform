// Service-role Supabase client for admin server components and admin API
// routes. Bypasses RLS so the admin queue, editor pages, and import jobs can
// read/write every table without per-page anon policy wrangling.
//
// Never import this from a public/customer-facing path.

import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    // Fall back to anon during build-time prerender; runtime usage will
    // surface the misconfiguration via 401s.
    return createClient(
      url ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? key ?? '',
    )
  }
  return createClient(url, key, { auth: { persistSession: false } })
}
