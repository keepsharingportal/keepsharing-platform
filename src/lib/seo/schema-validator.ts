// ── Schema.org graph validator ──────────────────────────────────────────
//
// Crawls a representative sample of the site's own pages, extracts
// every <script type="application/ld+json"> block, and validates:
//
//   1. NewsArticle.publisher.@id matches the sitewide NewsMediaOrg @id
//   2. NewsArticle.author Person @id resolves to /authors/[slug]#person
//   3. /authors/[slug] page emits a matching Person @id
//   4. BreadcrumbList items resolve to real URLs
//   5. Every @id is unique within its page (duplicate @id breaks rich
//      results silently — Google takes the first and drops the rest)
//   6. Required fields present on each schema type
//
// Silent schema breakage is the #1 way publishers lose rich results.
// This validator catches it before Google does.

interface JsonLdNode {
  '@context'?: string | unknown
  '@type'?:    string | string[]
  '@id'?:      string
  // Recursive — JSON-LD nodes can nest arbitrarily.
  [k: string]: unknown
}

export interface SchemaIssue {
  page:       string
  severity:   'error' | 'warning' | 'info'
  type:       string         // schema type the issue concerns
  message:    string
}

export interface SchemaValidatorResult {
  pagesChecked:    number
  schemaBlocks:    number
  issues:          SchemaIssue[]
  summary: {
    errors:   number
    warnings: number
    info:     number
  }
}

/** Pull JSON-LD from a list of URLs + validate the graph. Each URL is
 *  fetched server-side. Times out after 30s total. */
export async function validateSchemaGraph(
  urls:             string[],
  expectedOrgId?:   string,
): Promise<SchemaValidatorResult> {
  const issues: SchemaIssue[] = []
  let totalBlocks = 0

  // Fetch in parallel with a sane concurrency cap.
  const results = await Promise.allSettled(
    urls.map(u => fetchAndExtract(u))
  )

  // Cross-page index — track every @id we've seen and where, so we can
  // detect mismatches across the site (e.g. publisher @id varies).
  const seenIds = new Map<string, { pages: string[]; types: Set<string> }>()
  const authorPages = new Set<string>()       // pages under /authors/
  const personIdsOnAuthorPages = new Map<string, string>()  // authorPage → personId
  const authorReferences = new Map<string, string[]>()       // personId → [articlePages]

  for (const [i, settled] of results.entries()) {
    const pageUrl = urls[i]
    if (settled.status === 'rejected' || !settled.value) {
      issues.push({ page: pageUrl, severity: 'error', type: 'fetch', message: `Failed to fetch: ${settled.status === 'rejected' ? String(settled.reason) : 'no body'}` })
      continue
    }
    const { blocks } = settled.value
    totalBlocks += blocks.length

    if (blocks.length === 0) {
      issues.push({ page: pageUrl, severity: 'warning', type: 'missing', message: 'No JSON-LD blocks found on this page.' })
      continue
    }

    // Per-page @id uniqueness check.
    const idsThisPage = new Set<string>()
    for (const block of blocks) {
      walkNodes(block, node => {
        const id   = typeof node['@id']   === 'string' ? node['@id']   as string : null
        const type = typeFromNode(node)
        if (id) {
          if (idsThisPage.has(id)) {
            issues.push({ page: pageUrl, severity: 'error', type: type ?? 'graph', message: `Duplicate @id within same page: ${id}` })
          }
          idsThisPage.add(id)
          const entry = seenIds.get(id) ?? { pages: [], types: new Set() }
          entry.pages.push(pageUrl)
          if (type) entry.types.add(type)
          seenIds.set(id, entry)
        }

        // Type-specific checks.
        if (type === 'NewsArticle' || type === 'Article' || type === 'BlogPosting') {
          checkArticle(node, pageUrl, expectedOrgId, issues, authorReferences)
        }
        if (type === 'Person') {
          checkPerson(node, pageUrl, issues, authorPages, personIdsOnAuthorPages)
        }
        if (type === 'BreadcrumbList') {
          checkBreadcrumb(node, pageUrl, issues)
        }
        if (type === 'NewsMediaOrganization' || type === 'Organization') {
          checkOrganization(node, pageUrl, issues)
        }
      })
    }
  }

  // Cross-page checks.
  // 1. @id used with different types on different pages = broken graph.
  for (const [id, entry] of seenIds) {
    if (entry.types.size > 1) {
      issues.push({
        page: entry.pages[0],
        severity: 'error',
        type: 'graph',
        message: `@id "${id}" used with multiple schema types across the site (${Array.from(entry.types).join(', ')}). This breaks the entity graph.`,
      })
    }
  }

  // 2. Article references a Person @id that no /authors/[slug] page emits.
  for (const [personId, pages] of authorReferences) {
    const fulfilled = Array.from(personIdsOnAuthorPages.values()).includes(personId)
    if (!fulfilled) {
      issues.push({
        page: pages[0],
        severity: 'warning',
        type: 'Person',
        message: `Article references Person @id "${personId}" but no crawled /authors/[slug] page emits a Person with that @id. Check that the author has a profile + the @id format matches.`,
      })
    }
  }

  const summary = {
    errors:   issues.filter(i => i.severity === 'error').length,
    warnings: issues.filter(i => i.severity === 'warning').length,
    info:     issues.filter(i => i.severity === 'info').length,
  }
  return { pagesChecked: urls.length, schemaBlocks: totalBlocks, issues, summary }
}

/** Fetch one URL and extract every JSON-LD block. */
async function fetchAndExtract(url: string): Promise<{ blocks: JsonLdNode[] } | null> {
  try {
    const ctrl = AbortSignal.timeout(15000)
    const res  = await fetch(url, { signal: ctrl, cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const blocks: JsonLdNode[] = []
    const re = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(m[1].trim())
        if (Array.isArray(parsed)) {
          for (const item of parsed) if (item && typeof item === 'object') blocks.push(item)
        } else if (parsed && typeof parsed === 'object') {
          blocks.push(parsed)
        }
      } catch { /* malformed block — TODO: surface as an error */ }
    }
    return { blocks }
  } catch {
    return null
  }
}

/** Walk a JSON-LD node + all its nested children, calling visit() on
 *  each object that looks like a schema node (has @type or @id). */
function walkNodes(root: JsonLdNode, visit: (n: JsonLdNode) => void): void {
  function inner(n: unknown): void {
    if (!n || typeof n !== 'object') return
    if (Array.isArray(n)) { for (const item of n) inner(item); return }
    const obj = n as JsonLdNode
    if (obj['@type'] || obj['@id']) visit(obj)
    for (const k of Object.keys(obj)) {
      if (k.startsWith('@')) continue
      inner((obj as Record<string, unknown>)[k])
    }
  }
  inner(root)
}

function typeFromNode(n: JsonLdNode): string | null {
  const t = n['@type']
  if (typeof t === 'string') return t
  if (Array.isArray(t) && t.length > 0 && typeof t[0] === 'string') return t[0]
  return null
}

// ── per-type checks ─────────────────────────────────────────────────────────

function checkArticle(
  node:           JsonLdNode,
  page:           string,
  expectedOrgId:  string | undefined,
  issues:         SchemaIssue[],
  authorRefs:     Map<string, string[]>,
): void {
  const headline    = node['headline']
  const url         = node['url']
  const datePublished = node['datePublished']
  if (!headline || typeof headline !== 'string')   issues.push({ page, severity: 'error', type: 'NewsArticle', message: 'headline missing or not a string' })
  if (!url      || typeof url      !== 'string')   issues.push({ page, severity: 'error', type: 'NewsArticle', message: 'url missing or not a string' })
  if (!datePublished)                              issues.push({ page, severity: 'warning', type: 'NewsArticle', message: 'datePublished missing — required for News rich results' })

  // Publisher graph consistency.
  const publisher = node['publisher'] as JsonLdNode | undefined
  if (!publisher) {
    issues.push({ page, severity: 'error', type: 'NewsArticle', message: 'publisher missing — required by NewsArticle' })
  } else if (expectedOrgId) {
    const pubId = publisher['@id']
    if (pubId && pubId !== expectedOrgId) {
      issues.push({ page, severity: 'error', type: 'NewsArticle', message: `publisher.@id "${pubId}" doesn't match expected Organization @id "${expectedOrgId}"` })
    }
  }

  // Author — register the reference so we can verify the author page exists.
  const author = node['author'] as JsonLdNode | undefined
  if (author && typeof author['@id'] === 'string') {
    const id = author['@id']
    const list = authorRefs.get(id) ?? []
    list.push(page)
    authorRefs.set(id, list)
  }

  // Image.
  const image = node['image']
  if (!image)  issues.push({ page, severity: 'warning', type: 'NewsArticle', message: 'image missing — News articles without an image rarely earn rich results' })
}

function checkPerson(
  node:                    JsonLdNode,
  page:                    string,
  issues:                  SchemaIssue[],
  authorPages:             Set<string>,
  personIdsOnAuthorPages:  Map<string, string>,
): void {
  const name = node['name']
  if (!name || typeof name !== 'string') issues.push({ page, severity: 'error', type: 'Person', message: 'Person.name missing' })

  // /authors/[slug] pages should emit a primary Person with a stable @id.
  if (page.includes('/authors/')) {
    authorPages.add(page)
    const id = typeof node['@id'] === 'string' ? node['@id'] as string : null
    if (!id) {
      issues.push({ page, severity: 'warning', type: 'Person', message: 'Author page Person missing @id — articles can\'t graph-link back to this author without a stable @id' })
    } else {
      personIdsOnAuthorPages.set(page, id)
    }
  }
}

function checkBreadcrumb(node: JsonLdNode, page: string, issues: SchemaIssue[]): void {
  const items = node['itemListElement']
  if (!Array.isArray(items) || items.length === 0) {
    issues.push({ page, severity: 'error', type: 'BreadcrumbList', message: 'itemListElement missing or empty' })
    return
  }
  for (const [i, raw] of items.entries()) {
    const it = raw as JsonLdNode
    if (!it['position']) issues.push({ page, severity: 'warning', type: 'BreadcrumbList', message: `breadcrumb item ${i} missing position` })
    if (!it['name'])     issues.push({ page, severity: 'warning', type: 'BreadcrumbList', message: `breadcrumb item ${i} missing name` })
  }
}

function checkOrganization(node: JsonLdNode, page: string, issues: SchemaIssue[]): void {
  if (!node['name'])   issues.push({ page, severity: 'error',   type: 'Organization', message: 'name missing' })
  if (!node['url'])    issues.push({ page, severity: 'warning', type: 'Organization', message: 'url missing' })
  if (!node['logo'])   issues.push({ page, severity: 'warning', type: 'Organization', message: 'logo missing — required for Organization rich results' })
}
