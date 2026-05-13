// src/lib/import/wp-xml-parser.ts
// Browser-side WordPress XML (WXR) export parser.
// Uses the native DOMParser — no Node.js dependencies.
// Extracts posts, skips pages/attachments, preserves all fields needed
// to populate guide_articles.

import { cleanWpContent, cleanWpExcerpt } from './vc-cleanup'
import { mapWpCategories } from './wp-category-mapper'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WpPost {
  title:         string
  slug:          string
  link:          string
  pubDate:       string       // ISO string, preserving original publish date
  author:        string
  categories:    string[]
  excerpt:       string       // from <excerpt:encoded>, cleaned
  bodyContent:   string       // from <content:encoded>, VC-cleaned → markdown
  featuredImage: string | null
  wpPostId:      string
}

export interface ParsedWpXml {
  posts:      WpPost[]
  categories: string[]        // all unique category names found
  dateRange:  { min: string; max: string } | null
  siteUrl:    string
  siteTitle:  string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getText(item: Element, tagName: string): string {
  return item.getElementsByTagName(tagName)[0]?.textContent?.trim() ?? ''
}

function getCData(item: Element, tagName: string): string {
  // WordPress stores HTML content in CDATA sections which DOMParser exposes
  // as regular textContent
  return item.getElementsByTagName(tagName)[0]?.textContent ?? ''
}

function toIso(wpDate: string): string {
  // WP date format: "2024-06-15 10:30:00" → ISO
  if (!wpDate || wpDate === '0000-00-00 00:00:00') return new Date().toISOString()
  const d = new Date(wpDate.replace(' ', 'T') + 'Z')
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

function toSlug(title: string, existing: Set<string>): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/(^-|-$)/g, '')

  if (!existing.has(base)) { existing.add(base); return base }
  for (let i = 2; i < 200; i++) {
    const c = `${base}-${i}`
    if (!existing.has(c)) { existing.add(c); return c }
  }
  return `${base}-${Date.now()}`
}

// Extract featured image from postmeta (attachment URL stored alongside thumbnail_id)
function extractFeaturedImage(item: Element): string | null {
  const metas = item.getElementsByTagName('wp:postmeta')
  let thumbnailId: string | null = null
  const attachmentUrls: Record<string, string> = {}

  for (const meta of metas) {
    const key = meta.getElementsByTagName('wp:meta_key')[0]?.textContent?.trim()
    const val = meta.getElementsByTagName('wp:meta_value')[0]?.textContent?.trim()
    if (key === '_thumbnail_id' && val) thumbnailId = val
    // Some exporters include _wp_attachment_url in postmeta
    if (key === '_wp_attachment_url' && val) attachmentUrls['self'] = val
  }

  // Direct URL in postmeta (enhanced exporters)
  if (attachmentUrls['self']) return attachmentUrls['self']

  // Try to find image URLs in the content as fallback
  // (first <img> src in the raw content)
  const rawContent = getCData(item, 'content:encoded')
  const imgMatch = rawContent.match(/<img[^>]+src="([^"]+)"/i)
  if (imgMatch) return imgMatch[1]

  return null
}

// ── Main parser ───────────────────────────────────────────────────────────────

export function parseWpXml(xmlText: string): ParsedWpXml {
  const parser  = new DOMParser()
  const doc     = parser.parseFromString(xmlText, 'text/xml')
  const channel = doc.querySelector('channel')

  if (!channel) {
    throw new Error('Invalid WordPress XML: no <channel> element found')
  }

  const siteTitle = getText(channel, 'title')
  const siteUrl   = getText(channel, 'link')

  const items       = channel.getElementsByTagName('item')
  const posts: WpPost[] = []
  const allCats     = new Set<string>()
  const usedSlugs   = new Set<string>()

  for (const item of items) {
    // Only import published posts (not pages, attachments, custom post types)
    const postType   = getText(item, 'wp:post_type')
    const postStatus = getText(item, 'wp:status')

    if (postType !== 'post') continue
    if (postStatus !== 'publish' && postStatus !== 'draft') continue

    const title       = decodeXmlEntities(getText(item, 'title'))
    const wpPostName  = getText(item, 'wp:post_name')
    const link        = getText(item, 'link')
    const pubDateRaw  = getText(item, 'wp:post_date')
    const author      = decodeXmlEntities(getText(item, 'dc:creator') || getText(item, 'author'))
    const wpPostId    = getText(item, 'wp:post_id')

    if (!title) continue

    // Categories — WP XML has multiple <category> elements per item
    const catElements  = item.getElementsByTagName('category')
    const categories: string[] = []
    for (const cat of catElements) {
      const domain = cat.getAttribute('domain') ?? ''
      if (domain === 'post_tag') continue          // skip tags
      const name = cat.textContent?.trim()
      if (name && !categories.includes(name)) {
        categories.push(name)
        allCats.add(name)
      }
    }

    // Content and excerpt
    const rawContent = getCData(item, 'content:encoded')
    const rawExcerpt = getCData(item, 'excerpt:encoded')

    const bodyContent = cleanWpContent(rawContent)
    const excerpt     = rawExcerpt
      ? cleanWpExcerpt(rawExcerpt)
      : bodyContent.replace(/#+\s/g, '').slice(0, 200).replace(/\s+/g, ' ').trim()

    // Slug — prefer wp:post_name (already URL-safe), fall back to derived
    const rawSlug     = wpPostName || title
    const slug        = toSlug(rawSlug, usedSlugs)

    // Published date
    const pubDate = toIso(pubDateRaw)

    // Featured image
    const featuredImage = extractFeaturedImage(item)

    posts.push({
      title,
      slug,
      link,
      pubDate,
      author,
      categories,
      excerpt,
      bodyContent,
      featuredImage,
      wpPostId,
    })
  }

  // Date range for display
  let dateRange: { min: string; max: string } | null = null
  if (posts.length > 0) {
    const sorted = [...posts].sort((a, b) => a.pubDate.localeCompare(b.pubDate))
    dateRange = { min: sorted[0].pubDate, max: sorted[sorted.length - 1].pubDate }
  }

  return {
    posts,
    categories: [...allCats].sort(),
    dateRange,
    siteUrl,
    siteTitle,
  }
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

// ── Build import record from WpPost ──────────────────────────────────────────
// This is what gets sent to the API for insertion into guide_articles.

export interface ArticleImportRow {
  title:                    string
  slug:                     string
  subtitle:                 string | null
  excerpt:                  string | null
  body_content:             string
  hero_image_url:           string | null
  author_byline:            string | null
  author_name:              string | null
  column_slug:              string | null
  guide_slug:               string | null
  source_pdf_filename:      string | null    // repurposed: original WP slug
  source_issue_month:       string | null    // YYYY-MM-01
  editorial_review_status:  'pending'
  published_at:             string | null
  wp_post_id:               string | null
}

export function buildImportRow(post: WpPost): ArticleImportRow {
  const { columnSlug, guideSlug } = mapWpCategories(post.categories)

  // source_issue_month: first of the month the post was published
  let sourceIssueMonth: string | null = null
  try {
    const d = new Date(post.pubDate)
    sourceIssueMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  } catch { /* leave null */ }

  return {
    title:                   post.title,
    slug:                    post.slug,
    subtitle:                post.excerpt || null,
    excerpt:                 post.excerpt || null,
    body_content:            post.bodyContent,
    hero_image_url:          post.featuredImage,
    author_byline:           post.author || null,
    author_name:             post.author || null,
    column_slug:             columnSlug,
    guide_slug:              guideSlug,
    source_pdf_filename:     post.slug,       // original WP post name for reference
    source_issue_month:      sourceIssueMonth,
    editorial_review_status: 'pending',
    published_at:            post.pubDate,
    wp_post_id:              post.wpPostId || null,
  }
}
