-- Migration 230: Fall Festivities & Halloween Fun Guide (2026 edition)
--
-- A DATED guide, unlike Childcare or Special Needs. It goes live 1 Oct 2026 and
-- comes down after Halloween week; it must not sit at the top of Local Guides
-- all winter advertising last year's pumpkin patches.
--
-- Slug decision: `fall-festivities`, matching url_slug
-- `fall-festivities-halloween-fun-guide`. The brief offered `fall-festival` as
-- an alternative; one name everywhere is worth more than a shorter one,
-- especially with a ~92-row import landing against this slug.
--
-- ── Part 1: a publish window for annual guides ──────────────────────────────
-- guide_types has publishes_annually but nothing that says WHEN. Summer Fun is
-- simply always visible, which is fine for a guide whose content ages slowly
-- and badly matched to one that is actively wrong in November.
--
-- Both nullable, so every existing guide keeps its current always-on behaviour
-- with no backfill. Code probes for the columns and degrades to the
-- guide_configs.is_active switch when they are absent, so the guide is safely
-- gated even before this migration is applied.

ALTER TABLE guide_types
  ADD COLUMN IF NOT EXISTS live_from  DATE,
  ADD COLUMN IF NOT EXISTS live_until DATE;

COMMENT ON COLUMN guide_types.live_from IS
  'Seasonal guides only. Before this date the public hub 404s (?preview=1 still renders, noindex). NULL = always live.';
COMMENT ON COLUMN guide_types.live_until IS
  'Seasonal guides only. After this date the public hub 404s. NULL = never expires.';

-- ── Part 2: the guide type ──────────────────────────────────────────────────
-- Copy is written for 2026 rather than adapted from Summer Fun. The insider
-- tips are deliberately advisory rather than claims about specific venues or
-- dates — we have no verified 2026 schedules yet, and inventing them would put
-- wrong information in front of a parent planning a Saturday.

INSERT INTO guide_types (
  slug, url_slug, display_name, short_description, hub_intro_paragraph,
  hero_image_url, primary_filter_field, publishes_annually, display_order,
  pitch, editorial_intro, insider_tips, live_from, live_until
) VALUES (
  'fall-festivities',
  'fall-festivities-halloween-fun-guide',
  'Fall Festivities & Halloween Fun Guide',
  'Fall festivals, pumpkin patches, and Halloween fun across the River Region',
  'Hayrides, corn mazes, trunk-or-treats and the church festival your neighbour swears by — everything happening around the River Region this fall, gathered in one place.',
  NULL,   -- no hero photo yet; upload one at /admin/guides/fall-festivities/edit.
          -- Pointing at a file that isn't in public/ 404s the hero image;
          -- NULL degrades cleanly to the cream PageHeader.
  'category',
  true,
  10,
  'October is the month the River Region finally goes back outside. Pumpkin patches open, churches run trunk-or-treats, schools throw fall festivals — and half of it is only announced on a Facebook page you do not follow. This is that list, before the weekends fill up.',
  E'Fall here arrives as a relief more than a season. The first morning under seventy degrees does something to a household that has spent four months negotiating over the thermostat, and suddenly every weekend has three things happening at once.\n\nThe trouble is finding them. A church trunk-or-treat two streets over might be the best free night of your month, and you will never hear about it unless someone tells you. School festivals are announced in a Thursday folder. Farms post their hours to Facebook and nowhere else. By the time you have pieced it together, the hayride is sold out.\n\nThis guide is the piecing-together, done once. Sorted by the kind of afternoon you are actually looking for — a farm, a festival, something indoors, something worth the drive — so you can pick a Saturday instead of researching one.',
  '[
    {"tip": "Church and school festivals are usually the cheapest night out all month — often free entry with cheap game tickets — and they rarely advertise beyond their own page. Ask other parents before you assume nothing is happening."},
    {"tip": "Pumpkin patches get picked over. The first two weekends of October have the real selection; by the last weekend you are choosing from what is left."},
    {"tip": "Ask about sensory-friendly or early-entry hours before you go. Some events run a quieter first hour, and it is often not on the flyer."},
    {"tip": "Check whether an outdoor event is rain-or-shine before you load the car. Trunk-or-treats move indoors or reschedule often, and the notice usually only goes out on Facebook."},
    {"tip": "At farms, closed-toe shoes beat the full costume. Hay, gravel and mud end most princess-shoe evenings early."}
  ]'::jsonb,
  DATE '2026-10-01',
  DATE '2026-11-08'   -- through the weekend after Halloween, then it comes down
)
ON CONFLICT (slug) DO UPDATE SET
  url_slug          = EXCLUDED.url_slug,
  display_name      = EXCLUDED.display_name,
  live_from         = EXCLUDED.live_from,
  live_until        = EXCLUDED.live_until;

-- ── Part 3: hub config ──────────────────────────────────────────────────────
-- is_active=false is the master switch AND the pre-migration gate: until an
-- editor flips it on 1 Oct the hub 404s regardless of whether the live_from
-- columns above exist yet.
--
-- featured_month=10 puts it in the homepage Featured Guide tile for October.
-- Nothing else claims month 10 (childcare 4, birthday 7, afterschool 8,
-- special-needs 9).

INSERT INTO guide_configs (guide_type_slug, title, subtitle, featured_month, is_active)
VALUES (
  'fall-festivities',
  'Fall Festivities & Halloween Fun Guide',
  'Farms, festivals and trunk-or-treats across the River Region — 2026 edition.',
  10,
  false
)
ON CONFLICT (guide_type_slug) DO UPDATE SET
  title          = EXCLUDED.title,
  subtitle       = EXCLUDED.subtitle,
  featured_month = EXCLUDED.featured_month;

-- Verify:
--   SELECT slug, url_slug, display_order, live_from, live_until
--     FROM guide_types WHERE slug = 'fall-festivities';
--   SELECT guide_type_slug, is_active, featured_month
--     FROM guide_configs WHERE guide_type_slug = 'fall-festivities';
--   -- to go live on 1 Oct:  UPDATE guide_configs SET is_active = true
--   --                        WHERE guide_type_slug = 'fall-festivities';

-- ── Part 4: sample listings (delete before or after the real import) ────────
-- Two rows so the guide can be proofed at ?preview=1 before Connie's ~92-row
-- import lands. They are NOT real businesses — the names say SAMPLE. Remove
-- with:
--
--   DELETE FROM guide_listings
--    WHERE guide_type_slug = 'fall-festivities'
--      AND business_name LIKE 'SAMPLE —%';
--   DELETE FROM advertiser_accounts WHERE slug LIKE 'sample-%';
--
-- Applied over REST rather than written out here, since the ids are generated.
