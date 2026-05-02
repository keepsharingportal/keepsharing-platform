# How to Import Articles from Past Magazines

## Setup

1. Create folder: `/imports/magazines/` in the project root (auto-created on first run)
2. Drop PDFs in the folder. Naming convention:  
   `YYYY-MM-publication.pdf` — e.g., `2025-03-rrp.pdf`, `2024-12-boom.pdf`
3. Make sure `ANTHROPIC_API_KEY` is in `.env.local` (needed for AI extraction)
4. Make sure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are in `.env.local`

## Run Import

```bash
npm run import-articles
```

The script will:
1. Find all PDFs in `/imports/magazines/`
2. Skip any already processed (tracked in `import_log` table)
3. Extract text from each PDF
4. Use Claude Haiku to identify and structure articles
5. Insert articles into `guide_articles` with `editorial_review_status = 'pending'`

## Review Extracted Articles

1. Open `/admin/articles/review`
2. For each article:
   - **Preview** — click the external link icon to see how it renders
   - **Edit** — fix any extraction errors (title, slug, body, author)
   - **Approve & Publish** — sets `published_at = NOW()`, makes it live at `/newcomer-guide/articles/[slug]`
   - **Needs Edit** — saves your notes, keeps it in the queue
   - **Reject** — removes it from the queue

## What Gets Extracted

- Article title
- Article body (converted to markdown)
- Author name (when present)
- Issue month (from filename)
- Source PDF filename and page number

## What Doesn't Get Extracted

- **Photos** — PDFs don't reliably export image references. Add hero images manually during review by pasting an image URL in the edit form.
- **Complex multi-column layouts** — may extract as garbled text. Edit manually.
- **Handwritten or stylized text** — designer fonts may not extract. Edit manually.
- **Ads** — the AI filters these out, but some may slip through as false positives. Reject them in the review queue.

## Troubleshooting

### Script says "No PDFs found"
- Check the folder path: `/imports/magazines/` in the project root
- Check the filename ends in `.pdf` (lowercase)

### Articles not extracting (blank bodies)
- The PDF may be image-only (scanned). The AI can't extract text from images.
- Open the PDF in Preview/Acrobat and try to select/copy text. If you can't, it's image-only.
- Image-only PDFs need manual transcription or OCR software.

### Extraction quality is poor
- The AI extraction is a starting point — expect to edit ~30% of articles
- Titles are usually accurate
- Body text may have extra line breaks or formatting artifacts
- Use the `/admin/articles/[id]/edit` page to clean up before approving

### Re-running skips all PDFs
- The `import_log` table tracks processed files. To re-process, delete the relevant row from `import_log` in the Supabase dashboard.

### ANTHROPIC_API_KEY not set
- Without the API key, the script still runs but uses only raw PDF text
- Articles will be inserted with blank body content
- You'll need to paste the article body manually in the edit form

## Verification Checklist

After running import, verify:
- [ ] Articles appear in `/admin/articles/review` with `pending` status
- [ ] Source PDF filename and issue month are correct
- [ ] Article titles look reasonable (not "Advertisement" or "Page 1")
- [ ] Approve 1-2 test articles and verify they appear at `/newcomer-guide/articles/[slug]`

---

*Last updated: May 2026*
