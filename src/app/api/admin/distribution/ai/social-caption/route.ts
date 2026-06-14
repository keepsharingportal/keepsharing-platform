// POST /api/admin/distribution/ai/social-caption
//
// Generates brand-voice-aware social captions for a community
// submission. Returns 3 captions (Instagram-style, Facebook-style,
// short/Twitter-style) so the editor can pick whichever fits the
// channel they're posting to, plus a hashtag set.
//
// Editorial integrity: AI suggests, editor copies + posts manually.
// We don't auto-post anywhere from here. The /admin/distribution/
// social-export page already handles the export-to-planner workflow.
//
// Body: { publication, submissionId }
// Returns: { instagram, facebook, twitter, hashtags: string[] }

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { runAI } from '@/lib/ai/client'
import { loadBrand, buildBrandPromptFragment } from '@/lib/brands'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin()
  const body = await req.json().catch(() => null) as { publication?: string; submissionId?: string } | null
  if (!body?.publication)  return NextResponse.json({ error: 'publication required' }, { status: 400 })
  if (!body?.submissionId) return NextResponse.json({ error: 'submissionId required' }, { status: 400 })

  const brand = await loadBrand(body.publication)
  if (!brand) return NextResponse.json({ error: 'unknown publication' }, { status: 400 })

  const sb = createAdminClient()
  const { data: sub, error } = await sb
    .from('community_submissions')
    .select('working_title, submission_type, excerpt, related_person_name, related_business_name, related_school_name, target_publication, newsletter_teaser')
    .eq('id', body.submissionId)
    .maybeSingle()
  if (error || !sub) return NextResponse.json({ error: 'submission not found' }, { status: 404 })

  type S = { working_title: string | null; submission_type: string; excerpt: string | null; related_person_name: string | null; related_business_name: string | null; related_school_name: string | null; target_publication: string; newsletter_teaser: string | null }
  const s = sub as S
  const entity = s.related_person_name || s.related_business_name || s.related_school_name || ''
  const blurb  = s.newsletter_teaser || s.excerpt || ''

  const brandFragment = buildBrandPromptFragment(brand)

  const systemPrompt = `You write social media captions for a family-focused regional publication.

${brandFragment}

You will be given an editorial item. Write 3 captions and a hashtag set:

1. **instagram** — 1-3 short paragraphs, ~120-180 chars. Warm, scroll-stopping opener. Include 1 emoji max IF the brand voice allows.
2. **facebook** — 1-2 paragraphs, ~200-280 chars. Slightly longer, conversational. Built for engagement (a question at the end is welcome).
3. **twitter** — single sentence, MAX 240 chars including a placeholder for the article link. End with the link placeholder \`[link]\`.
4. **hashtags** — array of 3-6 lowercase, locally-grounded hashtags (e.g. publication's city/region + the topic). Never use generic spam-y ones.

Rules:
- Local/hyperlocal angle ALWAYS — name the city, the neighborhood, or the school when relevant
- Specific, not generic — name the person/business/school
- Match the brand voice rules above
- Never include "Read more in the link in bio" — keep it natural
- No clickbait
- No URLs in instagram/facebook captions (Instagram doesn't render them; FB editor adds them)

Return STRICT JSON only. Schema:
{
  "instagram": "...",
  "facebook":  "...",
  "twitter":   "... [link]",
  "hashtags":  ["..."]
}`

  const userPrompt = `Submission type: ${s.submission_type}
Title: ${s.working_title ?? '(no title yet)'}
${entity ? `Featured: ${entity}\n` : ''}${blurb ? `Excerpt: ${blurb.slice(0, 400)}` : ''}`

  try {
    const out = await runAI({
      taskKind:  'caption',
      caller:    'social-caption',
      systemPrompt,
      messages:  [{ role: 'user', content: userPrompt }],
      maxTokens: 700,
      adminId:   ctx.userId,
    })
    const raw = out.text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
    const parsed = JSON.parse(raw) as {
      instagram?: string; facebook?: string; twitter?: string; hashtags?: string[]
    }
    return NextResponse.json({
      instagram: parsed.instagram ?? '',
      facebook:  parsed.facebook  ?? '',
      twitter:   parsed.twitter   ?? '',
      hashtags:  Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 8) : [],
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'AI call failed' },
      { status: 502 },
    )
  }
}
