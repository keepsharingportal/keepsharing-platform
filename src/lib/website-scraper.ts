/**
 * Website scraper for the Partner Engine onboarding.
 * Given a URL, fetches HTML and extracts business info to pre-populate onboarding fields.
 * Uses fetch + regex — no external dependencies.
 */

export interface ScrapedContent {
  title?: string
  metaDescription?: string
  ogImage?: string
  h1s: string[]
  h2s: string[]
  paragraphs: string[]
  phones: string[]
  emails: string[]
  images: string[]
  address?: string
  error?: string
}

function extractMeta(html: string, name: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'),
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, 'i'),
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m?.[1]) return m[1].trim()
  }
  return undefined
}

function extractTagContent(html: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([^<]*(?:<[^/][^>]*>[^<]*<\/[^>]+>[^<]*)*)<\/${tag}>`, 'gi')
  const results: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, '').trim()
    if (text.length > 3 && text.length < 500) results.push(text)
  }
  return results.slice(0, 10)
}

function extractImages(html: string, baseUrl: string): string[] {
  const re = /<img[^>]+src=["']([^"']+)["']/gi
  const imgs: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    let src = m[1].trim()
    if (src.startsWith('//')) src = `https:${src}`
    if (src.startsWith('/')) {
      try { src = new URL(src, baseUrl).href } catch { continue }
    }
    if (src.startsWith('http') && !src.match(/\.(svg|gif|ico|webp)($|\?)/i)) {
      imgs.push(src)
    }
  }
  return [...new Set(imgs)].slice(0, 12)
}

function extractPhones(html: string): string[] {
  const telLinks = [...html.matchAll(/tel:([+\d\-.()\s]{7,18})/gi)].map(m => m[1].trim())
  const visiblePhones = [...html.matchAll(/(?<!\d)(\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4})(?!\d)/g)].map(m => m[1])
  return [...new Set([...telLinks, ...visiblePhones])].slice(0, 5)
}

function extractEmails(html: string): string[] {
  const mailto = [...html.matchAll(/mailto:([^\s"'>?]+)/gi)].map(m => m[1].toLowerCase())
  const visible = [...html.matchAll(/\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/gi)].map(m => m[1].toLowerCase())
  return [...new Set([...mailto, ...visible])].filter(e => !e.includes('example.com') && !e.includes('noreply')).slice(0, 5)
}

export async function scrapeWebsite(url: string): Promise<ScrapedContent> {
  try {
    const cleanUrl = url.startsWith('http') ? url : `https://${url}`

    const res = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RiverRegionParents-Scraper/1.0; +https://riverregionparents.com)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return { h1s: [], h2s: [], paragraphs: [], phones: [], emails: [], images: [], error: `HTTP ${res.status}` }
    }

    const html = await res.text()

    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
    const metaDescription = extractMeta(html, 'description')
    const ogImage = extractMeta(html, 'og:image') ?? extractMeta(html, 'twitter:image')

    return {
      title,
      metaDescription,
      ogImage,
      h1s: extractTagContent(html, 'h1'),
      h2s: extractTagContent(html, 'h2'),
      paragraphs: extractTagContent(html, 'p').filter(p => p.length > 30).slice(0, 8),
      phones: extractPhones(html),
      emails: extractEmails(html),
      images: extractImages(html, cleanUrl),
    }
  } catch (e: unknown) {
    return {
      h1s: [], h2s: [], paragraphs: [], phones: [], emails: [], images: [],
      error: e instanceof Error ? e.message : 'Scrape failed',
    }
  }
}
