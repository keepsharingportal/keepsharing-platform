// sendDriverWelcome — shared helper used by the driver-create endpoint
// and the resend-welcome / signin-link endpoints.
//
// Generates a fresh Supabase magic link, renders the driver_welcome
// template, and enqueues the email. Returns the magic link so callers
// can also use it directly (Copy sign-in link button).
//
// Base URL: prefers the dedicated drivers subdomain so links land on the
// cleaner URL even when admin is being run from a vercel.app preview.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { renderTemplate, getSettings } from '@/lib/circulation/email'
import { enqueue } from '@/lib/circulation/emailQueue'
import { regionForMarket } from '@/lib/circulation/regions'

export function circulationServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

export interface SendDriverWelcomeArgs {
  market:   string
  userId:   string
  email:    string
  fullName: string
  routeIds: string[]
}

export interface SendDriverWelcomeResult {
  queued:    boolean
  magicLink: string
}

export async function sendDriverWelcome(
  client: SupabaseClient,
  args:   SendDriverWelcomeArgs,
): Promise<SendDriverWelcomeResult> {
  const region    = regionForMarket(args.market)
  const settings  = await getSettings(args.market)
  const brandName = region.name + ' Distribution'
  const baseUrl   = process.env.NEXT_PUBLIC_DRIVERS_URL
                 ?? process.env.NEXT_PUBLIC_SITE_URL
                 ?? 'https://drivers.keepsharing.com'

  let routeList = ''
  if (args.routeIds.length > 0) {
    const { data: routes } = await client.from('circulation_routes').select('name').in('id', args.routeIds)
    routeList = (routes ?? []).map(r => (r as { name: string }).name).join(', ')
  }

  // One-tap magic link — 1-hour TTL. If Supabase link generation fails
  // (rare) we still send with a login-page fallback so the driver can
  // request a fresh link themselves.
  let magicLink = `${baseUrl}/distribution/login`
  try {
    const { data: linkData } = await client.auth.admin.generateLink({
      type:  'magiclink',
      email: args.email,
      options: {
        redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(`/distribution/${args.market}/driver`)}`,
      },
    })
    if (linkData?.properties?.action_link) magicLink = linkData.properties.action_link
  } catch { /* fall through with login-page fallback */ }

  const rendered = await renderTemplate({
    market: args.market,
    key:    'driver_welcome',
    context: {
      first_name:   args.fullName.split(' ')[0] ?? '',
      brand_name:   brandName,
      login_url:    `${baseUrl}/distribution/login`,
      magic_link:   magicLink,
      driver_email: args.email,
      route_list:   routeList || '(none yet — ops will assign soon)',
      ops_email:    settings.ops_email ?? '',
    },
    brandName,
    brandColor: '#1A5FA8',
  })
  if (!rendered) return { queued: false, magicLink }

  const result = await enqueue({
    market:            args.market,
    template_key:      'driver_welcome',
    to_email:          args.email,
    to_name:           args.fullName || null,
    subject:           rendered.subject,
    body_html:         rendered.html,
    reply_to:          settings.ops_email || null,
    related_driver_id: args.userId,
  })
  return { queued: !('error' in result), magicLink }
}
