// ── /admin/integrations ─────────────────────────────────────────────────────
// Roadmap of external service connections. Each one is its own dedicated
// page with a setup walkthrough, status panel, and sync log. The index
// surfaces the full landscape so you see what's available now, what we
// recommend wiring next, and what's deferred — and *why* for each.
//
// Discipline: only Tier 1 should ever ship without a clear ROI story.
// "Could we" isn't the same as "should we." A bad integration costs more
// in maintenance than its value returns.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Megaphone, ChevronRight, CheckCircle2, AlertCircle, Clock,
  Sparkles, MapPin, Search, CreditCard, MessageCircle, Mail, MessageSquare,
  Eye, Calendar, Building2,
} from 'lucide-react'

export const metadata: Metadata = { title: 'Integrations — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ── Roadmap definition ─────────────────────────────────────────────────────
// Each entry is fully self-describing so a new admin or new developer can
// understand the whole picture from this file alone.

type IntegrationStatus = 'available' | 'recommended' | 'future' | 'skip'

interface IntegrationRow {
  id:           string
  name:         string
  category:     string
  status:       IntegrationStatus
  icon:         React.ElementType
  href?:        string
  unlocks:      string
  whyValuable:  string
  /** Connected/Setup state — only populated for "available" rows. */
  connected?:   boolean
  subtitle?:    string | null
}

const ROADMAP: IntegrationRow[] = [
  // ── Tier 1 — Available ────────────────────────────────────────────────
  {
    id: 'facebook',
    name: 'Facebook Marketing',
    category: 'Ads',
    status: 'available',
    icon: Megaphone,
    href: '/admin/integrations/facebook',
    unlocks: 'Pulls campaign spend / impressions / clicks / leads nightly. Drives the Facebook section of the advertiser monthly report.',
    whyValuable: 'You already run social ads through RRP\'s own ad account on behalf of advertisers. This makes campaign performance visible alongside listing taps + form fills, so renewal pitches use real numbers.',
  },

  // ── Tier 1 — Recommended next ────────────────────────────────────────
  {
    id: 'ai',
    name: 'AI (OpenAI + Anthropic)',
    category: 'Automation',
    status: 'available',
    icon: Sparkles,
    href: '/admin/integrations/ai',
    unlocks: 'Centralized LLM keys for editorial drafting, brain-games content generation, coaching-insight generation on advertiser reports, social-caption assist.',
    whyValuable: 'You\'re already using AI in spots (games + insights). Centralizing makes it auditable + rotatable, removes hardcoded keys, and gives every team member access to the same models with usage tracking. Foundation for everything intelligent we build next.',
  },
  {
    id: 'gbp',
    name: 'Google Business Profile',
    category: 'Local SEO',
    status: 'available',
    icon: MapPin,
    href: '/admin/integrations/google-business',
    unlocks: 'Post updates, view local-search insights, track call clicks + direction requests. Phase 1: RRP\'s own GBP. Phase 2 (deferred): per-advertiser GBP upsell.',
    whyValuable: 'Phase 1 improves RRP\'s local discovery, which feeds Google search referrals. Phase 2 is a real advertiser upsell — "post to your GBP from your KeepSharing dashboard."',
  },
  {
    id: 'gsc',
    name: 'Google Search Console',
    category: 'Editorial',
    status: 'available',
    icon: Search,
    href: '/admin/integrations/search-console',
    unlocks: 'Top search queries landing readers on each article, indexing health, sitemap status, mobile usability flags.',
    whyValuable: 'Editorial intelligence Plausible can\'t give. Tells you what to commission more of based on what people are actually searching for. Surfaces SEO issues before they tank traffic.',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'Revenue',
    status: 'available',
    icon: CreditCard,
    href: '/admin/integrations/stripe',
    unlocks: 'Centralized product catalog, subscription mirror, charge log, webhook heartbeat. Layers on top of the existing per-product flows (birthday spotlight, ad booking).',
    whyValuable: 'Already on the Phase 2 backlog. Eliminates manual invoicing, captures advertisers in the moment of intent, enables true recurring revenue.',
  },
  {
    id: 'meta-suite',
    name: 'Meta Business Suite (Pages)',
    category: 'Social',
    status: 'available',
    icon: MessageCircle,
    href: '/admin/integrations/meta-suite',
    unlocks: 'Post directly to your Facebook Page + Instagram (cross-post), AI caption assist, comments inbox with one-click replies.',
    whyValuable: 'Reuses the Meta token from Marketing. Combined with the AI integration, editorial doesn\'t leave admin to do social ops.',
  },

  // ── Tier 2 — Future consideration ────────────────────────────────────
  {
    id: 'newsletter',
    name: 'Newsletter (Mailchimp / Beehiiv)',
    category: 'Email',
    status: 'future',
    icon: Mail,
    unlocks: 'Auto-sync new articles to newsletter, see per-article opens + clicks, manage subscriber lists from admin.',
    whyValuable: 'Pick one based on what you already use. Beehiiv is newer + better at revenue features (paid subscriptions, sponsorships). Mailchimp is more familiar. Either becomes valuable when you have ≥1 newsletter publishing weekly.',
  },
  {
    id: 'twilio',
    name: 'Twilio (SMS)',
    category: 'Communication',
    status: 'future',
    icon: MessageSquare,
    unlocks: 'Send advertiser report links via SMS, customer-support texting, reminders for renewal conversations.',
    whyValuable: 'SMS to PH-based VAs is often more reliable than email. Also useful for the "Pam, your report is ready" nudge that gets advertisers to actually click. Add when SMS traffic is a real need.',
  },
  {
    id: 'session-recordings',
    name: 'Session recordings (Hotjar / PostHog)',
    category: 'UX',
    status: 'future',
    icon: Eye,
    unlocks: 'Watch how readers actually move through guide pages — where they hover, what they tap, where they bounce.',
    whyValuable: 'About one hour a month of session-recording reviewing yields more UX insight than ten dashboards. Adds compliance overhead (consent banner) so worth doing right or not at all.',
  },
  {
    id: 'social-scheduler',
    name: 'Social scheduler (Buffer / Later)',
    category: 'Social',
    status: 'future',
    icon: Calendar,
    unlocks: 'Schedule cross-platform posts (Facebook / Instagram / TikTok) from one admin surface.',
    whyValuable: 'Only valuable if Meta Business Suite\'s native scheduler doesn\'t cover the workflow. Re-evaluate after the Meta Suite integration ships.',
  },
  {
    id: 'youtube',
    name: 'YouTube Data API',
    category: 'Content',
    status: 'future',
    icon: Building2,
    unlocks: 'Embed your YouTube videos contextually, see per-video views + watch time, sync video metadata.',
    whyValuable: 'Only relevant when RRP is investing in video. Wait until that\'s actually happening.',
  },
]

const SECTION_DEFS: Array<{ status: IntegrationStatus; title: string; subtitle: string }> = [
  {
    status: 'available',
    title: 'Available now',
    subtitle: 'Configured + ready to use.',
  },
  {
    status: 'recommended',
    title: 'Recommended next',
    subtitle: 'High-ROI for a regional publication. Each one earns its monthly maintenance.',
  },
  {
    status: 'future',
    title: 'Future consideration',
    subtitle: 'Wait until the workflow actually demands it. Premature integrations create maintenance debt.',
  },
]

export default async function IntegrationsIndexPage() {
  const supabase = supabaseAdmin()

  // Probe Facebook connection state for the "available" row.
  let fbConnected = false
  let fbName: string | null = null
  let fbReady = false
  try {
    const probe = await supabase.from('facebook_integrations').select('id').limit(1)
    fbReady = !probe.error
    if (fbReady) {
      const { data } = await supabase
        .from('facebook_integrations')
        .select('is_active, ad_account_name')
        .eq('market', 'rrp')
        .maybeSingle()
      const row = data as { is_active: boolean; ad_account_name: string | null } | null
      fbConnected = !!row?.is_active
      fbName      = row?.ad_account_name ?? null
    }
  } catch {/* fall through */}

  // Probe AI connection state.
  let aiReady       = false
  let aiAnyConnected = false
  let aiProviders: string[] = []
  try {
    const probe = await supabase.from('ai_integrations').select('id').limit(1)
    aiReady = !probe.error
    if (aiReady) {
      const { data } = await supabase
        .from('ai_integrations')
        .select('provider, is_active')
      const rows = (data ?? []) as Array<{ provider: string; is_active: boolean }>
      const active = rows.filter(r => r.is_active)
      aiAnyConnected = active.length > 0
      aiProviders    = active.map(r => r.provider)
    }
  } catch {/* fall through */}
  const aiEnvFallback = !aiAnyConnected && (!!process.env.ANTHROPIC_API_KEY || !!process.env.OPENAI_API_KEY)

  // Probe Search Console connection state.
  let gscReady     = false
  let gscConnected = false
  let gscProperty: string | null = null
  try {
    const probe = await supabase.from('search_console_integrations').select('id').limit(1)
    gscReady = !probe.error
    if (gscReady) {
      const { data } = await supabase
        .from('search_console_integrations')
        .select('property_url, is_active')
        .maybeSingle()
      const r = data as { property_url: string; is_active: boolean } | null
      gscConnected = !!r?.is_active
      gscProperty  = r?.property_url ?? null
    }
  } catch {/* fall through */}
  const gscEnvOk = !!process.env.GOOGLE_OAUTH_CLIENT_ID && !!process.env.GOOGLE_OAUTH_CLIENT_SECRET

  // Probe Google Business Profile connection state.
  let gbpReady     = false
  let gbpConnected = false
  let gbpName: string | null = null
  try {
    const probe = await supabase.from('google_business_integrations').select('id').limit(1)
    gbpReady = !probe.error
    if (gbpReady) {
      const { data } = await supabase
        .from('google_business_integrations')
        .select('location_name, is_active')
        .maybeSingle()
      const r = data as { location_name: string | null; is_active: boolean } | null
      gbpConnected = !!r?.is_active
      gbpName      = r?.location_name ?? null
    }
  } catch {/* fall through */}
  const gbpEnvOk = gscEnvOk   // shared Google OAuth client

  // Probe Stripe connection state (env-fallback supported).
  let stripeReady     = false
  let stripeConnected = false
  let stripeMode      = ''
  try {
    const probe = await supabase.from('stripe_integrations').select('id').limit(1)
    stripeReady = !probe.error
    if (stripeReady) {
      const { data } = await supabase
        .from('stripe_integrations')
        .select('is_active, is_test_mode, account_name, account_id')
        .eq('is_active', true)
        .maybeSingle()
      const r = data as { is_active: boolean; is_test_mode: boolean; account_name: string | null; account_id: string | null } | null
      stripeConnected = !!r?.is_active
      stripeMode      = r ? (r.is_test_mode ? 'Test' : 'Live') : ''
    }
  } catch {/* fall through */}
  const stripeEnvFallback = !stripeConnected && !!process.env.STRIPE_SECRET_KEY

  // Probe Meta Business Suite (extends facebook_integrations with facebook_pages).
  let metaSuiteReady = false
  let metaPageCount  = 0
  try {
    const probe = await supabase.from('facebook_pages').select('id').limit(1)
    metaSuiteReady = !probe.error
    if (metaSuiteReady) {
      const { count } = await supabase.from('facebook_pages').select('id', { count: 'exact', head: true }).eq('is_active', true)
      metaPageCount = count ?? 0
    }
  } catch {/* fall through */}

  // Splice live state back into the static roadmap.
  const enriched: IntegrationRow[] = ROADMAP.map(r => {
    if (r.id === 'facebook') {
      return {
        ...r,
        connected: fbConnected,
        subtitle:  !fbReady    ? 'Migration 137 pending'
                  : fbConnected ? `Connected — ${fbName ?? 'ad account active'}`
                                : 'Not connected — paste a token to enable',
      }
    }
    if (r.id === 'ai') {
      return {
        ...r,
        connected: aiAnyConnected,
        subtitle:  !aiReady           ? 'Migration 148 pending'
                  : aiAnyConnected     ? `Connected — ${aiProviders.join(' + ')}`
                  : aiEnvFallback      ? 'Env-var fallback active — connect to track usage + cap spend'
                                       : 'Not connected — paste a key to enable',
      }
    }
    if (r.id === 'gsc') {
      return {
        ...r,
        connected: gscConnected,
        subtitle:  !gscReady    ? 'Migration 149 pending'
                  : !gscEnvOk    ? 'OAuth env vars missing — see setup page'
                  : gscConnected ? `Connected — ${gscProperty ?? 'property active'}`
                                 : 'Not connected — paste a refresh token to enable',
      }
    }
    if (r.id === 'gbp') {
      return {
        ...r,
        connected: gbpConnected,
        subtitle:  !gbpReady    ? 'Migration 150 pending'
                  : !gbpEnvOk    ? 'OAuth env vars missing — see setup page'
                  : gbpConnected ? `Connected — ${gbpName ?? 'location active'}`
                                 : 'Not connected — paste a refresh token to enable',
      }
    }
    if (r.id === 'stripe') {
      return {
        ...r,
        connected: stripeConnected || stripeEnvFallback,
        subtitle:  !stripeReady        ? 'Migration 151 pending'
                  : stripeConnected     ? `Connected — ${stripeMode} mode`
                  : stripeEnvFallback   ? 'Env-var keys active — connect to enable products catalog'
                                        : 'Not connected — paste API keys to enable',
      }
    }
    if (r.id === 'meta-suite') {
      return {
        ...r,
        connected: metaPageCount > 0,
        subtitle:  !metaSuiteReady    ? 'Migration 152 pending'
                  : !fbConnected       ? 'Connect Facebook Marketing first'
                  : metaPageCount > 0  ? `${metaPageCount} Page${metaPageCount === 1 ? '' : 's'} connected`
                                       : 'Marketing connected — re-auth with Page scopes + discover Pages',
      }
    }
    return r
  })

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <h1 className="portal-page-title">Integrations</h1>
        <p className="portal-page-subtitle">
          External data sources, automation, and publishing surfaces. Each connection has its own setup walkthrough,
          credential rotation, and sync log. We add new integrations deliberately — five well-maintained beats twenty half-broken.
        </p>
      </div>

      <div className="p-6 max-w-4xl space-y-8">
        {SECTION_DEFS.map(section => {
          const rows = enriched.filter(r => r.status === section.status)
          if (rows.length === 0) return null
          return (
            <section key={section.status}>
              <div className="mb-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-portal-sub">{section.title}</h2>
                <p className="text-[11px] text-portal-muted mt-0.5">{section.subtitle}</p>
              </div>
              <div className="bg-white border border-portal-border rounded-lg overflow-hidden divide-y divide-portal-border">
                {rows.map(r => <IntegrationCard key={r.id} row={r} />)}
              </div>
            </section>
          )
        })}

        <p className="text-[11px] text-portal-muted leading-relaxed pt-4 border-t border-portal-border">
          <strong>Why this isn&apos;t just &ldquo;all integrations always.&rdquo;</strong> Every integration adds an auth surface, an API to monitor for breaking changes, a credential to rotate, and a sync to debug at 11pm when something fails.
          The trick is picking the few that compound real value — for a regional family publication that means
          AI (automate what scales), Google Business Profile (local discovery + advertiser upsell), Google Search Console (editorial intelligence),
          Stripe (recurring revenue), and Meta Business Suite (close the social loop). Everything else waits.
        </p>
      </div>
    </div>
  )
}

function IntegrationCard({ row }: { row: IntegrationRow }) {
  const Icon = row.icon
  const isAvailable = row.status === 'available'
  const linkProps   = row.href ? { href: row.href as string } : null

  const Card = (
    <div className={`flex items-start gap-4 px-5 py-4 ${linkProps ? 'hover:bg-portal-bg transition-colors' : ''}`}>
      <div className="shrink-0 w-10 h-10 rounded-lg bg-portal-blue-lt flex items-center justify-center text-portal-blue">
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-portal-text">{row.name}</h3>
          <span className="text-[10px] font-bold uppercase tracking-wider text-portal-muted">{row.category}</span>
          {isAvailable && row.connected !== undefined && (
            row.connected
              ? <span className="text-[10px] font-bold uppercase tracking-wider text-portal-green bg-portal-green-lt border border-portal-green/30 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <CheckCircle2 size={9} /> Connected
                </span>
              : <span className="text-[10px] font-bold uppercase tracking-wider text-portal-sub bg-portal-bg border border-portal-border px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <AlertCircle size={9} /> Not connected
                </span>
          )}
          {row.status === 'recommended' && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-portal-amber bg-portal-amber-lt border border-portal-amber/30 px-1.5 py-0.5 rounded-full">
              Recommended
            </span>
          )}
          {row.status === 'future' && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-portal-muted bg-portal-bg border border-portal-border px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <Clock size={9} /> Future
            </span>
          )}
        </div>
        <p className="text-xs text-portal-text mt-1 leading-snug">{row.unlocks}</p>
        <p className="text-[11px] text-portal-sub mt-2 leading-relaxed italic">{row.whyValuable}</p>
        {row.subtitle && (
          <p className="text-[10px] text-portal-muted mt-2">{row.subtitle}</p>
        )}
      </div>
      {linkProps && (
        <ChevronRight size={16} className="text-portal-muted shrink-0 mt-1" />
      )}
    </div>
  )

  if (linkProps) {
    return <Link href={linkProps.href} className="block">{Card}</Link>
  }
  return Card
}
