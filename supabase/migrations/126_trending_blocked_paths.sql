-- ── Trending bar — manual blocklist for auto-trending paths ────────────────
--
-- The homepage trending bar pins editorial items (trending_items table)
-- and fills any remaining slots from trending_paths_7d (top-viewed pages
-- in the last 7 days). Sometimes an auto-filled path is one the editor
-- doesn't want surfaced: an old advertiser that's been turned off, a
-- one-off campaign page, a thank-you page that slipped past
-- NON_CONTENT_PREFIX, etc.
--
-- This table is the editor's veto: any path listed here gets excluded
-- from the auto-trending pool on the homepage and is shown on the admin
-- /admin/trending screen with an Unblock button so it can be un-vetoed
-- later.

CREATE TABLE IF NOT EXISTS trending_blocked_paths (
  path        TEXT PRIMARY KEY,
  -- Snapshot of the label this path was showing when it got blocked.
  -- Purely for the admin UI so the editor can recognize "what was this?"
  -- without having to visit the path.
  label       TEXT,
  blocked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Service role bypasses RLS, so no policy needed for admin writes.
-- The homepage read happens via the anon key — allow public SELECT
-- so the exclude-set query works without bumping to service role.
ALTER TABLE trending_blocked_paths ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trending_blocked_paths_public_read ON trending_blocked_paths;
CREATE POLICY trending_blocked_paths_public_read
  ON trending_blocked_paths
  FOR SELECT
  USING (TRUE);
