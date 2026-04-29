import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const pub   = req.nextUrl.searchParams.get('pub') ?? 'RRP'
  const month = req.nextUrl.searchParams.get('month') ?? ''

  try {
    const supabase = await createClient()
    let query = supabase
      .from('editorial_items')
      .select('*')
      .eq('publication', pub)
      .order('created_at', { ascending: true })

    if (month) query = query.eq('month_key', month)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('editorial_items')
      .insert({
        publication:        body.publication,
        month_key:          body.monthKey,
        title:              body.title,
        department:         body.department,
        status:             body.status ?? 'idea',
        responsible:        body.responsible ?? null,
        due_date:           body.dueDate ?? null,
        sponsor_opportunity: body.sponsorOpportunity ?? null,
        form_exists:        body.formExists ?? false,
        notes:              body.notes ?? null,
        updated_at:         new Date().toISOString(),
      })
      .select('id')
      .single()
    if (error) throw error
    return NextResponse.json({ id: data.id })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...fields } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const supabase = await createClient()

    // Map camelCase → snake_case
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if ('title'              in fields) update.title              = fields.title
    if ('department'         in fields) update.department         = fields.department
    if ('status'             in fields) update.status             = fields.status
    if ('responsible'        in fields) update.responsible        = fields.responsible
    if ('dueDate'            in fields) update.due_date           = fields.dueDate
    if ('sponsorOpportunity' in fields) update.sponsor_opportunity = fields.sponsorOpportunity
    if ('formExists'         in fields) update.form_exists        = fields.formExists
    if ('notes'              in fields) update.notes              = fields.notes
    if ('scheduledAt'        in fields) update.scheduled_at       = fields.scheduledAt
    if ('socialCaption'      in fields) update.social_caption     = fields.socialCaption
    if ('articleBody'        in fields) update.article_body       = fields.articleBody

    const { error } = await supabase.from('editorial_items').update(update).eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('editorial_items').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
