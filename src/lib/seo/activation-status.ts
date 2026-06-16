// ── SEO activation status detector ───────────────────────────────────────
//
// Reports whether each prerequisite for the SEO stack is in place:
//   1. Migration 187: search_console_data + redirects + not_found_log +
//                     internal_link_suggestions + seo_audit_runs + guide_articles
//                     SEO override columns.
//   2. Migration 188: brand_seo_profiles
//   3. Migration 189: seo_authors
//   4. GSC env vars: GSC_SERVICE_ACCOUNT_JSON + GSC_SITE_URLS
//   5. GSC data:     at least one row in search_console_data (proves the
//                    importer has run successfully end-to-end)
//
// Drives the wizard widget at the top of /admin/seo so the editor sees
// exactly what's blocking the stack from lighting up — no more guessing.

import type { SupabaseClient } from '@supabase/supabase-js'
import { isGscConfigured } from '@/lib/seo/gsc'

export type StepStatus = 'ok' | 'missing' | 'unknown'

export interface ActivationStep {
  key:         string
  title:       string
  description: string
  status:      StepStatus
  action?:     { label: string; href?: string; hint?: string }
}

export interface ActivationReport {
  fullyActivated: boolean
  steps:          ActivationStep[]
  blockerCount:   number
}

export async function getActivationStatus(sb: SupabaseClient): Promise<ActivationReport> {
  // Each migration is detected by a head=true SELECT on the table it
  // creates. If the relation doesn't exist Supabase returns the
  // PostgREST PGRST205 / 42P01 error — we treat that as 'missing'.
  const [m187, m188, m189, m190, m191, m192, m193, gscData] = await Promise.all([
    tableExists(sb, 'search_console_data'),
    tableExists(sb, 'brand_seo_profiles'),
    tableExists(sb, 'seo_authors'),
    columnExists(sb, 'brand_seo_profiles', 'editorial_prefs'),
    tableExists(sb, 'page_metadata_overrides'),
    tableExists(sb, 'social_queue'),
    tableExists(sb, 'themed_campaigns'),
    countRows  (sb, 'search_console_data'),
  ])

  const gscConfigured = isGscConfigured()

  const steps: ActivationStep[] = [
    {
      key:         '187',
      title:       'Migration 187 — SEO data layer',
      description: 'Adds the guide_articles SEO override columns + redirects + not_found_log + internal_link_suggestions + search_console_data + seo_audit_runs.',
      status:      m187 ? 'ok' : 'missing',
      action:      m187 ? undefined : {
        label: 'Run 187_seo_data_layer.sql',
        hint:  'supabase/migrations/187_seo_data_layer.sql',
      },
    },
    {
      key:         '188',
      title:       'Migration 188 — Brand SEO profiles',
      description: 'Adds brand_seo_profiles (pillars, sub-areas, personas, calendar, linkable assets, voice notes, negative space).',
      status:      m188 ? 'ok' : 'missing',
      action:      m188 ? undefined : {
        label: 'Run 188_brand_seo_profiles.sql',
        hint:  'supabase/migrations/188_brand_seo_profiles.sql',
      },
    },
    {
      key:         '189',
      title:       'Migration 189 — Author profiles',
      description: 'Adds seo_authors (bio, headshot, credentials, social URLs) for E-E-A-T-rich Person JSON-LD.',
      status:      m189 ? 'ok' : 'missing',
      action:      m189 ? undefined : {
        label: 'Run 189_seo_authors.sql',
        hint:  'supabase/migrations/189_seo_authors.sql',
      },
    },
    {
      key:         '190',
      title:       'Migration 190 — Brand profile extensions',
      description: 'Adds editorial_prefs + competitor_intel + last_generation_meta to brand_seo_profiles. Required for the family-template-aware regenerate.',
      status:      m190 ? 'ok' : 'missing',
      action:      m190 ? undefined : {
        label: 'Run 190_brand_profile_extensions.sql',
        hint:  'supabase/migrations/190_brand_profile_extensions.sql',
      },
    },
    {
      key:         '191',
      title:       'Migration 191 — Page metadata overrides',
      description: 'Adds page_metadata_overrides for the Yoast/MashShare-style per-route social sharing editor (covers static pages, not just articles).',
      status:      m191 ? 'ok' : 'missing',
      action:      m191 ? undefined : {
        label: 'Run 191_page_metadata_overrides.sql',
        hint:  'supabase/migrations/191_page_metadata_overrides.sql',
      },
    },
    {
      key:         '192',
      title:       'Migration 192 — Social rotation engine',
      description: 'Adds social_schedules + social_queue + social_post_outputs. The continuous-engagement layer that auto-recycles content to social.',
      status:      m192 ? 'ok' : 'missing',
      action:      m192 ? undefined : {
        label: 'Run 192_social_rotation.sql',
        hint:  'supabase/migrations/192_social_rotation.sql',
      },
    },
    {
      key:         '193',
      title:       'Migration 193 — Themed campaigns',
      description: 'Adds themed_campaigns + linked articles + sponsors. The editorial campaign system around monthly themes (e.g. Big Birthday Issue).',
      status:      m193 ? 'ok' : 'missing',
      action:      m193 ? undefined : {
        label: 'Run 193_themed_campaigns.sql',
        hint:  'supabase/migrations/193_themed_campaigns.sql',
      },
    },
    {
      key:         'gsc-env',
      title:       'Search Console env vars',
      description: 'GSC_SERVICE_ACCOUNT_JSON + GSC_SITE_URLS on Vercel. Without these the GSC sync is a no-op.',
      status:      gscConfigured ? 'ok' : 'missing',
      action:      gscConfigured ? undefined : {
        label: 'Set env vars on Vercel',
        hint:  'See the activation card below for the exact steps.',
      },
    },
    {
      key:         'gsc-data',
      title:       'First GSC sync',
      description: 'At least one row in search_console_data. Proves the importer authenticated and imported successfully.',
      status:      !m187            ? 'unknown'
                 : !gscConfigured   ? 'missing'
                 : gscData > 0      ? 'ok'
                 :                    'missing',
      action:      (m187 && gscConfigured && gscData === 0) ? {
        label: 'Run a sync now',
        hint:  'Use the Search Console sync widget below to import 28 days.',
      } : undefined,
    },
  ]

  const blockerCount  = steps.filter(s => s.status === 'missing').length
  const fullyActivated = blockerCount === 0

  return { fullyActivated, steps, blockerCount }
}

/** Probe whether a table exists without pulling data. Returns false when
 *  the relation is missing or RLS blocks access (which shouldn't happen
 *  with the service-role client). */
async function tableExists(sb: SupabaseClient, table: string): Promise<boolean> {
  const { error } = await sb.from(table).select('*', { count: 'exact', head: true }).limit(1)
  if (!error) return true
  const code = (error as { code?: string }).code ?? ''
  const msg  = error.message ?? ''
  // PostgREST "table not found" codes.
  if (code === '42P01' || code === 'PGRST205' || /relation .* does not exist/i.test(msg) || /could not find the table/i.test(msg)) {
    return false
  }
  // Some other error — treat as unknown but not blocking.
  return true
}

/** Returns 0 when the table is missing OR genuinely empty — caller uses
 *  the combination of tableExists + countRows to disambiguate. */
async function countRows(sb: SupabaseClient, table: string): Promise<number> {
  const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true })
  if (error) return 0
  return count ?? 0
}

/** Probe whether a specific column exists on a table. Used to detect
 *  ALTER TABLE migrations that don't create the table itself. */
async function columnExists(sb: SupabaseClient, table: string, column: string): Promise<boolean> {
  const { error } = await sb.from(table).select(column).limit(1)
  if (!error) return true
  const code = (error as { code?: string }).code ?? ''
  const msg  = error.message ?? ''
  if (code === '42703' || code === 'PGRST204' || /column .* does not exist/i.test(msg) || /could not find the .* column/i.test(msg)) {
    return false
  }
  return true
}
