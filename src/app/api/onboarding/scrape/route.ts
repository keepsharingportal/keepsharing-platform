import { NextRequest, NextResponse } from 'next/server'
import { scrapeWebsite } from '@/lib/website-scraper'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const result = await scrapeWebsite(url)

  return NextResponse.json({
    scraped: !result.error,
    ...result,
  })
}
