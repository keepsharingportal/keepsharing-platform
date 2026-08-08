// /api/admin/education-matters/sponsorships
//
// GET  — list all rows (joined with advertiser business_name)
// POST — create a new row
//
// Per-row edits + delete live under /[id]/route.ts.
// See migration 218 for the schema and overlap constraint. The DB
// exclusion constraint rejects overlapping active rows in the same
// column, so the response includes a friendly error message when
// that fires ('23P01' = exclusion_violation).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

const ALLOWED_STATUS = ['active', 'ended', 'pending'] as const

export async function GET() {
  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('column_sponsorships')
    .select('*, advertiser:advertiser_accounts(business_name, slug)')
    .order('column_slug', { ascending: true })
    .order('start_month', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sponsorships: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const payload = pickAndValidate(body)
    if ('error' in payload) return NextResponse.json({ error: payload.error }, { status: 400 })

    const supabase = supabaseAdmin()
    const { data, error } = await supabase
      .from('column_sponsorships')
      .insert(payload.row)
      .select('*')
      .single()

    if (error) {
      if (error.code === '23P01') {
        return NextResponse.json({
          error: 'Another active sponsorship already covers part of this date range for this column. End that one first or pick non-overlapping dates.',
        }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ sponsorship: data })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

interface ValidatedRow {
  column_slug:           string
  advertiser_account_id: string | null
  start_month:           string
  end_month:             string
  status:                (typeof ALLOWED_STATUS)[number]
  sponsor_name:          string
  sponsor_url:           string | null
  sponsor_tagline:       string | null
  sponsor_description:   string | null
  sponsor_logo_url:      string | null
  sponsor_image_url:     string | null
  sponsor_button_text:   string | null
  notes:                 string | null
}

export function pickAndValidate(body: unknown): { row: ValidatedRow } | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Invalid request body.' }
  const b = body as Record<string, unknown>

  const column_slug   = str(b.column_slug)
  const sponsor_name  = str(b.sponsor_name)
  const start_month   = str(b.start_month)
  const end_month     = str(b.end_month)
  const status        = str(b.status) as (typeof ALLOWED_STATUS)[number]

  if (!column_slug)                    return { error: 'Column is required.' }
  if (!sponsor_name)                   return { error: 'Sponsor name is required.' }
  if (!start_month || !end_month)      return { error: 'Start and end dates are required.' }
  if (start_month > end_month)         return { error: 'End date must be on or after start date.' }
  if (!ALLOWED_STATUS.includes(status)) return { error: `Status must be one of: ${ALLOWED_STATUS.join(', ')}.` }

  return {
    row: {
      column_slug,
      advertiser_account_id: nullable(str(b.advertiser_account_id)),
      start_month,
      end_month,
      status,
      sponsor_name,
      sponsor_url:         nullable(str(b.sponsor_url)),
      sponsor_tagline:     nullable(str(b.sponsor_tagline)),
      sponsor_description: nullable(str(b.sponsor_description)),
      sponsor_logo_url:    nullable(str(b.sponsor_logo_url)),
      sponsor_image_url:   nullable(str(b.sponsor_image_url)),
      sponsor_button_text: nullable(str(b.sponsor_button_text)),
      notes:               nullable(str(b.notes)),
    },
  }
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}
function nullable(v: string): string | null {
  return v ? v : null
}
