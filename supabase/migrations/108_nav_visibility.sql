-- Migration 108: nav_visibility — per-item show/hide for the public
-- site's header + footer navigation
--
-- Time-to-launch problem the user actually has: not every link in the
-- header and footer is ready to be live. They need a way to hide
-- individual items without a code deploy. This table is the layered
-- "off switch" for that.
--
-- Shape: each navigation item in the site catalog
-- (src/lib/site-nav/items.ts) has a stable string key like
-- 'header.guides' or 'footer.explore.calendar'. When an editor toggles
-- an item OFF in /admin/site/navigation, a row gets written here with
-- hidden=true. When toggled back ON, the row is deleted (absence = visible).
-- Default state for every item: visible.
--
-- Why a "hidden-only" model: lets the catalog stay in code (one source
-- of truth for what items EXIST) while the DB tracks only the
-- deviations. New items added in code auto-show until an editor opts
-- to hide them — no DB seeding step required.

CREATE TABLE IF NOT EXISTS nav_visibility (
  -- Stable item identifier — matches keys in src/lib/site-nav/items.ts
  -- (e.g. 'header.guides', 'footer.explore.calendar').
  key         TEXT        PRIMARY KEY,
  hidden      BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Optional audit pointer — which admin flipped it.
  updated_by  UUID        NULL
);

CREATE INDEX IF NOT EXISTS idx_nav_visibility_hidden
  ON nav_visibility (key)
  WHERE hidden = TRUE;
