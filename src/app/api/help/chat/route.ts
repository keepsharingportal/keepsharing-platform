import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildKBContext, searchArticles } from '@/lib/knowledge-base'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are the KeepSharing platform assistant. You help publishers, VAs, and editors use the KeepSharing admin platform efficiently and confidently.

KeepSharing is an admin platform for a network of hyperlocal family publications (River Region Parents, River Region Boom, and others). It handles advertiser management, content editorial workflows, self-serve ad booking, submission forms, and business intelligence.

Answer questions directly and practically. When a help article covers the topic, reference it by name so the user can navigate there. Keep answers concise — 2–4 sentences for simple questions, numbered steps for procedural ones.

NEVER make up features or workflows that aren't described below. If something isn't in the knowledge base, say "I don't have details on that — contact Jason at jason@keepsharing.com."

KNOWLEDGE BASE:
${buildKBContext()}

ARTICLE IDs for reference (use these in [Article: id] format):
- clone-advertiser-sheet
- add-new-advertiser
- process-ad-proof
- import-zoho-data
- run-dropbox-scanner
- use-editorial-board
- approve-content-submission
- monthly-advertiser-report
- onboard-new-publisher
- launch-new-market`

type Message = { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  try {
    const { messages, query } = await req.json() as {
      messages?: Message[]
      query?: string
    }

    // Optionally surface relevant articles before passing to Claude
    const relevantArticles = query ? searchArticles(query).slice(0, 3) : []

    const history: Message[] = messages ?? []
    if (query && (history.length === 0 || history[history.length - 1]?.content !== query)) {
      history.push({ role: 'user', content: query })
    }

    if (history.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: history.map(m => ({ role: m.role, content: m.content })),
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    return NextResponse.json({
      reply: text,
      relevantArticles: relevantArticles.map(a => ({ id: a.id, title: a.title, category: a.category })),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
