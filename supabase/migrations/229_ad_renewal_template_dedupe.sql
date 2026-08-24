-- Migration 229: One renewal template per offset, enforced
--
-- The seed ran twice on 2026-06-06 (12:13:55 and 12:21:30), leaving ten
-- templates where five were intended — an exact duplicate of each of the 30d,
-- 14d, 7d, 1d and day-after emails, same subject, same body, same settings.
--
-- Nothing had gone out, because all ten ship is_live=false and the copy is
-- still to be written. But the failure mode once they ARE turned on is nasty
-- and quiet: the cron picks its template with
--   templates.find(t => t.days_before === offset)
-- which takes whichever row Postgres happens to return first. With two live
-- rows at the same offset, the copy an advertiser receives is arbitrary — and
-- an editor who rewrote one of the pair would have no way to tell which one
-- actually sent. Ten identically-named rows in /admin/ads/renewals also makes
-- it very easy to mark both live by accident.
--
-- The duplicates are already deleted in production. This makes a rebuilt
-- database match, and the unique index means a third seed run can't do it
-- again.

-- Keep the earliest row per offset; drop the rest.
DELETE FROM ad_renewal_templates a
USING ad_renewal_templates b
WHERE a.days_before = b.days_before
  AND a.created_at  > b.created_at;

-- The cron supports exactly one template per offset. Encode that.
CREATE UNIQUE INDEX IF NOT EXISTS ad_renewal_templates_days_before_key
  ON ad_renewal_templates (days_before);

-- Verify:
--   SELECT days_before, COUNT(*) FROM ad_renewal_templates GROUP BY 1 ORDER BY 1;
--   -- expect exactly one row per offset: -1, 1, 7, 14, 30
