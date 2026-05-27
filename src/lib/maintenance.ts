// Maintenance mode check — called by public pages to decide whether to
// render the real page or the holding screen. Cached for 30 seconds so
// toggling off takes effect within half a minute without hammering the DB.

import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'

export const isMaintenanceMode = cache(async (): Promise<boolean> => {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    )
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle()
    return data?.value === 'true'
  } catch {
    // Table missing or DB unreachable — fail open (show the site)
    return false
  }
})
