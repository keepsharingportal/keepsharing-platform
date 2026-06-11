-- ── Brand voice — per-publication AI drafting context ─────────────────────
--
-- src/lib/markets.ts already defines the six brands (RRP, BOOM, AOP, MBP,
-- ESP, GPP) — that's the source of truth for slug/display/city/state.
-- This migration adds the *content-context* layer: the voice notes, do/don't
-- lists, and format defaults the AI integration reads when generating
-- content for a specific brand.
--
-- Editorial sets this once per brand at /admin/settings/brands. The
-- contributor Q&A draft generator, social caption assist, and editorial
-- calendar suggester all read from here so a piece written for BOOM
-- (50+ audience) doesn't come out sounding like RRP (family/parents).

CREATE TABLE IF NOT EXISTS brand_voice (
  brand_slug                TEXT PRIMARY KEY,
  -- The "who reads this" mental model — drives audience-fit decisions.
  audience_summary          TEXT NOT NULL DEFAULT '',
  -- Concrete voice rules ("warm but never saccharine; second-person
  -- works; avoid 'mama' as address"). Free-text but treated as authoritative
  -- by the AI prompt builder.
  voice_rules               TEXT NOT NULL DEFAULT '',
  -- Always-avoid list ("clichés about frazzled moms," "political opinion,"
  -- etc.). Appended verbatim to AI system prompts.
  avoid_list                TEXT NOT NULL DEFAULT '',
  -- Article format hints — default length, structure, ending.
  format_default            TEXT NOT NULL DEFAULT '',
  -- Public-facing site origin (e.g. https://riverregionparents.com).
  -- Used for cross-publish links, contributor magic-link emails, and the
  -- "view live" admin shortcut.
  site_url                  TEXT NULL,
  -- Optional GHL-style branding tags applied to advertiser + contributor
  -- contacts attributed to this brand.
  ghl_tag                   TEXT NULL,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by                UUID NULL                              -- admin_users.id
);

ALTER TABLE brand_voice ENABLE ROW LEVEL SECURITY;

-- Seed RRP + BOOM with their actual voices so the AI integration is
-- immediately useful. Other brands stay blank until editorial fills them
-- in — the prompt builder degrades gracefully when fields are empty.
INSERT INTO brand_voice (brand_slug, audience_summary, voice_rules, avoid_list, format_default) VALUES
('rrp',
 'Parents of elementary-to-tween kids in the River Region (Montgomery, Prattville, Wetumpka, Pike Road, Millbrook, Eastchase). 80% mobile. Skews mom but increasingly dad-inclusive. Trusts local recommendations from other moms more than national authority.',
 'Warm, modern-parenting, in-the-trenches knowing. Second-person works ("you know that feeling…"). Specific places > generic advice ("the 6-table side at El Tara" > "a local restaurant"). Lead with the moment / story, not the lesson. Authority through recognition, not credentials.',
 'Frazzled-mom clichés. "Mama" as universal address. Pre-2010 references. Political opinion. Anything that shames parents or judges other families'' choices. Generic "10 tips" listicle headlines.',
 '500-800 words for a column piece, 800-1200 for a guide. Lead with a moment / scene; weave the insight through; end with one specific line that lands. No formal H2 headers in column pieces — let it breathe.'
),
('boom',
 'Boomers and active 50+ in the River Region. Empty-nest, midlife reinvention, grandparent-adjacent, returning to the workforce, caring for aging parents. Sophisticated readers who want to feel SEEN, not condescended to.',
 'Knowing, observational, occasionally wry. The voice of someone who has lived enough to recognize the pattern. Specifics matter — the cost of prom, the empty-fridge-Sunday before college kids visit, the strangeness of in-laws becoming closer than you''d expect.',
 'Patronizing tone. Anything that treats 50+ as a problem to be managed. Tech references that assume technical literacy ("just check the cloud"). Empty-nester pity. Selling-something-to-old-people energy.',
 '700-1000 words. Lead with the texture of the moment, not the demographic. End with the small truth, not the moral.'
)
ON CONFLICT (brand_slug) DO NOTHING;

COMMENT ON TABLE brand_voice IS
  'Per-brand AI drafting context. Read by the contributor Q&A drafter, caption assist, and editorial calendar suggester.';

-- Helper RPC: increment a contributor''s invites_sent / invites_completed
-- counter atomically. Avoids the "stuck at 1" pattern that comes from
-- using update with a literal value when you don''t know the current count.
CREATE OR REPLACE FUNCTION bump_contributor_invite_sent(contributor_id_in UUID)
RETURNS VOID LANGUAGE SQL AS $$
  UPDATE contributors
     SET invites_sent = invites_sent + 1
   WHERE id = contributor_id_in;
$$;

CREATE OR REPLACE FUNCTION bump_contributor_completed(contributor_id_in UUID)
RETURNS VOID LANGUAGE SQL AS $$
  UPDATE contributors
     SET invites_completed   = invites_completed + 1,
         last_contributed_at = NOW()
   WHERE id = contributor_id_in;
$$;
