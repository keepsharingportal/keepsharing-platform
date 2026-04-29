import { NextRequest, NextResponse } from 'next/server'
import { generateSocialCaption } from '@/lib/ai/article-generator'

export async function POST(req: NextRequest) {
  try {
    const { title, department, publication, notes } = await req.json() as {
      title: string
      department: string
      publication: 'RRP' | 'RRB'
      notes?: string
    }

    if (!title || !department || !publication) {
      return NextResponse.json({ error: 'title, department, publication required' }, { status: 400 })
    }

    const caption = await generateSocialCaption(title, department, publication, notes)
    return NextResponse.json({ caption })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
