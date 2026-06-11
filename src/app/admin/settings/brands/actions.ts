'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { recordAuditEvent } from '@/lib/admin/audit'
import { ALL_MARKET_SLUGS } from '@/lib/markets'

interface SaveBrandInput {
  brandSlug:        string
  audienceSummary:  string
  voiceRules:       string
  avoidList:        string
  formatDefault:    string
  siteUrl:          string
  ghlTag:           string
}

export async function saveBrandVoiceAction(input: SaveBrandInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  if (!ALL_MARKET_SLUGS.includes(input.brandSlug)) {
    return { ok: false, error: `Unknown brand slug: ${input.brandSlug}` }
  }
  const sr = createAdminClient()
  const { error } = await sr.from('brand_voice').upsert({
    brand_slug:        input.brandSlug,
    audience_summary:  input.audienceSummary.trim(),
    voice_rules:       input.voiceRules.trim(),
    avoid_list:        input.avoidList.trim(),
    format_default:    input.formatDefault.trim(),
    site_url:          input.siteUrl.trim() || null,
    ghl_tag:           input.ghlTag.trim() || null,
    updated_at:        new Date().toISOString(),
    updated_by:        ctx.adminId,
  }, { onConflict: 'brand_slug' })
  if (error) return { ok: false, error: error.message }

  await recordAuditEvent({
    ctx, action: 'brand_voice.updated', target_table: 'brand_voice', target_id: input.brandSlug,
    after: { has_audience: !!input.audienceSummary, has_voice: !!input.voiceRules },
  })
  revalidatePath('/admin/settings/brands')
  return { ok: true }
}
