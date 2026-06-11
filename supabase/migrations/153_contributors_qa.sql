-- ── Contributor Q&A pipeline — magic-link forms → AI-drafted articles ──────
--
-- Vision: editorial team sends a contributor a magic link. Contributor
-- answers a structured Q&A in the form. AI drafts an article using the
-- responses + the brand's voice + format guide. Editor reviews + publishes
-- the draft to the chosen brand (RRP, or other publications in the
-- multi-brand network).
--
-- Why this matters: scales editorial output dramatically. The contributor
-- doesn't need to know how to write a publishable article — they just
-- answer questions thoughtfully. The AI handles voice, structure, headline
-- options, suggested pull quotes.
--
-- Adds:
--   contributors           — people who can contribute (name, email, bio,
--                            expertise tags, photo). Built up over time
--                            so we don't lose context between commissions.
--   contributor_invites    — magic-link tokens with a Q&A template and
--                            optional pre-filled context (the "ask"). One
--                            row per commission.
--   contributor_responses  — submitted answers, with the AI-generated
--                            article draft saved alongside for review.
--   qa_templates           — reusable question sets the editorial team
--                            can pick from when sending an invite
--                            ("birthday spotlight," "expert column,"
--                            "local-mom feature," etc.).
--
-- Magic-link UX: /contribute/<token> — no login needed. Token is 256-bit
-- random, single-use (expires when the form is submitted; expiry stamp
-- on the row).

CREATE TABLE IF NOT EXISTS contributors (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  email                 TEXT NOT NULL,
  phone                 TEXT NULL,
  bio                   TEXT NULL,
  expertise_tags        TEXT[] NOT NULL DEFAULT '{}',
  photo_url             TEXT NULL,
  -- Brand affinity — which publications this contributor is suited for.
  -- Free-form so multi-brand expansion doesn't need a schema change.
  brand_slugs           TEXT[] NOT NULL DEFAULT '{rrp}',
  notes                 TEXT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID NULL,                       -- admin_users.id
  -- Stats
  invites_sent          INT NOT NULL DEFAULT 0,
  invites_completed     INT NOT NULL DEFAULT 0,
  last_contributed_at   TIMESTAMPTZ NULL,
  UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_contributors_tags ON contributors USING GIN (expertise_tags);
CREATE INDEX IF NOT EXISTS idx_contributors_brand ON contributors USING GIN (brand_slugs);

CREATE TABLE IF NOT EXISTS qa_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  description           TEXT NULL,
  -- Questions structure: [{key: 'opening', label: '...', placeholder: '...', required: true}]
  questions             JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- AI drafting hints — voice, length, structure that override the brand
  -- defaults for this template ("write in first person from the
  -- contributor's perspective, ~600 words, ends with a soft call-to-action").
  ai_drafting_brief     TEXT NULL,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contributor_invites (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id        UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
  template_id           UUID NULL REFERENCES qa_templates(id) ON DELETE SET NULL,
  -- 256-bit random base64url. Never reused. Single-use after submit.
  token                 TEXT NOT NULL UNIQUE,
  -- Free-text "what we're asking for" — surfaced at the top of the form
  -- so the contributor knows what we want.
  ask                   TEXT NULL,
  -- Brand this commission is for.
  brand_slug            TEXT NOT NULL DEFAULT 'rrp',
  -- Section/column target — so the draft can match house format.
  target_column         TEXT NULL,
  -- Effective questions (may diverge from the template at send time —
  -- editorial sometimes adds context-specific questions).
  questions             JSONB NOT NULL DEFAULT '[]'::jsonb,
  status                TEXT NOT NULL DEFAULT 'pending', -- pending | completed | expired | revoked
  expires_at            TIMESTAMPTZ NULL,
  sent_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_by               UUID NULL,
  completed_at          TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_invites_contributor
  ON contributor_invites (contributor_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_invites_token
  ON contributor_invites (token);
CREATE INDEX IF NOT EXISTS idx_invites_status
  ON contributor_invites (status, sent_at DESC);

CREATE TABLE IF NOT EXISTS contributor_responses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id             UUID NOT NULL REFERENCES contributor_invites(id) ON DELETE CASCADE,
  contributor_id        UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
  -- The full responses as submitted, keyed by question key.
  responses             JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- AI-generated draft article (title + body + suggested tags + 2-3
  -- headline options). Stored as JSON so the editor UI can present
  -- it nicely; once approved, the editor copies it into guide_articles
  -- with one click.
  ai_draft              JSONB NULL,
  ai_draft_generated_at TIMESTAMPTZ NULL,
  ai_draft_caller       TEXT NULL,                      -- for audit ('contributor.qa.draft')
  -- Final disposition.
  status                TEXT NOT NULL DEFAULT 'awaiting_review', -- awaiting_review | drafted | published | rejected
  published_article_id  UUID NULL,                      -- guide_articles.id
  rejected_reason       TEXT NULL,
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at           TIMESTAMPTZ NULL,
  reviewed_by           UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_responses_status
  ON contributor_responses (status, submitted_at DESC);

ALTER TABLE contributors            ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_templates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributor_invites     ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributor_responses   ENABLE ROW LEVEL SECURITY;
-- Service-role for admin work. Public can READ a single invite row by
-- token via the unauthenticated landing page — that's enforced by the
-- API route, not RLS, since matching the token is the auth.

COMMENT ON TABLE contributors IS
  'People who contribute editorial Q&A responses. Built up over time so context persists across commissions.';
COMMENT ON TABLE qa_templates IS
  'Reusable question sets for common commission types. Editorial picks one when sending an invite.';
COMMENT ON TABLE contributor_invites IS
  'Magic-link tokens. One row per commission. Token is the auth.';
COMMENT ON TABLE contributor_responses IS
  'Submitted Q&A + AI-generated draft. Editor reviews, optionally publishes to guide_articles.';

-- Seed two template patterns so the editorial team has working defaults.
INSERT INTO qa_templates (slug, name, description, questions, ai_drafting_brief) VALUES
('mom-knows-best', 'Mom Knows Best — first-person column',
 'A local mom writes a first-person piece about something she has lived experience with.',
 '[
   {"key":"hook","label":"What''s the moment / story that sparked this?","placeholder":"Be specific — the lunchbox you forgot, the call from school, the night you didn''t sleep.","required":true},
   {"key":"context","label":"What''s the broader situation?","placeholder":"Who, when, where — give us enough to set the scene.","required":true},
   {"key":"insight","label":"What did you learn or realize?","placeholder":"The thing you''d want to tell a friend over coffee.","required":true},
   {"key":"practical","label":"What''s one practical thing other moms could take away?","placeholder":"A tip, a script, a mindset shift — something concrete.","required":false},
   {"key":"open","label":"Anything else you want to make sure we capture?","placeholder":"","required":false}
 ]'::jsonb,
 'Write in first person from the contributor''s perspective. Warm, modern-parenting voice. ~500-700 words. Lead with the hook moment. Weave the insight through the practical takeaway. End with one sentence that lands.'
),
('expert-column', 'Expert Column — Q&A with a local pro',
 'A local expert (pediatrician, educator, financial planner) answers a structured Q&A; AI writes it up as a magazine article.',
 '[
   {"key":"expertise","label":"What''s your area of expertise + how long have you been doing this?","required":true},
   {"key":"topic","label":"What''s the central question this article should answer?","required":true},
   {"key":"common_mistake","label":"What''s a common mistake families make about this?","required":true},
   {"key":"correct_approach","label":"What''s the right approach instead?","required":true},
   {"key":"when_to_seek_help","label":"When should a family reach out to a professional?","required":false},
   {"key":"local_context","label":"Anything specific to the River Region (Montgomery / Prattville / etc.) we should mention?","required":false}
 ]'::jsonb,
 'Write as a third-person article quoting the expert. Magazine-grade tone — informative, not promotional. ~600-800 words. Lead with the common-mistake angle. Include 2-3 direct quotes attributed by name + credential.'
)
ON CONFLICT (slug) DO NOTHING;
