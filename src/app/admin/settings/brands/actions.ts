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
  // Chrome (migration 162)
  tagline:                  string
  logoUrl:                  string
  primaryColorHex:          string
  accentColorHex:           string
  contactEmail:             string
  socialFacebook:           string
  socialInstagram:          string
  homepageRotationColumns:  string[]
  // GHL routing (migration 164)
  ghlNewsletterListId:      string
  ghlSubscriberTag:         string
  ghlWelcomeWorkflowId:     string
}

// Reject hex colors that don't parse — typos here ripple into every
// rendered page and CSS variables silently break. Accept #abc, #abcd,
// #aabbcc, #aabbccdd.
const HEX_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

export async function saveBrandVoiceAction(input: SaveBrandInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  if (!ALL_MARKET_SLUGS.includes(input.brandSlug)) {
    return { ok: false, error: `Unknown brand slug: ${input.brandSlug}` }
  }
  if (input.primaryColorHex && !HEX_RE.test(input.primaryColorHex)) {
    return { ok: false, error: `Primary color "${input.primaryColorHex}" isn't a valid hex (e.g. #ef6442).` }
  }
  if (input.accentColorHex && !HEX_RE.test(input.accentColorHex)) {
    return { ok: false, error: `Accent color "${input.accentColorHex}" isn't a valid hex.` }
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
    tagline:                  input.tagline.trim()             || null,
    logo_url:                 input.logoUrl.trim()             || null,
    primary_color_hex:        input.primaryColorHex.trim()      || null,
    accent_color_hex:         input.accentColorHex.trim()       || null,
    contact_email:            input.contactEmail.trim()         || null,
    social_facebook:          input.socialFacebook.trim()       || null,
    social_instagram:         input.socialInstagram.trim()      || null,
    homepage_rotation_columns: input.homepageRotationColumns.length > 0 ? input.homepageRotationColumns : null,
    ghl_newsletter_list_id:    input.ghlNewsletterListId.trim()    || null,
    ghl_subscriber_tag:        input.ghlSubscriberTag.trim()       || null,
    ghl_welcome_workflow_id:   input.ghlWelcomeWorkflowId.trim()   || null,
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
