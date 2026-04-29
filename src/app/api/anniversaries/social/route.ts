import { NextRequest, NextResponse } from 'next/server'
import { generateAnniversarySocialPost } from '@/lib/ai/article-generator'

export async function POST(req: NextRequest) {
  try {
    const { person1, person2, years, message } = await req.json()
    if (!person1 || !person2 || !years) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    const post = await generateAnniversarySocialPost(person1, person2, years, message)
    return NextResponse.json({ post })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
