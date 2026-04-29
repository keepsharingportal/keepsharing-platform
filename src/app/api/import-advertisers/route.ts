import { NextRequest, NextResponse } from 'next/server'
import { importBatch, type ImportRow } from '@/lib/db/advertisers'

export async function POST(req: NextRequest) {
  try {
    const { rows } = await req.json() as { rows: ImportRow[] }
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ inserted: 0, businessesCreated: 0, skipped: 0, errors: ['No rows provided'], rowResults: [] }, { status: 400 })
    }
    const result = await importBatch(rows)
    return NextResponse.json(result)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ inserted: 0, businessesCreated: 0, skipped: 0, errors: [msg], rowResults: [] }, { status: 500 })
  }
}
