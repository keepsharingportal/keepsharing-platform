import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MOCK_ADVERTISERS } from '@/lib/mock-data'
import type { AdvertiserRecord } from '@/types'

type AdRow = {
  id: string; issue: string; stage: string; amount: number; directory: boolean
  layout_notes: string | null; social: string | null; invoice_type: string | null
  designer: string | null; design_status: string; size: number; orientation: string | null
  special_position: string | null; specific_months: string[] | null; expires: string | null
  description: string | null
  businesses: { name: string }[] | { name: string } | null
  contacts:   { first_name: string; last_name: string | null }[] | { first_name: string; last_name: string | null } | null
  publications: { abbrev: string }[] | { abbrev: string } | null
}

function first<T>(v: T[] | T | null): T | null {
  if (v === null || v === undefined) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

function mapRow(row: AdRow): AdvertiserRecord {
  const biz = first(row.businesses)
  const con = first(row.contacts)
  const pub = first(row.publications)
  return {
    id: row.id,
    businessName:    biz?.name ?? 'Unknown',
    contactName:     con ? `${con.first_name} ${con.last_name ?? ''}`.trim() : '',
    publication:     pub?.abbrev ?? '',
    issue:           row.issue,
    stage:           (row.stage as AdvertiserRecord['stage']) ?? 'Closed Won',
    amount:          row.amount ?? 0,
    directory:       row.directory ?? false,
    layoutNotes:     row.layout_notes ?? '',
    social:          row.social ?? null,
    invoiceType:     (row.invoice_type as AdvertiserRecord['invoiceType']) ?? 'Invoice',
    designer:        row.designer ?? '',
    designStatus:    (row.design_status as AdvertiserRecord['designStatus']) ?? 'Pick-up',
    size:            row.size,
    orientation:     (row.orientation as AdvertiserRecord['orientation']) ?? null,
    specialPosition: (row.special_position as AdvertiserRecord['specialPosition']) ?? null,
    specificMonths:  row.specific_months ?? [],
    expires:         row.expires ?? '',
    description:     row.description ?? '',
  }
}

export async function GET(req: NextRequest) {
  const issue = req.nextUrl.searchParams.get('issue')?.trim()
  if (!issue) return NextResponse.json([])

  // Try Supabase first
  try {
    const supabase = await createClient()

    // Query with exact issue match (Zoho format: "RRP MAY26", "MP MAY26", etc.)
    const { data, error } = await supabase
      .from('advertisers')
      .select(`
        id, issue, stage, amount, directory, layout_notes, social,
        invoice_type, designer, design_status, size, orientation,
        special_position, specific_months, expires, description,
        businesses (name),
        contacts (first_name, last_name),
        publications (abbrev)
      `)
      .eq('issue', issue)
      .order('created_at', { ascending: true })

    // Exact match
    if (!error && data) {
      if (data.length > 0) return NextResponse.json((data as unknown as AdRow[]).map(mapRow))
    }

    // Case-insensitive fallback for import formatting differences
    const { data: data2, error: error2 } = await supabase
      .from('advertisers')
      .select(`
        id, issue, stage, amount, directory, layout_notes, social,
        invoice_type, designer, design_status, size, orientation,
        special_position, specific_months, expires, description,
        businesses (name),
        contacts (first_name, last_name),
        publications (abbrev)
      `)
      .ilike('issue', issue)
      .order('created_at', { ascending: true })

    if (!error2 && data2) {
      return NextResponse.json((data2 as unknown as AdRow[]).map(mapRow))
    }

    // Both queries succeeded but returned nothing — genuinely empty issue
    return NextResponse.json([])
  } catch {
    // Only use mock when Supabase isn't configured OR mock mode is explicitly on
    const isConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co')
    const useMock      = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'

    if (!isConfigured || useMock) {
      const mock = MOCK_ADVERTISERS.filter((a) => a.issue.toLowerCase() === issue.toLowerCase())
      return NextResponse.json(mock)
    }

    // Supabase IS configured but query failed — return empty rather than fake data
    // This surfaces schema/connection issues instead of hiding them with 27 mock records
    return NextResponse.json([])
  }
}
