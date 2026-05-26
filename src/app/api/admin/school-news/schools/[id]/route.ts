// PATCH  /api/admin/school-news/schools/[id]  — edit a school
// DELETE /api/admin/school-news/schools/[id]  — archive (soft delete) a school

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { isValidArea, isValidGradeBand } from '@/lib/school-news/areas'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

interface UpdateBody {
  name?:          string
  area?:          string
  is_private?:    boolean
  district?:      string | null
  grade_band?:    string | null
  contact_email?: string | null
  facebook_url?:  string | null
  city?:          string | null
  address?:       string | null
  status?:        'active' | 'archived'
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => null) as UpdateBody | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  if (!id)   return NextResponse.json({ error: 'id required' }, { status: 400 })

  if (body.area !== undefined && !isValidArea(body.area)) {
    return NextResponse.json({ error: 'area must be one of: montgomery, autauga, elmore, pike-road' }, { status: 400 })
  }
  if (body.grade_band !== undefined && body.grade_band !== null && !isValidGradeBand(body.grade_band)) {
    return NextResponse.json({ error: 'grade_band must be one of: elementary, middle, high, k12, other' }, { status: 400 })
  }
  if (body.status !== undefined && body.status !== 'active' && body.status !== 'archived') {
    return NextResponse.json({ error: 'status must be "active" or "archived"' }, { status: 400 })
  }

  // Strip undefined so we only update fields the caller specified
  const patch: Record<string, unknown> = {}
  if (body.name !== undefined)          patch.name          = body.name?.trim()
  if (body.area !== undefined)          patch.area          = body.area
  if (body.is_private !== undefined)    patch.is_private    = body.is_private === true
  if (body.district !== undefined)      patch.district      = body.district ?? null
  if (body.grade_band !== undefined)    patch.grade_band    = body.grade_band ?? null
  if (body.contact_email !== undefined) patch.contact_email = body.contact_email ?? null
  if (body.facebook_url !== undefined)  patch.facebook_url  = body.facebook_url ?? null
  if (body.city !== undefined)          patch.city          = body.city ?? null
  if (body.address !== undefined)       patch.address       = body.address ?? null
  if (body.status !== undefined)        patch.status        = body.status

  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('schools')
    .update(patch)
    .eq('id', id)
    .select('id, name, area, is_private, status')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Another school in this market already uses that name.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/admin/school-news/schools')
  revalidatePath('/admin/school-news')
  return NextResponse.json({ school: data })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  // Soft delete — flip status to 'archived' so existing school_bits keep their snapshot
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = supabaseAdmin()
  const { error } = await supabase
    .from('schools')
    .update({ status: 'archived' })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/admin/school-news/schools')
  revalidatePath('/admin/school-news')
  return NextResponse.json({ success: true })
}
