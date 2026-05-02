# BUILD RUN #11 — Article Import + Newsletter Signup Forms + GHL Tagging

**This build adds two layers to the platform: content depth (12 months of imported articles) and email capture (signup forms across every relevant page wired to GHL).**

═══════════════════════════════════════════════════════
## CRITICAL FRAMING
═══════════════════════════════════════════════════════

Two distinct deliverables in one build. Both are bounded and well-defined.

**Deliverable 1: Article Import Engine** — A reusable extraction pipeline that pulls articles from PDF magazines and bulk-imports them to the `guide_articles` table for editorial review.

**Deliverable 2: Newsletter Signup Forms** — Reusable signup component placed strategically across the platform with GHL tagging integration.

**STRICT TASK ORDER. Stop if blocked.** If Task 1 fails or hits blockers, document and move to Task 2. The deliverables are independent — one failing doesn't block the other.

═══════════════════════════════════════════════════════
## STRATEGIC PRINCIPLES
═══════════════════════════════════════════════════════

- **"We Help Your Future Customers Find You."** Tagline locked.
- **Editorial moat via content depth.** 12 months of imported articles makes the platform a genuine local resource, not just a sales surface.
- **Email is the highest-value retention asset.** Every visitor who provides email becomes a long-term relationship via GHL.
- **GHL tag: `rrp-main-email`** is the primary newsletter tag. Contextual tags layered on top for segmentation.
- **The 23 Points formula** applies to newsletter signup CTAs — niche, emotional, benefit-driven.
- **No mock data ships.** Every signup form must actually capture data and tag in GHL or fail explicitly.

═══════════════════════════════════════════════════════
## OPERATING RULES
═══════════════════════════════════════════════════════

Auto-approve: file edits, terminal commands, npm installs, package additions, migrations applied via SQL editor instructions, content writing.

STOP only on:
1. Unresolvable build/runtime errors after 3 attempts on a single task
2. Strategic decisions not specified in this prompt
3. Destructive operations
4. Missing credentials in `.env.local`

Required reading before starting:
- `/docs/keepsharing-knowledge-base.md`
- `/src/app/newcomer-guide/articles/[slug]/page.tsx` (existing article page)
- `/src/app/api/leads/capture/route.ts` (existing lead capture endpoint)
- `/src/lib/ghl.ts` (GHL integration)
- Most recent migrations (021-024)

═══════════════════════════════════════════════════════
## DEFENSIVE STARTUP CHECK
═══════════════════════════════════════════════════════

Verify guide_articles table is ready:
```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'guide_articles' ORDER BY ordinal_position;
```

Should have: id, title, slug, body_content, hero_image_url, author_name, published_at, publication_id, etc.

Verify dev server starts:
```bash
rm -rf .next && npm run dev
```

═══════════════════════════════════════════════════════
## TASK 1 — ARTICLE IMPORT ENGINE
═══════════════════════════════════════════════════════

### 1A — Migration `025_article_import.sql`

```sql
-- Add fields to guide_articles for import tracking
ALTER TABLE guide_articles 
ADD COLUMN IF NOT EXISTS source_pdf_filename TEXT,
ADD COLUMN IF NOT EXISTS source_pdf_page INT,
ADD COLUMN IF NOT EXISTS source_issue_month DATE,
ADD COLUMN IF NOT EXISTS import_status TEXT DEFAULT 'imported',
ADD COLUMN IF NOT EXISTS editorial_review_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS editorial_notes TEXT,
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ DEFAULT NOW();

-- import_status: 'imported' / 'extraction_failed' / 'duplicate'
-- editorial_review_status: 'pending' / 'approved' / 'rejected' / 'needs_edit'

CREATE INDEX IF NOT EXISTS idx_guide_articles_review ON guide_articles(editorial_review_status);
CREATE INDEX IF NOT EXISTS idx_guide_articles_issue_month ON guide_articles(source_issue_month);

-- Track imported PDFs to prevent re-import
CREATE TABLE IF NOT EXISTS import_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_filename TEXT UNIQUE,
  source_type TEXT, -- 'magazine' / 'guide' / 'other'
  publication_id UUID,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  articles_extracted INT DEFAULT 0,
  advertisers_found INT DEFAULT 0,
  notes TEXT
);
```

### 1B — Build extraction script `/scripts/import-articles.ts`

A Node.js script that:

1. **Reads PDFs from a directory** — Default: `/imports/magazines/` (Jason creates this folder, drops PDFs in it)
   - Alternative: if Google Drive MCP is configured, read from Drive folder
   - Filename convention expected: `YYYY-MM-publication.pdf` (e.g., `2025-03-rrp.pdf`)
   - If filename doesn't follow convention, log warning and prompt for issue_month

2. **Extracts text and structure from each PDF** using `pdf-parse` library:
   ```bash
   npm install pdf-parse
   ```
   For each PDF:
   - Extract all text per page
   - Identify article boundaries (heading patterns, byline patterns)
   - For each detected article, capture: title, body text, author if present, page number
   - Identify advertisers (typically appear with consistent design patterns — look for business names, phone numbers, addresses)

3. **AI-assisted extraction enhancement** — for each detected article:
   - Pass the raw extracted text to Claude Haiku (already configured for the platform)
   - Prompt: "Extract a clean article from this magazine page. Return: title, slug suggestion, author, lead paragraph, body content (markdown), suggested categories"
   - Use the Claude API key already in `.env.local` (`ANTHROPIC_API_KEY`)

4. **Inserts into guide_articles** with:
   - `editorial_review_status = 'pending'` (so DeAnne reviews before publishing)
   - `published_at = NULL` (hidden until published)
   - `source_pdf_filename`, `source_pdf_page`, `source_issue_month` populated
   - `publication_id` resolved from filename suffix (rrp/boom/aop/mbp/esp/gpp)

5. **Logs to import_log table** so re-running doesn't duplicate

6. **Writes summary report** to console:
   ```
   Processed: 12 PDFs
   Articles extracted: 87
   Articles inserted: 79 (8 marked as duplicates)
   Advertisers identified: 142 (32 new, 110 existing matches)
   Failed extractions: 2 (logged in import_log.notes)
   ```

### 1C — Optional: Google Drive integration

If Google Drive MCP is available in the environment:

```typescript
// Check for Drive MCP availability
if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
  // Use MCP to list files in folder
  // Download each PDF to local temp directory
  // Process as normal
}
```

If MCP isn't available, fall back to reading from local `/imports/magazines/` directory. Document in script comments which path is being used.

### 1D — Editorial review queue at `/admin/articles/review`

Build `/src/app/admin/articles/review/page.tsx`:

- Lists all guide_articles where `editorial_review_status = 'pending'`
- Sorted by source_issue_month DESC (most recent first)
- Each article card:
  - Title + extracted lead paragraph
  - Source PDF + page number
  - Issue month
  - "Preview" button → opens article rendered as it would appear on the platform
  - "Edit" button → opens edit form to fix extraction errors
  - "Approve & Publish" button → sets status='approved', published_at=NOW()
  - "Reject" button → sets status='rejected'
  - "Needs Edit" button → sets status='needs_edit', opens notes field
- Filter by issue month
- Search by title
- Bulk actions: "Approve all selected" / "Reject all selected"

### 1E — Article editor at `/admin/articles/[id]/edit`

Build `/src/app/admin/articles/[id]/edit/page.tsx`:

Simple form to fix extraction errors:
- Title (text input)
- Slug (auto-generated from title, editable)
- Author (text input)
- Lead paragraph (textarea)
- Body content (large textarea with markdown support)
- Hero image URL (upload or paste URL)
- Categories (multi-select)
- Editorial notes (textarea, internal only)
- Save button (preserves status as 'needs_edit')
- Save & Approve button (sets status='approved', published_at=NOW())

### 1F — Test with sample PDFs

Create `/imports/magazines/` directory in the project root.

Create a TEST PDF if no real PDFs are available — use any 2-3 page document with clear article structure, name it `2025-01-test.pdf`, drop it in the folder.

Run the import script:
```bash
npm run import-articles
```

Verify:
- Articles appear in `/admin/articles/review`
- Editorial review interface works
- Approving an article makes it visible at `/newcomer-guide/articles/[slug]`

### 1G — DONE WHEN

[ ] Migration 025 applied
[ ] /scripts/import-articles.ts script built
[ ] pdf-parse package installed
[ ] AI extraction enhancement wired to Claude API
[ ] /admin/articles/review queue functional
[ ] /admin/articles/[id]/edit form functional  
[ ] Test PDF processed successfully (or one real PDF if Jason has provided)
[ ] At least 1 article approved and visible at /newcomer-guide/articles/[slug]
[ ] Documentation in /docs/article-import-guide.md explaining how Jason runs imports

═══════════════════════════════════════════════════════
## TASK 2 — NEWSLETTER SIGNUP FORMS + GHL TAGGING
═══════════════════════════════════════════════════════

### 2A — Build reusable component `/src/components/newsletter/NewsletterSignup.tsx`

Three variants in one component (props control which one renders):

**Variant 1: `inline`** — full-width banner with image, headline, subhead, email field, button.
Used in: article footers, /newcomer-guide footer

**Variant 2: `compact`** — small horizontal bar with email field + button only.
Used in: site footer, sidebars

**Variant 3: `popup`** — modal overlay with hero image, headline, body copy, email field, button, close X.
Triggered by: 60% scroll on /newcomer-guide and article pages

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, CheckCircle2 } from 'lucide-react';

interface NewsletterSignupProps {
  variant: 'inline' | 'compact' | 'popup';
  source: string; // 'article-footer' / 'main-footer' / 'guide-popup' / etc.
  context?: {
    article_slug?: string;
    article_category?: string;
    listing_slug?: string;
  };
  headline?: string;
  subheadline?: string;
  cta_label?: string;
  on_close?: () => void;
}

export function NewsletterSignup(props: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [first_name, setFirstName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Build tags array based on context
    const tags = ['rrp-main-email', `source-${props.source}`];
    if (props.context?.article_category) {
      tags.push(`interest-${props.context.article_category}`);
    }
    if (props.context?.listing_slug) {
      tags.push(`engaged-listing-${props.context.listing_slug}`);
    }
    
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          first_name,
          source: props.source,
          context: props.context,
          ghl_tags: tags,
        }),
      });
      
      if (response.ok) {
        setIsSubmitted(true);
      }
    } catch (error) {
      console.error('Subscribe failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // ... render based on variant
}
```

### 2B — Build API endpoint `/src/app/api/newsletter/subscribe/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { addContactToGHL, addTagsToGHLContact } from '@/lib/ghl';

export async function POST(request: Request) {
  const body = await request.json();
  const { email, first_name, source, context, ghl_tags } = body;
  
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }
  
  const supabase = createClient();
  
  // Insert into newsletter_subscribers (or use existing table)
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .upsert({
      email,
      first_name,
      source,
      context_data: context,
      tags: ghl_tags,
      subscribed_at: new Date().toISOString(),
    }, { onConflict: 'email' })
    .select()
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Sync to GHL
  try {
    const ghlContactId = await addContactToGHL({
      email,
      firstName: first_name,
      tags: ghl_tags,
    });
    
    // Update with GHL ID
    await supabase
      .from('newsletter_subscribers')
      .update({ ghl_contact_id: ghlContactId })
      .eq('email', email);
  } catch (ghlError) {
    console.error('GHL sync failed:', ghlError);
    // Don't block the response — we have the email saved
  }
  
  return NextResponse.json({ success: true });
}
```

### 2C — Migration `026_newsletter_subscribers.sql`

```sql
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  source TEXT,
  context_data JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  ghl_contact_id TEXT,
  publication_id UUID,
  is_subscribed BOOLEAN DEFAULT true,
  unsubscribed_at TIMESTAMPTZ,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_source ON newsletter_subscribers(source);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_tags ON newsletter_subscribers USING GIN(tags);
```

### 2D — Place signup forms strategically

**Add `inline` variant to:**

`/src/app/newcomer-guide/articles/[slug]/page.tsx`:
At the end of the article body, before related articles:
```tsx
<NewsletterSignup
  variant="inline"
  source="article-footer"
  context={{ article_slug: params.slug, article_category: article.category }}
  headline="Want more like this?"
  subheadline="Get the best of River Region Parents in your inbox every Friday morning."
  cta_label="Send Me the Newsletter"
/>
```

`/src/app/newcomer-guide/page.tsx`:
At the end of the main content, before the footer:
```tsx
<NewsletterSignup
  variant="inline"
  source="newcomer-guide-footer"
  headline="Stay in the Loop"
  subheadline="Get our weekly email with what's new, what's coming up, and what local moms are talking about."
  cta_label="Subscribe"
/>
```

**Add `compact` variant to:**

`/src/components/layout/Footer.tsx` (the main site footer):
```tsx
<div className="border-t border-border pt-8 mt-8">
  <NewsletterSignup
    variant="compact"
    source="main-footer"
    headline="Subscribe to our weekly newsletter"
    cta_label="Sign Up"
  />
</div>
```

**Add `popup` variant to:**

`/src/app/newcomer-guide/page.tsx` and `/src/app/newcomer-guide/articles/[slug]/page.tsx`:

Build `/src/components/newsletter/NewsletterPopupTrigger.tsx`:
- Tracks scroll position
- When user reaches 60% scroll AND has been on page >30 seconds AND hasn't dismissed before (localStorage check), shows popup
- Popup uses `<NewsletterSignup variant="popup" />` 
- Sets localStorage flag on dismiss or submit so it doesn't re-trigger on the same browser

### 2E — Lead magnet variants

Three specific lead magnets that go in higher-value placements:

**Lead Magnet 1: "Newcomer to River Region? Get our 12-Page Family Welcome Guide"**
- Placement: top of /newcomer-guide above the fold
- Submitting captures email tagged `lead-magnet-newcomer-guide`
- Triggers GHL workflow that emails the actual PDF Welcome Guide (Jason creates the PDF separately, uploads to /public/lead-magnets/welcome-guide.pdf)
- Auto-redirects to a thank-you page that also includes inline article previews

**Lead Magnet 2: "Get Our Family Saturday Mornings Checklist"**
- Placement: inline on family-activity articles
- Tagged `lead-magnet-saturday-checklist`
- One-page PDF Jason creates separately

**Lead Magnet 3: "School Comparison Workbook"**
- Placement: inline on school articles
- Tagged `lead-magnet-school-workbook`
- Workbook PDF Jason creates

For each, build a small dedicated landing component that's more visual than the standard NewsletterSignup. Hero image of the PDF, "What's inside" bullets, single email capture.

### 2F — Admin view of subscriber list at `/admin/newsletter`

Build `/src/app/admin/newsletter/page.tsx`:

- Total subscribers count at top
- Recent subscribers table (last 50): email, first_name, source, tags, subscribed_at
- Filter by source (article-footer / main-footer / popup / lead-magnet-X)
- Filter by tag
- Search by email
- Export CSV button (for backup or migration to other systems)
- "Sync to GHL" button (re-syncs any subscribers without ghl_contact_id)

### 2G — DONE WHEN

[ ] Migration 026 applied (newsletter_subscribers table)
[ ] NewsletterSignup component built with 3 variants
[ ] /api/newsletter/subscribe endpoint working with GHL sync
[ ] inline variant placed on article pages and /newcomer-guide
[ ] compact variant placed in main site footer
[ ] popup variant triggers on scroll on guide pages
[ ] Three lead magnet variants placed appropriately
[ ] /admin/newsletter subscriber list functional
[ ] Test: submit a signup, verify row in newsletter_subscribers, verify GHL contact created with `rrp-main-email` tag

═══════════════════════════════════════════════════════
## TASK 3 — KNOWLEDGE BASE UPDATE + STATUS REPORT
═══════════════════════════════════════════════════════

### 3A — Update `/docs/keepsharing-knowledge-base.md`

Add section:

```markdown
## BUILD RUN #11 — DEPLOYED [DATE]

### What shipped:
- Article import engine for bulk-loading 12+ months of magazine content
- Editorial review queue at /admin/articles/review
- Article editor at /admin/articles/[id]/edit
- Newsletter signup forms across the platform (inline, compact, popup variants)
- Three lead magnet variants for targeted email capture
- GHL tagging integration with `rrp-main-email` as primary tag plus contextual tags
- /admin/newsletter subscriber list with export

### New tables:
- guide_articles new columns (source tracking, editorial review)
- import_log (prevents duplicate imports)
- newsletter_subscribers

### Pending Jason actions:
- Drop PDFs into /imports/magazines/ folder
- Run `npm run import-articles` to bulk-import
- Review extracted articles at /admin/articles/review
- Create lead magnet PDFs and place at /public/lead-magnets/
- Set up GHL workflows for lead magnet email delivery
```

### 3B — Document in `/docs/article-import-guide.md`

```markdown
# How to Import Articles from Past Magazines

## Setup
1. Create folder: `/imports/magazines/` (in project root)
2. Drop PDFs in. Naming: `YYYY-MM-publication.pdf` (e.g., `2025-03-rrp.pdf`, `2024-12-boom.pdf`)
3. Make sure ANTHROPIC_API_KEY is in `.env.local`

## Run Import
```bash
npm run import-articles
```

## Review
1. Open `/admin/articles/review`
2. For each article: Preview, Edit if needed, Approve / Reject / Needs Edit
3. Approved articles automatically appear at /newcomer-guide/articles/[slug]

## What Gets Extracted
- Article title and body
- Author name
- Issue month and page number
- Suggested categories
- Linked advertisers (when detected)

## What Doesn't Get Extracted
- Photos (PDFs lose photo references — Jason adds hero image during review)
- Complex layouts (multi-column ads with embedded text)
- Handwritten or stylized text

## Troubleshooting
- If extraction fails for a PDF, check import_log table for error notes
- If duplicate detection is too aggressive, check article slugs for collisions
```

### 3C — Final status report

Truthful report covering:
- All migrations applied (025, 026)
- Both tasks with verification status
- Manual test instructions
- Pending Jason actions

### 3D — DONE WHEN

[ ] Knowledge base updated
[ ] /docs/article-import-guide.md exists
[ ] Status report posted truthfully

═══════════════════════════════════════════════════════
## SUCCESS CRITERIA
═══════════════════════════════════════════════════════

Jason can:

1. **Drop a PDF in `/imports/magazines/`** and run `npm run import-articles` to extract articles
2. **Review extracted articles** at `/admin/articles/review` and approve them for publication
3. **See newsletter signup forms** on every article footer, /newcomer-guide footer, main site footer, and as a popup after 60% scroll
4. **Submit an email through any signup** and watch it land in `newsletter_subscribers` table AND create a GHL contact with `rrp-main-email` tag
5. **View subscribers** at `/admin/newsletter` with filtering and export

═══════════════════════════════════════════════════════
## FINAL CHECKLIST
═══════════════════════════════════════════════════════

[ ] Migration 025 applied (article import tracking)
[ ] Migration 026 applied (newsletter_subscribers)
[ ] Article import script built and tested
[ ] Editorial review queue functional
[ ] NewsletterSignup component with 3 variants
[ ] Forms placed strategically across platform
[ ] GHL integration verified
[ ] Documentation written
[ ] Status report posted truthfully

Then STOP.

GO.
