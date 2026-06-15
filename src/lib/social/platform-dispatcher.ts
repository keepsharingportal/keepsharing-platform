// ── Platform dispatcher — generic post-to-platform interface ──────────
//
// Wraps the existing meta-suite client (Facebook + Instagram) so the
// social rotation engine can dispatch posts without knowing the
// underlying API shape. Twitter + Pinterest stubs throw "not yet
// implemented" so failure logging stays clean.

import { createClient } from '@supabase/supabase-js'
import { createPagePost, createInstagramPost, metaSuiteErrorMessage } from '@/lib/integrations/meta-suite/client'

export interface PlatformPostInput {
  caption:   string
  imageUrl?: string
}

export interface PlatformPostResult {
  ok:         boolean
  postId?:    string
  permalink?: string
  error?:     string
}

function sbAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/** Post to a platform on behalf of a brand. The platform-specific
 *  setup (page token, IG business ID, etc.) is loaded from the
 *  facebook_pages table that meta-suite/auto-post populates. */
export async function postToPlatform(
  brandSlug: string,
  platform:  string,
  input:     PlatformPostInput,
): Promise<PlatformPostResult> {
  if (platform === 'facebook' || platform === 'instagram') {
    return postViaMetaSuite(brandSlug, platform, input)
  }
  return {
    ok:    false,
    error: `Platform "${platform}" not yet implemented in social dispatcher`,
  }
}

async function postViaMetaSuite(
  brandSlug: string,
  platform:  'facebook' | 'instagram',
  input:     PlatformPostInput,
): Promise<PlatformPostResult> {
  const sb = sbAdmin()
  const { data: page } = await sb
    .from('facebook_pages')
    .select('page_id, page_token, ig_business_account_id, is_active')
    .eq('brand_slug', brandSlug)
    .eq('is_active', true)
    .maybeSingle()
  if (!page) {
    return { ok: false, error: `No active facebook_page row for brand ${brandSlug}` }
  }

  try {
    if (platform === 'facebook') {
      const result = await createPagePost(
        page.page_id as string,
        page.page_token as string,
        {
          message:  input.caption,
          mediaUrl: input.imageUrl,
        },
      )
      return {
        ok:        true,
        postId:    result.id,
        permalink: `https://www.facebook.com/${result.id}`,
      }
    }
    // Instagram — requires an image. Skip if none.
    if (!input.imageUrl) {
      return { ok: false, error: 'Instagram post requires an image' }
    }
    if (!page.ig_business_account_id) {
      return { ok: false, error: 'No Instagram business account linked' }
    }
    const result = await createInstagramPost(
      page.ig_business_account_id as string,
      page.page_token as string,
      {
        message:  input.caption,
        mediaUrl: input.imageUrl,
      },
    )
    return {
      ok:     true,
      postId: result.id,
    }
  } catch (e) {
    return { ok: false, error: metaSuiteErrorMessage(e) }
  }
}
