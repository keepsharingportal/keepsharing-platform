// /api/admin/education-matters/sponsorships/[id]
//
// PATCH  — update a row
// DELETE — remove a row
//
// Same validation as POST on the collection route.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { pickAndValidate } from '../route'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })

  try {
    const body = await req.json()
    const payload = pickAndValidate(body)
    if ('error' in payload) return NextResponse.json({ error: payload.error }, { status: 400 })

    const supabase = supabaseAdmin()
    const { data, error } = await supabase
      .from('column_sponsorships')
      .update(payload.row)
      .eq('id', id)
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

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })

  const supabase = supabaseAdmin()
  const { error } = await supabase.from('column_sponsorships').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
