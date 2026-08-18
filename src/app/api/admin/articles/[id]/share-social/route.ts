// POST /api/admin/articles/[id]/share-social
// Body: { scheduleAt?: ISO string, force?: boolean }
//
// Shares the article to Facebook + Instagram using the captions and hero image
// already prepared in the article editor. Posts immediately unless scheduleAt
// is given.
//
// This exists so sharing is a deliberate action the editor takes when they're
// ready, rather than a side effect of the publish transition. Publishing and
// sharing are different decisions — an article often goes live before anyone
// wants it on the feed — and tying them together meant the only way to share
// was to publish, and the only way to change the copy afterwards was GHL.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { shareArticleToSocial } from '@/lib/social/share-article'

export const runtime     = 'nodejs'
export const maxDuration = 60

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  await requireAdmin()
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await req.json().catch(() => ({})) as { scheduleAt?: string; force?: boolean }

  let scheduleAt: string | null = null
  if (body.scheduleAt) {
    const when = new Date(body.scheduleAt)
    if (Number.isNaN(when.getTime())) {
      return NextResponse.json({ error: 'scheduleAt must be a valid date' }, { status: 400 })
    }
    // A schedule in the past silently becomes "post now" inside GHL, which is
    // a confusing way to find out you mistyped the date.
    if (when.getTime() < Date.now() - 60_000) {
      return NextResponse.json({ error: 'That time is in the past — pick a future time or share now.' }, { status: 400 })
    }
    scheduleAt = when.toISOString()
  }

  const result = await shareArticleToSocial(id, { scheduleAt, force: !!body.force })
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
