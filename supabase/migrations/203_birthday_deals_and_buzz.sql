-- 203_birthday_deals_and_buzz.sql
--
-- Sprint 12 — Revenue + Community extensions:
--   birthday_deals       — sellable "Birthday Deal" advertiser slots
--   birthday_buzz        — micro-shoutout stream on the portal home
--   advertiser_accounts  — adds birthday_profile JSONB column for vendor
--                          business profile pages (packages, hours, FAQ,
--                          gallery, etc). One JSONB instead of N columns
--                          so the editor can evolve fields without DDL.

-- ── birthday_deals ────────────────────────────────────────────
-- Each row is a paid (or comped) deal/offer from a local business.
-- Drives /birthday-party-guide/deals and sidebar deal cards.
CREATE TABLE IF NOT EXISTS birthday_deals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug       TEXT NOT NULL DEFAULT 'rrp',
  advertiser_id    UUID REFERENCES advertiser_accounts(id) ON DELETE SET NULL,
  business_name    TEXT NOT NULL,                  -- denormalized for display
  category         TEXT NOT NULL,                  -- 'venue','cake','entertainment','rental','printables','gifts'
  headline         TEXT NOT NULL,                  -- "15% off all weekend rentals"
  offer            TEXT NOT NULL,                  -- the actual deal text
  redeem_how       TEXT,                           -- "Mention RRP at booking"
  promo_code       TEXT,                           -- optional code
  image_url        TEXT,
  link_url         TEXT,                           -- vendor's booking page / phone
  valid_from       DATE,
  valid_until      DATE,
  display_order    INT NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured      BOOLEAN NOT NULL DEFAULT FALSE, -- featured tier sits at the top
  view_count       INT NOT NULL DEFAULT 0,
  click_count      INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_birthday_deals_active_brand
  ON birthday_deals (is_active, brand_slug, is_featured DESC, display_order);
CREATE INDEX IF NOT EXISTS idx_birthday_deals_validity
  ON birthday_deals (valid_until) WHERE is_active = TRUE;

-- ── birthday_buzz ─────────────────────────────────────────────
-- The micro-shoutout stream. Editor or auto-pulled mom submissions
-- form short "Sarah's 4yo loved the dinosaur dig party at Newtopia!"
-- entries. Lightweight UGC + local color.
CREATE TABLE IF NOT EXISTS birthday_buzz (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug    TEXT NOT NULL DEFAULT 'rrp',
  kind          TEXT NOT NULL CHECK (kind IN ('shoutout','tip','milestone','vendor_spotlight','editor_pick')),
  body          TEXT NOT NULL,                     -- the micro-content (1-2 sentences)
  from_name     TEXT,                              -- "From Sarah, Pike Road" / "Editor's pick"
  image_url     TEXT,
  vendor_id     UUID REFERENCES advertiser_accounts(id) ON DELETE SET NULL,
  vendor_name   TEXT,                              -- denormalized
  link_url      TEXT,
  posted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,                       -- when to fall off the stream
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_birthday_buzz_active_brand_recent
  ON birthday_buzz (is_active, brand_slug, posted_at DESC);

-- ── advertiser_accounts.birthday_profile ──────────────────────
-- JSONB column for vendor business profile page content. Shape:
--   {
--     "tagline": "Mobile gymnastics for ages 2-6",
--     "hours": [{ "day":"Mon-Fri","open":"9:00","close":"5:00" }, ...],
--     "phone": "(334) 555-1234",
--     "email": "hello@example.com",
--     "gallery": ["url1","url2","url3"],
--     "packages": [{
--       "name":"Party Package",
--       "price":"$295",
--       "duration":"90 minutes",
--       "includes":["10 kids","setup/cleanup","T-shirt for birthday child"]
--     }],
--     "faq": [{"q":"...","a":"..."}],
--     "good_for_ages":[2,6],
--     "indoor_outdoor":["indoor","both"],
--     "neighborhoods_served":["Montgomery","Prattville"]
--   }
-- Editor manages from /admin/advertisers/[id]/birthday-profile.
ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS birthday_profile JSONB,
  ADD COLUMN IF NOT EXISTS birthday_tier TEXT CHECK (birthday_tier IN ('standard','featured','sponsored_category','presenting'));

-- ── birthday_club_subscribers — sponsorable email list ───────
-- Same shape as birthday_planning_subscribers but ungated by source —
-- this is the SELLABLE NEWSLETTER list. Birthday Club subscribers
-- get the monthly themed newsletter (Birthday Insider is a different
-- product — keep them separate so we can sell each independently).
CREATE TABLE IF NOT EXISTS birthday_club_subscribers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug     TEXT NOT NULL DEFAULT 'rrp',
  email          TEXT NOT NULL,
  parent_first_name TEXT,
  kid_birthdays  JSONB DEFAULT '[]',               -- [{name,month,year}, ...]
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand_slug, email)
);

COMMENT ON TABLE birthday_deals IS
  'Paid (or comped) Birthday Deal slots from local advertisers. Drives the /deals page + sidebar cards. is_featured sits at top.';
COMMENT ON TABLE birthday_buzz IS
  'Micro-shoutout stream on the portal home — "this just happened in River Region birthdays" feed. Mixes UGC, editor picks, vendor spotlights.';
COMMENT ON COLUMN advertiser_accounts.birthday_profile IS
  'JSONB for the vendor business profile page (packages, hours, FAQ, gallery). Empty = render basic profile from existing fields only.';
COMMENT ON COLUMN advertiser_accounts.birthday_tier IS
  'Sponsorship tier for the Birthday Bash portal. Drives placement priority + which page sections feature the vendor.';
COMMENT ON TABLE birthday_club_subscribers IS
  'Sellable monthly newsletter list (separate from Birthday Insider). Sponsor pays per issue; brand keeps the list.';
