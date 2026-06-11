-- ── Master Backlog seed — game polish + expansion (2026-06-11) ──────────────
--
-- Two items the user flagged after reviewing NYT Games:
-- (1) color/visual polish across Brain Games, (2) two more games matching
-- whatever turns out to be most popular in our analytics.
--
-- Run once in the Supabase SQL editor. Idempotent on title via
-- ON CONFLICT DO NOTHING.

INSERT INTO admin_todos (title, category, priority, notes) VALUES

('Game UI: color-up Brain Games tiles like NYT Games', 'games', 'medium',
 'NYT Games uses bold per-tile color states to drive feedback + delight: green/yellow/gray on Wordle, green halos on Tiles, salmon-on-coral on Letter Boxed. Our Brain Games are mostly monochrome neutrals.

PASS 1 — feedback colors:
  - Connections (family-connect): solid color blocks per group (NYT uses yellow/green/blue/purple). Replace our subtle category chips with full background fills on each correct group.
  - Wordle-style if/when we add one: green/yellow/gray tile fills with smooth flip animation.
  - Trivia: right-answer green pulse, wrong-answer red shake (currently both are neutral).
  - Scramble: per-letter selection color matching word-of-the-day theme.

PASS 2 — daily theming:
  - Each game gets a daily color palette pulled from the Distribution Portal token set (warm vs cool rotation).
  - Header changes color to match (NYT does this — Wordle is green, Spelling Bee yellow, Connections purple).

PASS 3 — micro-delights:
  - Confetti on first solve, single-tone toast on partial.
  - Streak counter w/ accent color.

References: nytimes.com/games shows the pattern clearly. The user surfaced this after seeing their Wordle/Tile/LetterBoxed promos.'),

('Add 2 new Brain Games scoped to what already works', 'games', 'medium',
 'User wants two more games similar to whatever turns out to be most popular in our analytics. Sequence:

STEP 1 — Identify the winners. Once /admin/analytics/content has 30+ days of data:
  - Look at /games/[gameId] page views per game over the last 30 days
  - Look at game_scores completions per game over the same window
  - Identify which 1-2 game types pull the most engagement (views) AND completion rate

STEP 2 — Pick game candidates that fit our audience (parents, often on mobile, often in small windows of time). Strong NYT-style candidates:
  - RRP Mini Crossword — 5x5 daily crossword with parenting/local clues. Mobile-friendly, daily ritual habit, very high retention. Reuses the trivia content pipeline for clue sourcing.
  - Word of the Day (Wordle-style) — 5-letter daily word, 6 guesses, green/yellow/gray feedback. Massive cultural footprint, drives daily return visits. Local twist: words pulled from a RRP-curated parenting dictionary.
  - Strands-style theme finder — find 6 related words on a 8x6 letter grid. Theme is announced. Very high NYT engagement. Could surface advertiser sponsorship: "Today''s theme: brought to you by The Childrens Place."
  - Spelling Bee Lite — 7 letters, find words 4+ letters using the center letter. Daily, accumulates streaks.

STEP 3 — Build the winners. Each new game needs:
  - Content generation (manual or AI per gamesContent admin)
  - Daily-cell scheduling in admin/games/queue (already supports new game types)
  - Score capture matching existing game_scores schema
  - Public route at /games/[gameId]
  - Tile on /games hub

NOTE: Don''t add games BEFORE the analytics signal. Two badly-chosen games dilute the queue; two well-chosen ones add real recurring traffic.'),

('Per-game analytics dashboard at /admin/games/performance', 'general', 'medium',
 'Prerequisite for the "Add 2 new games" decision above. Build a per-game leaderboard that combines page views + completion count + completion rate, all with date-range picker (reuse AdminDateRangeBar). Powers the "which games are popular" question. Joins game_scores to /games/[gameId] page_views.'),

('Game-of-the-day sponsorship slots', 'ads', 'parked',
 'Once 1-2 games consistently pull strong daily traffic (NYT Mini Crossword analog), they become natural ad real estate. "This week''s puzzles brought to you by ..." with sponsor logo + rotating message. Holds tightly to the gratitude-card framing we already decided on for school bits. Wait until games engagement is proven before building this.')

ON CONFLICT DO NOTHING;
