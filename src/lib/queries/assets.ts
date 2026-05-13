// ── src/lib/queries/assets.ts ─────────────────────────────────────────────────
// Shared query helpers for media_assets.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { MediaAssetRow }  from '@/types/db'

// ── Column lists ──────────────────────────────────────────────────────────────

/** Columns for dashboard readiness checks — status and readiness flags only */
export const ASSET_READINESS_COLS = [
  'id', 'status', 'asset_type', 'content_category',
  'needs_canva_graphic', 'permission_confirmed', 'alt_text',
  'has_web_crop', 'has_social_crop', 'has_print_crop',
  'linked_submission_id', 'linked_advertiser_id',
].join(', ')

/** Columns for the asset library grid view */
export const ASSET_LIBRARY_COLS = [
  'id', 'filename', 'title', 'alt_text',
  'storage_url', 'thumbnail_url',
  'asset_type', 'content_category', 'publication', 'upload_source', 'tags',
  'width_px', 'height_px',
  'status',
  'needs_canva_graphic', 'needs_social_square', 'needs_print_crop',
  'needs_homepage_hero', 'needs_quote_graphic',
  'permission_confirmed', 'has_web_crop', 'has_social_crop',
  'linked_submission_id', 'linked_advertiser_id', 'linked_guide_slug',
  'created_at', 'updated_at',
].join(', ')

// ── Query helpers ─────────────────────────────────────────────────────────────

/**
 * Lightweight asset summary for dashboard readiness counts.
 * Does not load storage URLs or full metadata.
 */
export async function getAssetReadinessSummary(
  db: SupabaseClient,
): Promise<MediaAssetRow[]> {
  const { data } = await db
    .from('media_assets')
    .select(ASSET_READINESS_COLS)
    .neq('status', 'archived')
    .limit(500)
  return (data ?? []) as unknown as MediaAssetRow[]
}

/**
 * Assets actively needing design/Canva work.
 * Used by the Design Queue view and intelligence operational section.
 */
export async function getAssetsNeedingDesign(
  db: SupabaseClient,
): Promise<MediaAssetRow[]> {
  const { data } = await db
    .from('media_assets')
    .select(ASSET_LIBRARY_COLS)
    .or([
      'needs_canva_graphic.eq.true',
      'needs_social_square.eq.true',
      'needs_print_crop.eq.true',
      'needs_homepage_hero.eq.true',
      'needs_quote_graphic.eq.true',
    ].join(','))
    .is('graphic_completed_at', null)
    .order('created_at', { ascending: false })
    .limit(200)
  return (data ?? []) as unknown as MediaAssetRow[]
}

/**
 * Assets with status 'uploaded' or 'needs_review' — new arrivals to review.
 */
export async function getAssetsNeedingReview(
  db: SupabaseClient,
): Promise<MediaAssetRow[]> {
  const { data } = await db
    .from('media_assets')
    .select(ASSET_LIBRARY_COLS)
    .in('status', ['uploaded', 'needs_review'])
    .order('created_at', { ascending: false })
    .limit(100)
  return (data ?? []) as unknown as MediaAssetRow[]
}

/**
 * Single asset by ID with full column set.
 */
export async function getAssetById(
  db: SupabaseClient,
  id: string,
): Promise<MediaAssetRow | null> {
  const { data } = await db
    .from('media_assets')
    .select('*')
    .eq('id', id)
    .single()
  return (data ?? null) as unknown as MediaAssetRow | null
}

/**
 * Assets linked to a specific community submission.
 */
export async function getAssetsBySubmission(
  db: SupabaseClient,
  submissionId: string,
): Promise<MediaAssetRow[]> {
  const { data } = await db
    .from('media_assets')
    .select(ASSET_LIBRARY_COLS)
    .eq('linked_submission_id', submissionId)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as unknown as MediaAssetRow[]
}

/**
 * IDs of submissions already linked to an asset record.
 * Used in the submissions view to flag "already in library."
 */
export async function getLinkedSubmissionIds(
  db: SupabaseClient,
): Promise<Set<string>> {
  const { data } = await db
    .from('media_assets')
    .select('linked_submission_id')
    .not('linked_submission_id', 'is', null)
    .limit(1000)
  return new Set(
    (data ?? []).map((r: { linked_submission_id: string }) => r.linked_submission_id)
  )
}
