import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  try {
    const supabase = await createClient()
    let query = supabase.from('weekend_reservations').select('*').order('scheduled_for', { ascending: true })
    if (type) query = query.eq('publication', type)

    const { data, error } = await query
    if (error) return NextResponse.json([], { status: 200 })
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { restaurantName, dishRec, description, photoUrl, restaurantUrl, scheduledFor, publication } = body

    if (!restaurantName || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('weekend_reservations')
      .insert({
        publication:     publication ?? 'RRB',
        restaurant_name: restaurantName,
        dish_rec:        dishRec ?? '',
        description,
        photo_url:       photoUrl ?? null,
        restaurant_url:  restaurantUrl ?? null,
        scheduled_for:   scheduledFor ?? null,
        status:          'scheduled',
      })
      .select()
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const supabase = await createClient()
    const { error } = await supabase
      .from('weekend_reservations')
      .update(updates)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
