-- 233_guide_market_copy_and_grown_up_time.sql ────────────────────────────────
--
-- Three additive, reversible changes to the guide system.
--
-- ── 1. Per-market editorial copy ────────────────────────────────────────────
-- guide_types is the GLOBAL catalog of guide kinds and has no market column.
-- Its editorial fields — hub_intro_paragraph, pitch, editorial_intro,
-- insider_tips, short_description — were written for River Region and name
-- Montgomery, the River Region and its towns 58 times across the ten rows.
-- One deployment serves six brand domains, so every one of those strings
-- would appear on Greater Pensacola's guide pages.
--
-- This adds guide_type_copy, keyed (market, guide_type_slug), and seeds:
--   * market = 'rrp' — the existing text, verbatim, so River Region's pages
--     render exactly as they do today
--   * market = '*'   — a neutral, non-geographic default for every other
--     brand, so a brand with no copy of its own still reads sensibly
--
-- The resolver (src/lib/guides/market-copy.ts) reads the current market,
-- then '*', and never the legacy guide_types columns. Those columns stay for
-- the admin editor and for rollback; nothing public reads them any more.
--
-- ── 2. The grown-up-time guide type ─────────────────────────────────────────
-- Adult activities. Display name "Grown-Up Time" is provisional pending the
-- publisher's confirmation; the slug is the stable identifier so renaming is
-- a one-row UPDATE.
--
-- ── 3. category_order ───────────────────────────────────────────────────────
-- guide_configs.category_order has existed since migration 065 and nothing
-- ever read it. Seeds Greater Pensacola's section order for five guides.
-- River Region's rows are left NULL, which the code treats as "no explicit
-- order" and sorts as before — so River Region's behaviour cannot change.
--
-- Rollback: see the commented block at the foot of this file.

BEGIN;

-- ── 1. Per-market guide copy ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.guide_type_copy (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- A brand slug, or '*' for the neutral default used by any brand without
  -- its own row. Not a FK: '*' is not a brand, and markets live in code.
  market              text NOT NULL,
  guide_type_slug     text NOT NULL,
  display_name        text,
  short_description   text,
  hub_intro_paragraph text,
  pitch               text,
  editorial_intro     text,
  insider_tips        jsonb,
  hero_image_url      text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guide_type_copy_market_slug_key UNIQUE (market, guide_type_slug)
);

COMMENT ON TABLE public.guide_type_copy IS
  'Per-market editorial copy for a guide type. market = ''*'' holds the '
  'neutral non-geographic default. Resolution order is current market, then '
  '''*'', then nothing — never another market''s text.';

COMMENT ON COLUMN public.guide_type_copy.market IS
  'Brand slug, or ''*'' for the shared neutral default.';

CREATE INDEX IF NOT EXISTS guide_type_copy_lookup_idx
  ON public.guide_type_copy (guide_type_slug, market);

DROP TRIGGER IF EXISTS guide_type_copy_updated_at ON public.guide_type_copy;
CREATE TRIGGER guide_type_copy_updated_at
  BEFORE UPDATE ON public.guide_type_copy
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- River Region keeps exactly what it has today. Copied from guide_types so
-- the live site is byte-identical after this migration.
INSERT INTO public.guide_type_copy (
  market, guide_type_slug, display_name, short_description,
  hub_intro_paragraph, pitch, editorial_intro, insider_tips, hero_image_url
)
SELECT
  'rrp', t.slug, t.display_name, t.short_description,
  t.hub_intro_paragraph, t.pitch, t.editorial_intro, t.insider_tips, t.hero_image_url
FROM public.guide_types t
ON CONFLICT (market, guide_type_slug) DO NOTHING;

-- The neutral default: same promise as River Region's copy, no geography.
-- Deliberately omits editorial_intro and insider_tips — those are reported,
-- place-specific pieces, and inventing generic ones would put words in a
-- publisher's mouth. A brand that wants them writes its own row.
INSERT INTO public.guide_type_copy
  (market, guide_type_slug, short_description, hub_intro_paragraph, pitch)
VALUES
  ('*', 'newcomer',
   'For families new to the area',
   'Everything a family new to the area needs to feel at home faster. Schools, doctors, neighborhoods, and the local rhythms only insiders know.',
   'Everything a family new to the area needs to feel at home faster — schools, doctors, neighborhoods, and the local rhythms only insiders know.'),
  ('*', 'private-school',
   'Private and parochial schools serving K-12',
   'A complete picture of local private school options. Tuition, mission, leadership, and what makes each campus distinct.',
   'A complete picture of local private school options — tuition, mission, leadership, and what makes each campus distinct.'),
  ('*', 'summer-camp',
   'Day camps, overnight camps, and summer programs',
   'Day camps, overnight camps and specialty programs, compared side by side — ages, dates, cost, and what each one is actually good at.',
   'Day camps, overnight camps and specialty programs compared side by side — ages, dates, cost, and what each one is actually good at.'),
  ('*', 'childcare',
   'Childcare centers, preschools, in-home care',
   'Finding childcare you trust takes time. Compare side by side — hours, ratios, philosophies, and what each center does best.',
   'Finding childcare you trust takes time and good information. Compare hours, ratios, philosophies, meals, and what each center actually does best.'),
  ('*', 'healthy-kids',
   'Pediatricians, dentists, therapists, and specialists',
   'Building your child''s care team, from the first pediatrician to the specialist you hope never to need.',
   'Building your child''s care team — from the first pediatrician to the specialist you hope never to need.'),
  ('*', 'summer-fun',
   'Everything to do with kids all summer long',
   'Splash pads, day trips, free afternoons and rainy-day backups — a summer''s worth of plans in one place.',
   'Splash pads, day trips, free afternoons and rainy-day backups — a summer''s worth of plans in one place.'),
  ('*', 'birthday-party',
   'Venues, entertainers, cakes, and party supplies',
   'Venues, entertainers, cakes and rentals — everything a birthday needs, with real prices and what each option suits.',
   'Venues, entertainers, cakes and rentals — everything a birthday needs, with real prices and what each option suits.'),
  ('*', 'afterschool',
   'After-school care, classes, lessons, and teams',
   'After-school care, classes, lessons and teams — what is on offer, for which ages, and when.',
   'After-school care, classes, lessons and teams — what is on offer, for which ages, and when.'),
  ('*', 'special-needs',
   'Therapy, education, recreation, and family resources',
   'Therapy, education, recreation and family support, organized so you can find the right door on the first try.',
   'Therapy, education, recreation and family support — organized so you can find the right door on the first try.'),
  ('*', 'fall-festivities',
   'Pumpkin patches, festivals, and Halloween events',
   'Pumpkin patches, corn mazes, trunk-or-treats and fall festivals, with dates and what each one costs.',
   'Pumpkin patches, corn mazes, trunk-or-treats and fall festivals — with dates and what each one costs.')
ON CONFLICT (market, guide_type_slug) DO NOTHING;

-- ── 2. grown-up-time guide type ─────────────────────────────────────────────
-- Adult activities: classes, clubs and recreation for grown-ups.
INSERT INTO public.guide_types
  (slug, url_slug, display_name, short_description, hub_intro_paragraph,
   primary_filter_field, publishes_annually, display_order)
VALUES
  ('grown-up-time', 'grown-up-time-guide', 'Grown-Up Time',
   'Classes, clubs, and recreation for adults',
   'Classes, clubs and recreation for grown-ups — somewhere to use the hours when the kids are occupied.',
   'category', true, 11)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.guide_type_copy
  (market, guide_type_slug, short_description, hub_intro_paragraph, pitch)
VALUES
  ('*', 'grown-up-time',
   'Classes, clubs, and recreation for adults',
   'Classes, clubs and recreation for grown-ups — somewhere to use the hours when the kids are occupied.',
   'Classes, clubs and recreation for grown-ups — somewhere to use the hours when the kids are occupied.')
ON CONFLICT (market, guide_type_slug) DO NOTHING;

-- Inactive on Greater Pensacola until the publisher launches it. Listings
-- are imported separately.
INSERT INTO public.guide_configs (market, guide_type_slug, title, subtitle, is_active)
VALUES ('gpp', 'grown-up-time', 'Grown-Up Time',
        'Classes, clubs, and recreation for adults', false)
ON CONFLICT (market, guide_type_slug) DO NOTHING;

-- ── 3. Greater Pensacola section order ──────────────────────────────────────
-- Plain strings are categories. An object is a GROUP whose `children` are
-- the categories beneath it.
--
-- Greater Pensacola stores its Special Needs children group-prefixed, as
-- 'Specific Resources - ADD/ADHD', so each child is listed with the exact
-- stored value. The resolver also accepts a bare child name, which is what
-- a hand-written config is likely to contain.
UPDATE public.guide_configs SET category_order = '[
  "After School Care", "Art", "Dance", "Equestrian", "Gymnastics / Cheer",
  "Martial Arts", "Music", "Scouting", "Sports", "STEM", "Theater"
]'::jsonb WHERE market = 'gpp' AND guide_type_slug = 'afterschool';

UPDATE public.guide_configs SET category_order = '[
  "Cakes & Treats", "Entertainment to You", "Places to Party",
  "Rental Entertainment / Party Supplies"
]'::jsonb WHERE market = 'gpp' AND guide_type_slug = 'birthday-party';

UPDATE public.guide_configs SET category_order = '[
  "Dentists", "Education Resources", "Financial Resources",
  "General Resources", "Recreation & Social",
  { "group": "Specific Resources", "children": [
      "Specific Resources - ADD/ADHD",
      "Specific Resources - Autism Spectrum",
      "Specific Resources - Cerebral Palsy",
      "Specific Resources - Cystic Fibrosis",
      "Specific Resources - Down Syndrome",
      "Specific Resources - Dyslexia",
      "Specific Resources - Epilepsy",
      "Specific Resources - Muscular Dystrophy",
      "Specific Resources - Spina Bifida",
      "Specific Resources - Vision Impaired"
  ]},
  "Therapy", "Websites and Publications"
]'::jsonb WHERE market = 'gpp' AND guide_type_slug = 'special-needs';

-- By town for Greater Pensacola. River Region groups by affiliation and
-- keeps category_order NULL, so its page is untouched.
UPDATE public.guide_configs SET category_order = '[
  "Pensacola", "Cantonment", "Gulf Breeze", "Jay", "Milton", "Pace"
]'::jsonb WHERE market = 'gpp' AND guide_type_slug = 'private-school';

UPDATE public.guide_configs SET category_order = '[
  "Art Classes", "Book Clubs", "Dance Classes", "Fiber Arts", "Golf",
  "Mahjong & Bridge", "Music & Theater", "Pickleball", "Tennis",
  "More Sports…", "Even More…"
]'::jsonb WHERE market = 'gpp' AND guide_type_slug = 'grown-up-time';

-- Every Greater Pensacola guide stays closed until the publisher opens it.
UPDATE public.guide_configs SET is_active = false WHERE market = 'gpp';

COMMIT;

-- ── Rollback ────────────────────────────────────────────────────────────────
-- BEGIN;
--   UPDATE public.guide_configs SET category_order = NULL WHERE market = 'gpp';
--   DELETE FROM public.guide_configs WHERE market = 'gpp' AND guide_type_slug = 'grown-up-time';
--   DELETE FROM public.guide_types   WHERE slug = 'grown-up-time';
--   DROP TABLE IF EXISTS public.guide_type_copy;
-- COMMIT;
