import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MAX_BYTES = 25 * 1024 * 1024  // 25 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File must be under 25 MB' }, { status: 400 })
    }

    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF, PNG, JPG, WebP are accepted' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    )

    const ext     = file.name.split('.').pop() ?? 'bin'
    const path    = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const buffer  = Buffer.from(await file.arrayBuffer())

    const { error } = await supabase.storage.from('ad-graphics').upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    })

    if (error) {
      console.error('[upload] storage error:', error.message)
      // Return success:false but don't crash — graphic upload is optional
      return NextResponse.json({ success: false, error: error.message })
    }

    const { data: urlData } = supabase.storage.from('ad-graphics').getPublicUrl(path)
    return NextResponse.json({ success: true, url: urlData.publicUrl, path })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
