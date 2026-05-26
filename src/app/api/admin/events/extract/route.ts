// POST /api/admin/events/extract
// Body (one of):
//   { url: "https://...", source_id?: "uuid" }
//   { text: "pasted text", source_id?: "uuid" }
//
// Runs Claude extraction and returns ExtractionResult. Does NOT save —
// the admin reviews the events and then POSTs to /extract/save to commit.

import { NextRequest, NextResponse } from 'next/server'
import {
  extractEventsFromUrl, extractEventsFromText,
  type ExtractionResult,
} from '@/lib/calendar/ai-extractor'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const url  = (body?.url  as string | undefined)?.trim()
  const text = (body?.text as string | undefined)?.trim()

  if (!url && !text) {
    return NextResponse.json({ error: 'Provide either "url" or "text"' }, { status: 400 })
  }

  let result: ExtractionResult
  try {
    result = url
      ? await extractEventsFromUrl(url)
      : await extractEventsFromText(text!)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }

  return NextResponse.json(result)
}
