'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { recordAuditEvent } from '@/lib/admin/audit'
import {
  mintAccessToken, listAccounts, listLocations,
  createLocalPost, gbpErrorMessage,
} from '@/lib/integrations/google-business/client'
import { syncGoogleBusiness } from '@/lib/integrations/google-business/sync'

export interface AccountOption { name: string; accountName: string }
export interface LocationOption { name: string; title: string; locality: string | null }

/** Step 1: token validation — mint + list accounts + flatten to (account, location)
 *  pairs the user can pick from in the connect form. */
export async function validateRefreshTokenAction(refreshToken: string): Promise<
  { ok: true; options: Array<{ accountResource: string; locationResource: string; label: string }> } |
  { ok: false; error: string }
> {
  await requireAdmin()
  if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return { ok: false, error: 'GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET must be set in env.' }
  }
  if (!refreshToken || refreshToken.length < 20) {
    return { ok: false, error: 'Refresh token looks too short.' }
  }
  try {
    const { accessToken } = await mintAccessToken(refreshToken)
    const accounts = await listAccounts(accessToken)
    if (accounts.length === 0) {
      return { ok: false, error: 'No GBP accounts found for this token. Make sure the Google account that authorized OAuth Playground manages a Business Profile.' }
    }
    const options: Array<{ accountResource: string; locationResource: string; label: string }> = []
    for (const a of accounts) {
      try {
        const locs = await listLocations(accessToken, a.name)
        for (const l of locs) {
          const locality = l.storefrontAddress?.locality ?? null
          options.push({
            accountResource:  a.name,
            locationResource: l.name,
            label:            `${l.title}${locality ? ` — ${locality}` : ''}  (${a.accountName})`,
          })
        }
      } catch (e) {
        console.warn('[gbp/validate] listLocations failed for', a.name, gbpErrorMessage(e))
      }
    }
    if (options.length === 0) {
      return { ok: false, error: 'Refresh token works but no locations found. Confirm the OAuth account has locations under at least one account.' }
    }
    return { ok: true, options }
  } catch (e) {
    return { ok: false, error: gbpErrorMessage(e) }
  }
}

interface ConnectInput {
  refreshToken:      string
  accountResource:   string                       // "accounts/12345"
  locationResource:  string                       // "accounts/12345/locations/67890"
  locationName:      string                       // human-readable
  /** When set, this is a Phase 2 (per-advertiser) connection rather
   *  than RRP's own (Phase 1, advertiser_account_id NULL). */
  advertiserAccountId?: string | null
}

export async function connectGBPAction(input: ConnectInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  // The Performance API uses the full resource path for location_id, so we
  // store both forms — account_id is the resource, location_id is too. The
  // sync code strips to the bare numeric id when calling the perf endpoint.
  const sr = createAdminClient()
  const { error } = await sr
    .from('google_business_integrations')
    .upsert({
      account_id:           input.accountResource,
      location_id:          input.locationResource,
      location_name:        input.locationName,
      refresh_token:        input.refreshToken,
      advertiser_account_id: input.advertiserAccountId ?? null,
      is_active:            true,
      connected_at:         new Date().toISOString(),
      connected_by:         ctx.adminId,
    }, { onConflict: 'account_id,location_id' })
  if (error) return { ok: false, error: error.message }

  await recordAuditEvent({
    ctx,
    action:       input.advertiserAccountId ? 'gbp.advertiser_connected' : 'gbp.connected',
    target_table: 'google_business_integrations',
    target_id:    input.locationResource,
    after:        {
      account_id:            input.accountResource,
      location_id:           input.locationResource,
      location_name:         input.locationName,
      advertiser_account_id: input.advertiserAccountId ?? null,
    },
  })
  revalidatePath('/admin/integrations/google-business')
  if (input.advertiserAccountId) revalidatePath(`/admin/advertisers/${input.advertiserAccountId}/gbp`)
  revalidatePath('/admin/integrations')
  return { ok: true }
}

export async function disconnectGBPAction(locationResource: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()
  const { error } = await sr.from('google_business_integrations').delete().eq('location_id', locationResource)
  if (error) return { ok: false, error: error.message }
  await recordAuditEvent({
    ctx,
    action:       'gbp.disconnected',
    target_table: 'google_business_integrations',
    target_id:    locationResource,
    before:       { location_id: locationResource },
  })
  revalidatePath('/admin/integrations/google-business')
  revalidatePath('/admin/integrations')
  return { ok: true }
}

export async function syncGBPNowAction(): Promise<{ ok: true; insightCount: number } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const result = await syncGoogleBusiness(`manual:${ctx.adminId}`)
  revalidatePath('/admin/integrations/google-business')
  if (result.status === 'error') return { ok: false, error: result.error ?? 'unknown sync error' }
  return { ok: true, insightCount: result.insightCount }
}

interface PostInput {
  summary:        string
  ctaActionType?: 'BOOK' | 'ORDER' | 'SHOP' | 'LEARN_MORE' | 'SIGN_UP' | 'CALL'
  ctaUrl?:        string
  mediaUrl?:      string
  /** When set, post to this advertiser's GBP (Phase 2) instead of the
   *  publisher's own (Phase 1). The integration row is resolved by
   *  advertiser_account_id when this is provided. */
  advertiserAccountId?: string | null
}

export async function postToGBPAction(input: PostInput): Promise<{ ok: true; postName: string } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()
  // Resolve which integration row to post to:
  //   - advertiserAccountId set → that advertiser's row
  //   - advertiserAccountId NULL → the publisher's row (Phase 1; the
  //     legacy "single active row" assumption)
  let query = sr
    .from('google_business_integrations')
    .select('id, account_id, location_id, refresh_token, access_token, access_token_expires_at')
    .eq('is_active', true)
  if (input.advertiserAccountId) {
    query = query.eq('advertiser_account_id', input.advertiserAccountId)
  } else {
    query = query.is('advertiser_account_id', null)
  }
  const { data: row } = await query.maybeSingle()
  const integration = row as null | {
    id: string; account_id: string; location_id: string; refresh_token: string;
    access_token: string | null; access_token_expires_at: string | null;
  }
  if (!integration) {
    return {
      ok: false,
      error: input.advertiserAccountId
        ? 'No active GBP integration for this advertiser. Connect one first.'
        : 'No active GBP integration. Connect one first.',
    }
  }

  if (!input.summary || input.summary.length < 10) {
    return { ok: false, error: 'Post summary must be at least 10 characters.' }
  }
  if (input.summary.length > 1500) {
    return { ok: false, error: 'GBP posts cap at 1500 characters.' }
  }
  if (input.ctaActionType && input.ctaActionType !== 'CALL' && !input.ctaUrl) {
    return { ok: false, error: 'CTA actions other than CALL require a URL.' }
  }

  // Insert pending row first so we have an audit trail even on API failure.
  const { data: pendingRow } = await sr
    .from('google_business_posts')
    .insert({
      integration_id: integration.id,
      summary:        input.summary,
      cta_label:      input.ctaActionType ?? null,
      cta_url:        input.ctaUrl ?? null,
      media_url:      input.mediaUrl ?? null,
      status:         'pending',
      created_by:     ctx.adminId,
    })
    .select('id')
    .single()
  const pendingId = (pendingRow as { id: string } | null)?.id ?? null

  try {
    const accessToken = await (async () => {
      const now = Date.now()
      if (integration.access_token && integration.access_token_expires_at && new Date(integration.access_token_expires_at).getTime() > now + 30_000) {
        return integration.access_token
      }
      const { accessToken, expiresAt } = await mintAccessToken(integration.refresh_token)
      await sr.from('google_business_integrations').update({
        access_token:            accessToken,
        access_token_expires_at: expiresAt.toISOString(),
      }).eq('id', integration.id)
      return accessToken
    })()

    const accountBareId  = integration.account_id.split('/').pop() ?? integration.account_id
    const locationBareId = integration.location_id.split('/').pop() ?? integration.location_id
    const result = await createLocalPost(accessToken, {
      accountId:     accountBareId,
      locationId:    locationBareId,
      summary:       input.summary,
      ctaActionType: input.ctaActionType,
      ctaUrl:        input.ctaUrl,
      mediaUrl:      input.mediaUrl,
    })

    if (pendingId) {
      await sr.from('google_business_posts').update({
        gbp_post_name: result.name,
        status:        'live',
        published_at:  new Date().toISOString(),
      }).eq('id', pendingId)
    }

    await recordAuditEvent({
      ctx,
      action:       'gbp.post_created',
      target_table: 'google_business_posts',
      target_id:    result.name,
      after:        { summary: input.summary.slice(0, 200) },
    })
    revalidatePath('/admin/integrations/google-business')
    return { ok: true, postName: result.name }
  } catch (e) {
    const msg = gbpErrorMessage(e)
    if (pendingId) {
      await sr.from('google_business_posts').update({
        status: 'error', error: msg.slice(0, 1000),
      }).eq('id', pendingId)
    }
    return { ok: false, error: msg }
  }
}
