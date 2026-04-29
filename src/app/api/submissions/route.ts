import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateFeatureArticle } from '@/lib/ai/article-generator'

const FORM_CONFIG: Record<string, {
  publication: 'RRP' | 'RRB'
  department: string
  articleWordCount: number
  needsAI: boolean
}> = {
  'second-act':        { publication: 'RRB', department: 'Inspiration',       articleWordCount: 400, needsAI: true  },
  'then-and-now':      { publication: 'RRB', department: 'Relationships',      articleWordCount: 400, needsAI: true  },
  'ask-the-doctor':    { publication: 'RRB', department: 'Health',             articleWordCount: 0,   needsAI: false },
  'student-spotlight': { publication: 'RRP', department: 'Student Spotlight',  articleWordCount: 200, needsAI: true  },
  'local-kid':         { publication: 'RRP', department: 'Local Kid Cool Things', articleWordCount: 200, needsAI: true  },
  'parent-poll':       { publication: 'RRP', department: 'Parent Poll',        articleWordCount: 0,   needsAI: false },
}

const MONTH_LABELS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
function currentMonthKey() {
  const d = new Date()
  return `${MONTH_LABELS[d.getMonth()]}${String(d.getFullYear()).slice(2)}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      formType: string
      formData: Record<string, string>
      name?: string
      email?: string
      phone?: string
    }

    const cfg = FORM_CONFIG[body.formType]
    if (!cfg) return NextResponse.json({ error: 'Unknown form type' }, { status: 400 })

    let aiArticle: string | null = null

    // Generate AI article for relevant form types
    if (cfg.needsAI && process.env.ANTHROPIC_API_KEY) {
      try {
        aiArticle = await generateFeatureArticle(
          body.formType.replace(/-/g, ' '),
          body.formData,
          cfg.publication,
          cfg.articleWordCount,
        )
      } catch (e) {
        console.error('AI generation failed:', e)
      }
    }

    const supabase = await createClient()

    // Save submission
    const { data: submission, error: subErr } = await supabase
      .from('content_submissions')
      .insert({
        form_type:   body.formType,
        publication: cfg.publication,
        name:        body.name ?? null,
        email:       body.email ?? null,
        phone:       body.phone ?? null,
        form_data:   body.formData,
        ai_article:  aiArticle,
        status:      aiArticle ? 'pending' : 'pending',
      })
      .select('id')
      .single()

    if (subErr) throw subErr

    // Create editorial board item if AI generated article
    if (aiArticle && submission) {
      const title = body.formData.name ?? body.formData.studentName ?? body.formData.subject ?? body.name ?? 'New Submission'
      await supabase.from('editorial_items').insert({
        publication:          cfg.publication,
        month_key:            currentMonthKey(),
        title:                `${body.formType.replace(/-/g,' ')} — ${title}`,
        department:           cfg.department,
        status:               'draft-ready',
        article_body:         aiArticle,
        source_submission_id: submission.id,
        form_exists:          true,
      })
    }

    return NextResponse.json({ id: submission?.id ?? null, hasArticle: !!aiArticle })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const formType = req.nextUrl.searchParams.get('formType')
  try {
    const supabase = await createClient()
    let query = supabase
      .from('content_submissions')
      .select('*')
      .order('created_at', { ascending: false })
    if (formType) query = query.eq('form_type', formType)
    const { data } = await query
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([])
  }
}
