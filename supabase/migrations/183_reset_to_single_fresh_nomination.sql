-- ── Reset test data: clear the old 6, seed ONE fresh nomination ─────────────
--
-- Wipes the prior test submissions (and any guide_articles the publish
-- bridge created from them) and inserts a SINGLE realistic nominated
-- Mom-to-Mom submission at the very start of the workflow. Lets you
-- walk the entire flow end-to-end:
--
--   nominated  → click "Approve & send email" in OutreachComposerPanel
--   outreach-sent  → (nominee replies in real life) → mark accepted
--   nominee-accepted  → click "Send interview form"
--   interview-sent  → nominee opens /interview/[token], submits Q&A + photos
--   interview-received  → "Start draft" → AIDraftPanel generates body
--   draft-in-progress  → editor refines
--   draft-ready  → channel approvals → "Approve & send to pool"
--   approved → "Send to monthly pool"
--   in-pool  → /admin/pending → schedule a month → publish-now
--   published  → homepage rotation + Meta Suite auto-post if approved_social
--
-- All test data tagged with the same editor_notes so cleanup is one
-- query (in the migration footer comment).

-- 1. Drop any guide_articles created by the publish bridge from old
--    test submissions. ON DELETE SET NULL on the FK means we don't
--    cascade automatically, so we surface them explicitly.
DELETE FROM guide_articles
WHERE id IN (
  SELECT promoted_to_article_id
  FROM community_submissions
  WHERE editor_notes = '[TEST DATA - safe to delete]'
    AND promoted_to_article_id IS NOT NULL
);

-- 2. Drop the old test submissions themselves
DELETE FROM community_submissions
WHERE editor_notes = '[TEST DATA - safe to delete]';

-- 3. Insert ONE fresh nominated Mom-to-Mom submission.
--    Submitter = the nominator (Lauren).
--    Nominee = the mom being nominated (Whitney).
--    No draft, no interview, no approvals — full clean slate so the
--    OutreachComposerPanel renders with its real Mom-to-Mom template.
INSERT INTO community_submissions (
  id,
  submission_type, target_publication,
  status, phase, ai_draft_status,
  submitter_name, submitter_email, submitter_phone,
  nominee_name, nominee_email, nominee_phone,
  related_person_name,
  working_title, excerpt, slug_suggestion,
  payload,
  editor_notes,
  created_at, updated_at
) VALUES (
  '22222222-2222-4222-8222-222222222201',
  'mom-to-mom', 'rrp',
  'new', 'nominated', 'none',
  'Lauren Hadley', 'lauren.hadley@example.com', '(334) 555-0117',
  'Whitney Cole',  'whitney.cole@example.com',  '(334) 555-0142',
  'Whitney Cole',
  'Whitney Cole — mom of three navigating early-onset breast cancer with a Pre-K classroom in the mix',
  'Lauren nominated Whitney, a college friend and Pre-K teacher at Trinity Presbyterian, who at 34 was diagnosed with early-onset breast cancer and has continued showing up for her three kids and her students through every round of treatment.',
  'whitney-cole-mom-of-three-breast-cancer',
  $payload$ {
    "nominee_first_name":  "Whitney",
    "nominee_last_name":   "Cole",
    "nominee_email":       "whitney.cole@example.com",
    "nominee_phone":       "(334) 555-0142",
    "nominee_city":        "Montgomery",
    "your_relationship":   "College friend — known her 10+ years",
    "why_nominate":        "Whitney is a mom of three (ages 8, 5, and 2) who was diagnosed with early-onset breast cancer at 34 last fall. The way she has held her family together through treatment while also continuing to show up for her community as a Pre-K teacher at Trinity Presbyterian is something every mom in the River Region should hear about. She is real, she is funny in the way only someone who has stared down the worst can be, and she would say yes to talking about this if you ask her right.",
    "good_to_know":        "Her treatment is ongoing — if you reach out, please give her flexibility on timing. Mornings are usually better than afternoons (she teaches all day)."
  } $payload$::jsonb,
  '[TEST DATA - safe to delete]',
  NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'
);

-- ── Cleanup query (run when you're done validating the workflow) ────────────
--
--   DELETE FROM guide_articles
--   WHERE id IN (
--     SELECT promoted_to_article_id
--     FROM community_submissions
--     WHERE editor_notes = '[TEST DATA - safe to delete]'
--       AND promoted_to_article_id IS NOT NULL
--   );
--   DELETE FROM community_submissions WHERE editor_notes = '[TEST DATA - safe to delete]';
