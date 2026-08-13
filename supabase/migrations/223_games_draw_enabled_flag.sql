-- Migration 223: Arm/disarm switch for the automated weekly Family Brain Games draw
--
-- The Monday cron shipped in 5694e3a and is already scheduled, but the drawing
-- has not actually started — there has never been a real draw, and the process
-- hasn't been rehearsed. "Not started yet" needs to be a state the system holds
-- rather than something the operator remembers, so the live draw is gated on
-- this flag and seeded OFF.
--
-- Reused site_settings (096) rather than adding a games-specific column: it's
-- the existing home for staff-flippable config, and being a DB row rather than
-- an env var means arming (and, more importantly, disarming in a hurry) does
-- not need a Vercel redeploy.
--
-- Read by isDrawArmed() in src/lib/games/draw.ts, which fails CLOSED — a
-- missing row reads as "not armed". Toggle from /admin/games.

INSERT INTO site_settings (key, value)
VALUES ('games_draw_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- Verify:
--   SELECT key, value FROM site_settings WHERE key = 'games_draw_enabled';
--   -- expect exactly one row, value 'false'
