'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { recordAuditEvent } from '@/lib/admin/audit'
import { ALL_MARKET_SLUGS } from '@/lib/markets'
import { runAI } from '@/lib/ai/client'
import { loadBrand, buildBrandPromptFragment } from '@/lib/brands'

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
}

interface SaveListingInput {
  id?:                 string         // omit to create
  brandSlug:           string
  kind:                'business' | 'expert'
  name:                string
  slug?:               string         // auto from name when omitted
  summary:             string
  description:         string
  categorySlugs:       string[]
  address:             string
  city:                string
  state:               string
  zip:                 string
  phone:               string
  website:             string
  email:               string
  hours:               string
  heroImageUrl:        string
  isFeatured:          boolean
  advertiserAccountId: string | null
  status:              'pending' | 'published' | 'archived'
}

export async function saveListingAction(input: SaveListingInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  if (!ALL_MARKET_SLUGS.includes(input.brandSlug)) return { ok: false, error: `Unknown brand: ${input.brandSlug}` }
  if (!input.name.trim()) return { ok: false, error: 'Name is required.' }

  const sr = createAdminClient()
  const slug = (input.slug?.trim() || slugify(input.name)).trim()
  if (!slug) return { ok: false, error: 'Slug could not be derived from name.' }

  const isNew = !input.id
  const row = {
    brand_slug:            input.brandSlug,
    kind:                  input.kind,
    slug,
    name:                  input.name.trim(),
    summary:               input.summary.trim() || null,
    description:           input.description.trim() || null,
    category_slugs:        input.categorySlugs,
    address:               input.address.trim() || null,
    city:                  input.city.trim() || null,
    state:                 input.state.trim() || null,
    zip:                   input.zip.trim() || null,
    phone:                 input.phone.trim() || null,
    website:               input.website.trim() || null,
    email:                 input.email.trim() || null,
    hours:                 input.hours.trim() || null,
    hero_image_url:        input.heroImageUrl.trim() || null,
    is_featured:           input.isFeatured,
    advertiser_account_id: input.advertiserAccountId || null,
    status:                input.status,
    updated_at:            new Date().toISOString(),
    ...(isNew ? { created_by: ctx.adminId } : {}),
    ...(input.status === 'published' && isNew ? { published_at: new Date().toISOString() } : {}),
  }

  if (isNew) {
    const { data, error } = await sr.from('directory_listings').insert(row).select('id').single()
    if (error) return { ok: false, error: error.message }
    await recordAuditEvent({
      ctx, action: 'directory_listing.created', target_table: 'directory_listings',
      target_id: (data as { id: string }).id, after: { name: input.name, brand_slug: input.brandSlug },
    })
    revalidatePath('/admin/directory')
    revalidatePath('/directory')
    return { ok: true, id: (data as { id: string }).id }
  } else {
    const { error } = await sr.from('directory_listings').update(row).eq('id', input.id!)
    if (error) return { ok: false, error: error.message }
    await recordAuditEvent({
      ctx, action: 'directory_listing.updated', target_table: 'directory_listings',
      target_id: input.id!, after: { name: input.name, status: input.status },
    })
    revalidatePath('/admin/directory')
    revalidatePath(`/admin/directory/${input.id}`)
    revalidatePath('/directory')
    revalidatePath(`/directory/${slug}`)
    return { ok: true, id: input.id! }
  }
}

export async function deleteListingAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()
  const { error } = await sr.from('directory_listings').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  await recordAuditEvent({
    ctx, action: 'directory_listing.deleted', target_table: 'directory_listings', target_id: id,
  })
  revalidatePath('/admin/directory')
  revalidatePath('/directory')
  return { ok: true }
}

interface SaveCategoryInput {
  id?:           string
  brandSlug:     string
  slug:          string
  name:          string
  description:   string
  emoji:         string
  displayOrder:  number | null
  isActive:      boolean
}

export async function saveCategoryAction(input: SaveCategoryInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  if (!ALL_MARKET_SLUGS.includes(input.brandSlug)) return { ok: false, error: `Unknown brand` }
  if (!input.slug.trim() || !input.name.trim()) return { ok: false, error: 'Slug + name required.' }
  const sr = createAdminClient()
  const row = {
    brand_slug:    input.brandSlug,
    slug:          input.slug.trim(),
    name:          input.name.trim(),
    description:   input.description.trim() || null,
    emoji:         input.emoji.trim() || null,
    display_order: input.displayOrder,
    is_active:     input.isActive,
  }
  if (input.id) {
    const { error } = await sr.from('directory_categories').update(row).eq('id', input.id)
    if (error) return { ok: false, error: error.message }
    await recordAuditEvent({
      ctx, action: 'directory_category.updated', target_table: 'directory_categories', target_id: input.id,
    })
    revalidatePath('/admin/directory/categories')
    revalidatePath('/directory')
    return { ok: true, id: input.id }
  }
  const { data, error } = await sr.from('directory_categories').insert({ ...row, created_by: ctx.adminId }).select('id').single()
  if (error) return { ok: false, error: error.message }
  await recordAuditEvent({
    ctx, action: 'directory_category.created', target_table: 'directory_categories',
    target_id: (data as { id: string }).id, after: row,
  })
  revalidatePath('/admin/directory/categories')
  revalidatePath('/directory')
  return { ok: true, id: (data as { id: string }).id }
}

export async function deleteCategoryAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()
  const { error } = await sr.from('directory_categories').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  await recordAuditEvent({
    ctx, action: 'directory_category.deleted', target_table: 'directory_categories', target_id: id,
  })
  revalidatePath('/admin/directory/categories')
  return { ok: true }
}

interface AIDraftInput {
  suggestionId: string
}

interface AIDraftResult {
  name?:         string
  summary?:      string
  description?:  string
  categorySlugs?: string[]
  city?:         string
  state?:        string
}

/** Generate AI-drafted listing fields from a submitter's notes. Called
 *  from the suggestion review UI. The output is structured JSON the
 *  editor edits before publishing. */
export async function generateSuggestionDraftAction(input: AIDraftInput): Promise<{ ok: true; draft: AIDraftResult } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()
  const { data: sugData } = await sr
    .from('directory_suggestions')
    .select('brand_slug, notes, submitted_data')
    .eq('id', input.suggestionId)
    .maybeSingle()
  const sug = sugData as { brand_slug: string; notes: string; submitted_data: Record<string, unknown> } | null
  if (!sug) return { ok: false, error: 'Suggestion not found.' }

  const brand = await loadBrand(sug.brand_slug)
  if (!brand) return { ok: false, error: `Brand not found: ${sug.brand_slug}` }
  const brandFragment = buildBrandPromptFragment(brand)

  // Load category options so the AI can pick reasonable matches.
  const { data: catData } = await sr.from('directory_categories')
    .select('slug, name')
    .eq('brand_slug', sug.brand_slug)
    .eq('is_active', true)
  const categories = (catData ?? []) as Array<{ slug: string; name: string }>

  const submitted = sug.submitted_data
  const prompt = [
    '## BRAND CONTEXT',
    brandFragment,
    '',
    '## TASK',
    'A community member suggested this business / expert for our local directory. Draft polished listing fields the editor will review.',
    '',
    '## SUBMITTER NOTES',
    sug.notes,
    '',
    '## SUBMITTED HINTS',
    JSON.stringify(submitted, null, 2),
    '',
    '## AVAILABLE CATEGORIES',
    categories.map(c => `- ${c.slug} (${c.name})`).join('\n') || '(none)',
    '',
    '## OUTPUT',
    'Return STRICT JSON with these fields (omit any you cannot confidently infer):',
    '{',
    '  "name":          "string — business / expert name",',
    '  "summary":       "string — one sentence, ~120 chars, what the reader needs to know",',
    '  "description":   "string — 3-5 short paragraphs, brand-voice, no exaggeration, no fabricated facts",',
    '  "categorySlugs": ["category-slug"],',
    '  "city":          "string",',
    '  "state":         "string"',
    '}',
    'Output JSON only — no markdown wrapper.',
  ].join('\n')

  try {
    const out = await runAI({
      taskKind: 'drafting',
      caller:   'directory.suggestion.draft',
      systemPrompt: 'You draft local directory listings for a regional family publication. Polished, specific, never inflated. Output JSON only.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 1000,
      adminId:  ctx.adminId,
    })
    let raw = out.text.trim()
    if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const draft = JSON.parse(raw) as AIDraftResult
    await sr.from('directory_suggestions').update({
      ai_draft: draft,
      ai_draft_generated_at: new Date().toISOString(),
    }).eq('id', input.suggestionId)
    revalidatePath('/admin/directory/suggestions')
    return { ok: true, draft }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

interface AcceptSuggestionInput {
  suggestionId: string
  listing:      Omit<SaveListingInput, 'id'>
}

export async function acceptSuggestionAction(input: AcceptSuggestionInput): Promise<{ ok: true; listingId: string } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()
  // Create the listing
  const saveResult = await saveListingAction(input.listing)
  if (!saveResult.ok) return saveResult
  await sr.from('directory_suggestions').update({
    status: 'accepted',
    resulting_listing_id: saveResult.id,
    reviewed_at: new Date().toISOString(),
    reviewed_by: ctx.adminId,
  }).eq('id', input.suggestionId)
  await recordAuditEvent({
    ctx, action: 'directory_suggestion.accepted', target_table: 'directory_suggestions',
    target_id: input.suggestionId, after: { listing_id: saveResult.id },
  })
  revalidatePath('/admin/directory/suggestions')
  revalidatePath('/admin/directory')
  return { ok: true, listingId: saveResult.id }
}

export async function rejectSuggestionAction(suggestionId: string, reason: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  if (!reason.trim()) return { ok: false, error: 'Reason required.' }
  const sr = createAdminClient()
  const { error } = await sr.from('directory_suggestions').update({
    status: 'rejected',
    rejected_reason: reason.trim(),
    reviewed_at: new Date().toISOString(),
    reviewed_by: ctx.adminId,
  }).eq('id', suggestionId)
  if (error) return { ok: false, error: error.message }
  await recordAuditEvent({
    ctx, action: 'directory_suggestion.rejected', target_table: 'directory_suggestions',
    target_id: suggestionId, after: { reason },
  })
  revalidatePath('/admin/directory/suggestions')
  return { ok: true }
}
