/**
 * Article Import Engine
 * Extracts articles from magazine PDFs and bulk-imports them to guide_articles.
 *
 * Usage:
 *   1. Drop PDFs in /imports/magazines/ named: YYYY-MM-publication.pdf
 *      e.g. 2025-03-rrp.pdf, 2024-12-boom.pdf
 *   2. npx tsx scripts/import-articles.ts
 *
 * Articles are inserted with editorial_review_status='pending' and published_at=NULL.
 * Approve them at /admin/articles/review before they appear on the site.
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// ── Load env vars ─────────────────────────────────────────────────────────────
// Try to load from .env.local if dotenv is available
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require('dotenv')
  dotenv.config({ path: path.join(process.cwd(), '.env.local') })
  dotenv.config({ path: path.join(process.cwd(), '.env') })
} catch {
  // dotenv not installed — env vars must be set in shell
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const IMPORTS_DIR = path.join(process.cwd(), 'imports', 'magazines')

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExtractedArticle {
  title: string
  slug: string
  author?: string
  lead_paragraph?: string
  body_content: string
  suggested_categories?: string[]
}

interface ImportResult {
  filename: string
  articlesExtracted: number
  articlesInserted: number
  duplicates: number
  failed: number
  notes: string[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
}

function parseFilename(filename: string): { issueMonth: string | null; publicationSlug: string } {
  // Expected: YYYY-MM-publication.pdf
  const match = filename.match(/^(\d{4})-(\d{2})-([a-z]+)\.pdf$/i)
  if (!match) return { issueMonth: null, publicationSlug: 'rrp' }
  return {
    issueMonth:      `${match[1]}-${match[2]}-01`,
    publicationSlug: match[3].toLowerCase(),
  }
}

// ── Claude extraction ─────────────────────────────────────────────────────────

async function extractArticlesWithClaude(rawText: string, filename: string): Promise<ExtractedArticle[]> {
  // Trim to avoid token overflow — take first 6000 chars per chunk
  const chunks: string[] = []
  const chunkSize = 6000
  for (let i = 0; i < rawText.length; i += chunkSize) {
    chunks.push(rawText.slice(i, i + chunkSize))
  }

  const allArticles: ExtractedArticle[] = []

  for (const [i, chunk] of chunks.entries()) {
    console.log(`  Extracting chunk ${i + 1}/${chunks.length}...`)

    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are processing raw text extracted from a River Region Parents magazine PDF (${filename}). The text may be poorly formatted due to PDF extraction artifacts.

Find any complete articles or editorial content in this text (not ads, not classified listings, not tables of contents). For each article found, extract it cleanly.

Return ONLY valid JSON with no markdown formatting:
{
  "articles": [
    {
      "title": "Article title",
      "slug": "url-friendly-slug",
      "author": "Author name or null",
      "lead_paragraph": "First 1-2 sentences, 150 chars max",
      "body_content": "Full article in markdown format with ## for h2 subheads and - for bullet points",
      "suggested_categories": ["category1", "category2"]
    }
  ]
}

If no articles are found, return: {"articles": []}

Raw text chunk ${i + 1}:
---
${chunk}
---`,
        }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const trimmed = text.trim()

      // Parse the JSON response
      const jsonStart = trimmed.indexOf('{')
      const jsonEnd = trimmed.lastIndexOf('}')
      if (jsonStart === -1 || jsonEnd === -1) continue

      const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1))
      if (Array.isArray(parsed.articles)) {
        allArticles.push(...parsed.articles)
      }
    } catch (e) {
      console.warn(`  Warning: Extraction failed for chunk ${i + 1}:`, (e as Error).message)
    }

    // Respect rate limits
    await new Promise(r => setTimeout(r, 500))
  }

  return allArticles
}

// ── Process one PDF ───────────────────────────────────────────────────────────

async function processPDF(filepath: string): Promise<ImportResult> {
  const filename = path.basename(filepath)
  const result: ImportResult = { filename, articlesExtracted: 0, articlesInserted: 0, duplicates: 0, failed: 0, notes: [] }

  console.log(`\nProcessing: ${filename}`)

  // Check if already imported
  const { data: existing } = await supabase
    .from('import_log')
    .select('id')
    .eq('source_filename', filename)
    .maybeSingle()

  if (existing) {
    console.log(`  Skipping — already imported (found in import_log)`)
    result.notes.push('Skipped — already in import_log')
    return result
  }

  // Parse filename for metadata
  const { issueMonth, publicationSlug } = parseFilename(filename)
  if (!issueMonth) {
    result.notes.push(`Warning: filename "${filename}" doesn't match YYYY-MM-publication.pdf — issue_month not set`)
  }

  // Extract text from PDF
  let rawText = ''
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const buffer = fs.readFileSync(filepath)
    const data = await pdfParse(buffer)
    rawText = data.text
    console.log(`  Extracted ${rawText.length} characters across ${data.numpages} pages`)
  } catch (e) {
    const msg = `PDF extraction failed: ${(e as Error).message}`
    console.error(`  Error: ${msg}`)
    result.failed++
    result.notes.push(msg)
    await supabase.from('import_log').insert({
      source_filename: filename, source_type: 'magazine',
      publication_slug: publicationSlug, notes: msg,
    })
    return result
  }

  if (!rawText.trim()) {
    const msg = 'No text extracted — PDF may be image-only or encrypted'
    result.notes.push(msg)
    await supabase.from('import_log').insert({
      source_filename: filename, source_type: 'magazine',
      publication_slug: publicationSlug, notes: msg,
    })
    return result
  }

  // Use Claude to extract articles
  let articles: ExtractedArticle[] = []
  if (process.env.ANTHROPIC_API_KEY) {
    articles = await extractArticlesWithClaude(rawText, filename)
    console.log(`  Claude extracted ${articles.length} articles`)
  } else {
    console.warn('  Warning: ANTHROPIC_API_KEY not set — skipping AI extraction')
    result.notes.push('AI extraction skipped — ANTHROPIC_API_KEY not configured')
  }

  result.articlesExtracted = articles.length

  // Insert articles into guide_articles
  for (const article of articles) {
    if (!article.title || !article.body_content) continue

    const slug = article.slug || slugify(article.title)

    // Check for duplicates by slug
    const { data: dup } = await supabase
      .from('guide_articles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (dup) {
      result.duplicates++
      console.log(`  Duplicate slug: ${slug}`)
      continue
    }

    const { error } = await supabase.from('guide_articles').insert({
      title:                  article.title,
      slug,
      body_content:           article.body_content,
      author_byline:          article.author ?? null,
      subtitle:               article.lead_paragraph ?? null,
      guide_slug:             'newcomer-guide',
      source_pdf_filename:    filename,
      source_issue_month:     issueMonth ?? null,
      import_status:          'imported',
      editorial_review_status: 'pending',
      published_at:           null,
      imported_at:            new Date().toISOString(),
    })

    if (error) {
      result.failed++
      console.warn(`  Insert failed for "${article.title}":`, error.message)
    } else {
      result.articlesInserted++
      console.log(`  ✓ Imported: "${article.title}"`)
    }
  }

  // Log the import
  await supabase.from('import_log').insert({
    source_filename:     filename,
    source_type:         'magazine',
    publication_slug:    publicationSlug,
    articles_extracted:  result.articlesExtracted,
    notes:               result.notes.join('; ') || null,
  })

  return result
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  KeepSharing Article Import Engine')
  console.log(`  Reading PDFs from: ${IMPORTS_DIR}`)
  console.log('═══════════════════════════════════════════════════')

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL not set. Add it to .env.local')
    process.exit(1)
  }

  if (!fs.existsSync(IMPORTS_DIR)) {
    console.log(`\nCreating ${IMPORTS_DIR}...`)
    fs.mkdirSync(IMPORTS_DIR, { recursive: true })
    console.log(`\nNo PDFs found. Drop your magazine PDFs in:\n  ${IMPORTS_DIR}\n`)
    console.log('Naming convention: YYYY-MM-publication.pdf')
    console.log('Examples: 2025-03-rrp.pdf, 2024-12-boom.pdf')
    process.exit(0)
  }

  const files = fs.readdirSync(IMPORTS_DIR).filter(f => f.toLowerCase().endsWith('.pdf'))

  if (files.length === 0) {
    console.log(`\nNo PDF files found in ${IMPORTS_DIR}`)
    console.log('Drop magazine PDFs there to begin. Naming: YYYY-MM-publication.pdf')
    process.exit(0)
  }

  console.log(`\nFound ${files.length} PDF file(s):\n`)
  files.forEach(f => console.log(`  ${f}`))

  const results: ImportResult[] = []
  for (const file of files) {
    const result = await processPDF(path.join(IMPORTS_DIR, file))
    results.push(result)
  }

  // Summary
  const total = {
    files: results.length,
    extracted: results.reduce((s, r) => s + r.articlesExtracted, 0),
    inserted: results.reduce((s, r) => s + r.articlesInserted, 0),
    duplicates: results.reduce((s, r) => s + r.duplicates, 0),
    failed: results.reduce((s, r) => s + r.failed, 0),
  }

  console.log('\n═══════════════════════════════════════════════════')
  console.log('  Import Summary')
  console.log('═══════════════════════════════════════════════════')
  console.log(`  PDFs processed:     ${total.files}`)
  console.log(`  Articles extracted: ${total.extracted}`)
  console.log(`  Articles inserted:  ${total.inserted}`)
  console.log(`  Duplicates skipped: ${total.duplicates}`)
  console.log(`  Failed:             ${total.failed}`)
  console.log('\n  Next step: Review extracted articles at /admin/articles/review')
  console.log('═══════════════════════════════════════════════════\n')
}

main().catch(console.error)
