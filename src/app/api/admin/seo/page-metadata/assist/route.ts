// POST /api/admin/seo/page-metadata/assist
//
// AI-assisted copy for per-route overrides. Reads the route's page,
// the brand profile (voice notes, audience), and asks Claude for
// optimized OG + Twitter + Pinterest copy.

import { NextRequest, NextResponse } from 'next/server'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { runAI } from '@/lib/ai/client'
import { loadBrandPromptContext, renderBrandContextForPrompt } from '@/lib/seo/brand-profile'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  await requireSettingsAccess()
  const body = await req.json().catch(() => null) as { route_path?: string; brand_slug?: string | null } | null
  if (!body?.route_path) return NextResponse.json({ error: 'route_path required' }, { status: 400 })

  const sb         = createAdminClient()
  const brandSlug  = body.brand_slug ?? 'rrp'
  const promptCtx  = await loadBrandPromptContext(sb, brandSlug)
  const brandMd    = renderBrandContextForPrompt(promptCtx)

  const SYSTEM_PROMPT = `You write social sharing copy for a community publication. Your job is
to produce title + description + Pinterest description for the given
route URL. Be specific, locality-rich, and in the brand's voice.

OUTPUT FORMAT — emit raw JSON only:
{
  "og_title":              "60 chars max, attention-grabbing",
  "og_description":        "150 chars max, the share blurb",
  "twitter_title":         "70 chars max",
  "twitter_description":   "200 chars max",
  "pinterest_description": "300 chars max, keyword-rich, can include 2-3 hashtags"
}`

  const userPrompt = `${brandMd}

# Target route
${body.route_path}

Produce social sharing copy for this route per the system prompt instructions.
Emit raw JSON only.`

  const res = await runAI({
    caller:       'page-metadata-assist',
    taskKind:     'drafting',
    systemPrompt: SYSTEM_PROMPT,
    messages:     [{ role: 'user', content: userPrompt }],
    maxTokens:    2000,
  })

  const raw = res.text.trim().replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  try {
    const j = JSON.parse(raw)
    return NextResponse.json(j)
  } catch {
    return NextResponse.json({ error: `non-JSON response: ${raw.slice(0, 200)}` }, { status: 500 })
  }
}
