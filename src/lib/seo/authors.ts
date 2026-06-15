// ── seo_authors helpers ──────────────────────────────────────────────────
//
// One row per editor-curated author profile, keyed by author_slug. The
// public author page calls loadAuthorProfile() to enrich the auto-
// generated bio/headshot/credentials with editor-set values.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface SocialUrl {
  platform: string
  url:      string
}

export interface AuthorProfile {
  authorSlug:       string
  displayName:      string
  bio:              string | null
  headshotUrl:      string | null
  jobTitle:         string | null
  credentials:      string[]
  knowsAbout:       string[]
  socialUrls:       SocialUrl[]
  contactEmail:     string | null
  primaryBrandSlug: string | null
}

/** Load a single author profile or null if no row exists. */
export async function loadAuthorProfile(
  sb:         SupabaseClient,
  authorSlug: string,
): Promise<AuthorProfile | null> {
  const { data } = await sb
    .from('seo_authors')
    .select('author_slug, display_name, bio, headshot_url, job_title, credentials, knows_about, social_urls, contact_email, primary_brand_slug')
    .eq('author_slug', authorSlug)
    .maybeSingle()
  if (!data) return null
  return rowToProfile(data as RawRow)
}

/** Bulk load — used by the admin index page that lists every author
 *  with quick "has bio / has headshot / has socials" indicators. */
export async function listAuthorProfiles(sb: SupabaseClient): Promise<AuthorProfile[]> {
  const { data } = await sb
    .from('seo_authors')
    .select('author_slug, display_name, bio, headshot_url, job_title, credentials, knows_about, social_urls, contact_email, primary_brand_slug')
    .order('display_name')
  return ((data as RawRow[] | null) ?? []).map(rowToProfile)
}

export async function saveAuthorProfile(
  sb:      SupabaseClient,
  input:   AuthorProfile,
  editedBy?: string,
): Promise<void> {
  const row = {
    author_slug:        input.authorSlug,
    display_name:       input.displayName,
    bio:                input.bio ?? null,
    headshot_url:       input.headshotUrl ?? null,
    job_title:          input.jobTitle ?? null,
    credentials:        input.credentials,
    knows_about:        input.knowsAbout,
    social_urls:        input.socialUrls,
    contact_email:      input.contactEmail ?? null,
    primary_brand_slug: input.primaryBrandSlug ?? null,
    last_edited_by:     editedBy ?? null,
  }
  const { error } = await sb.from('seo_authors').upsert(row, { onConflict: 'author_slug' })
  if (error) throw new Error(`Save author profile failed: ${error.message}`)
}

interface RawRow {
  author_slug:        string
  display_name:       string
  bio:                string | null
  headshot_url:       string | null
  job_title:          string | null
  credentials:        string[] | null
  knows_about:        string[] | null
  social_urls:        SocialUrl[] | null
  contact_email:      string | null
  primary_brand_slug: string | null
}

function rowToProfile(r: RawRow): AuthorProfile {
  return {
    authorSlug:       r.author_slug,
    displayName:      r.display_name,
    bio:              r.bio,
    headshotUrl:      r.headshot_url,
    jobTitle:         r.job_title,
    credentials:      r.credentials      ?? [],
    knowsAbout:       r.knows_about      ?? [],
    socialUrls:       Array.isArray(r.social_urls) ? r.social_urls : [],
    contactEmail:     r.contact_email,
    primaryBrandSlug: r.primary_brand_slug,
  }
}
