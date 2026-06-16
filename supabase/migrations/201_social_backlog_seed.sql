-- 201_social_backlog_seed.sql
--
-- Seeds the master backlog (admin_todos, migration 121) with the Sprint 10
-- follow-up items we deferred during the AI Social Media Manager build.
-- Idempotent: re-running won't duplicate rows (matches by title).

INSERT INTO admin_todos (title, category, priority, notes, display_order)
SELECT * FROM (VALUES
  (
    'Image source picker on social plan slots',
    'social',
    'medium',
    $$Tab-bar modal that opens when editor clicks "Replace image" on a social_plan_slot card. Six tabs in order of expected use:

  1. Article hero — auto-pulls hero from source article (article slots default to this). Trivial.
  2. Upload — drag-drop + paste URL, stores in media library. Half-day.
  3. Stock — Unsplash + Pexels grid (free APIs). 1 day.
  4. Canva — "Design in Canva" deep link with brand kit prefilled, paste URL back. Half-day.
  5. AI generate — OpenAI gpt-image-1, prompt + style picker, 1-4 variations. 1 day. (~$0.04/image)
  6. Magnific polish — deep link to send existing image for upscale, paste URL back. Half-day.

Strategist could also emit an "image_strategy" per slot: articles→article_hero, events→article_hero else stock, quotes→ai_generate, spotlights→existing.

Build order: Phase 1 (article hero + upload + stock) = 4 hrs. Phase 2 (AI generate) = 1 day. Phase 3 (Canva + Magnific) = half day. Total 2-2.5 days. Operating cost ~$30/mo at ~720 graphics/month.

Open decision when picked up: default AI-generate style to "Photo" or let editors set a brand-default in the brand profile (recommend brand-default — matches multi-brand voice philosophy).

Files when picked up: src/app/admin/social/plan/PlanGridClient.tsx (mount picker), src/lib/social-strategist/planner.ts (add image_strategy to Claude output), src/lib/ai/client.ts (add OpenAI image branch). Migration 200 social_plan_slot.image_url already exists — no schema change.$$,
    100
  ),
  (
    'IG insights pull in /api/cron/social-insights',
    'social',
    'medium',
    $$Sprint 10 Phase 4 stubbed Instagram insights — only Facebook Page Insights flow into social_performance today. To wire IG:

  - Resolve IG media id from GHL's post id or by querying the IG Business account's /media list keyed by timestamp + caption snippet (same pattern we use for FB post resolution).
  - Pull metrics via /ig-media-id/insights?metric=impressions,reach,engagement,saved.
  - Upsert into social_performance with platform='instagram'.

Until this lands, the strategist's auto-bias loop reads FB performance only. ~2 hrs work, lives in src/lib/social-strategist/insights.ts.$$,
    110
  ),
  (
    'Cross-brand learning in strategist scoring',
    'social',
    'low',
    $$social_performance.brand_slug is tracked but loadPerformanceSummary in src/lib/social-strategist/planner.ts only queries the current brand's history when scoring. Generalize to blend sibling-brand signal (e.g. when scoring for RRP, 70% weight to RRP own data + 30% weight to AOP/MBP/ESP/GPP averages).

Useful when one brand has thin performance data — it inherits learning from siblings. ~30-line change. Open question: what weight mix is right? Start with 70/30, surface in performance dashboard.$$,
    120
  ),
  (
    'Smart gap-finding for urgent post AI-pick mode',
    'social',
    'low',
    $$/admin/social/plan/urgent "AI you pick" mode currently returns next top-of-hour 60 min out. It doesn't inspect the existing plan grid to find the genuinely best gap.

Upgrade: look at the next 7 days of social_plan_slot rows, find the longest gap between scheduled posts that falls in a peak engagement window for that brand (use social_performance day×slot data), schedule the urgent post there. ~3 hrs work. Lives in src/app/api/admin/social/plan/urgent/route.ts pickScheduledFor().$$,
    130
  ),
  (
    'Retire /api/cron/social-dispatch + social_queue table',
    'social',
    'low',
    $$Sprint 10/4 deprecated the legacy social_dispatch cron (it no-ops now) and dropped its schedule from vercel.json. After ~30 days of clean operation on the GHL pipe:

  - Delete src/app/api/cron/social-dispatch/route.ts
  - Drop the social_queue, social_post_outputs, social_schedules tables (preserve a snapshot first)
  - Clean up src/lib/social/queue.ts and the source-adapters that were queue-specific

No urgency — it's just cleanup. The legacy tables don't cost anything sitting there. Worth doing once we're confident the GHL pipe handles 100% of social.$$,
    140
  )
) AS new_todos(title, category, priority, notes, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM admin_todos WHERE admin_todos.title = new_todos.title
);
