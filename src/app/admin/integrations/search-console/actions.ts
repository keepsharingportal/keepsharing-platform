'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { recordAuditEvent } from '@/lib/admin/audit'
import { mintAccessToken, listSites } from '@/lib/integrations/search-console/client'
import { syncSearchConsole } from '@/lib/integrations/search-console/sync'

interface ConnectInput {
  propertyUrl:  string
  refreshToken: string
}

export async function connectSearchConsoleAction(input: ConnectInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()

  if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return { ok: false, error: 'GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET must be set in env first. Create an OAuth app in Google Cloud Console and add the credentials to .env.local.' }
  }
  if (!input.refreshToken || input.refreshToken.length < 20) {
    return { ok: false, error: 'Refresh token looks too short. Paste the full token from OAuth Playground.' }
  }
  if (!input.propertyUrl) {
    return { ok: false, error: 'Property URL is required. Use sc-domain:yoursite.com or https://www.yoursite.com/' }
  }

  // Verify the refresh token by minting an access token + listing the user's sites.
  let validatedSites: Array<{ siteUrl: string; permissionLevel: string }> = []
  try {
    const { accessToken } = await mintAccessToken(input.refreshToken)
    validatedSites = await listSites(accessToken)
  } catch (e) {
    return { ok: false, error: `Token validation failed: ${e instanceof Error ? e.message : String(e)}` }
  }

  // Confirm the property is one this account can access.
  const propertyMatch = validatedSites.find(s => s.siteUrl === input.propertyUrl)
  if (!propertyMatch) {
    const list = validatedSites.map(s => `  • ${s.siteUrl} (${s.permissionLevel})`).join('\n')
    return { ok: false, error: `Property "${input.propertyUrl}" not accessible to this account. Accessible properties:\n${list || '(none)'}` }
  }

  const sr = createAdminClient()
  const { error } = await sr
    .from('search_console_integrations')
    .upsert({
      property_url:  input.propertyUrl,
      refresh_token: input.refreshToken,
      is_active:     true,
      connected_at:  new Date().toISOString(),
      connected_by:  ctx.adminId,
    }, { onConflict: 'property_url' })

  if (error) return { ok: false, error: error.message }

  await recordAuditEvent({
    ctx,
    action:       'search_console.connected',
    target_table: 'search_console_integrations',
    target_id:    input.propertyUrl,
    after:        { property_url: input.propertyUrl },
  })

  revalidatePath('/admin/integrations/search-console')
  revalidatePath('/admin/integrations')
  return { ok: true }
}

export async function disconnectSearchConsoleAction(propertyUrl: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()
  const { error } = await sr.from('search_console_integrations').delete().eq('property_url', propertyUrl)
  if (error) return { ok: false, error: error.message }
  await recordAuditEvent({
    ctx,
    action:       'search_console.disconnected',
    target_table: 'search_console_integrations',
    target_id:    propertyUrl,
    before:       { property_url: propertyUrl },
  })
  revalidatePath('/admin/integrations/search-console')
  revalidatePath('/admin/integrations')
  return { ok: true }
}

export async function syncNowAction(): Promise<{ ok: true; queryCount: number; pageCount: number } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const result = await syncSearchConsole(`manual:${ctx.adminId}`)
  revalidatePath('/admin/integrations/search-console')
  if (result.status === 'error') return { ok: false, error: result.error ?? 'unknown sync error' }
  return { ok: true, queryCount: result.queryCount, pageCount: result.pageCount }
}
