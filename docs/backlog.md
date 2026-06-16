# Master Backlog

Deferred build ideas with enough detail to pick up later. Each entry includes
**status**, **why deferred**, the **plan**, and a **time estimate**. Removed
when shipped (link the shipping commit / PR in the commit message).

When a new "good idea but not now" comes up, add it here rather than dropping
it into a chat. When ready to ship, copy the relevant section into a sprint
plan and reference the section number here.

---

## 1. Image source picker on social plan slots

**Status:** Deferred. Not blocking; current workflow is "VA pastes URL into the slot's image field."

**Why deferred:** Sprint 10 (AI Social Media Manager) shipped without it.
The strategist auto-pulls article hero images on article slots, which covers
~60% of cases. The remaining slots use the VA's manual graphic creation. We
explicitly decided not to bundle image generation into Sprint 10 because:
- Graphics is its own rabbit hole (brand consistency, AI quality, six-fingered hands)
- The user pays for both Canva and Magnific already — they'd want those integrated, which adds scope
- Costs needed to be sized before committing

**Design (the inspiration from GHL's planner):**

Tab-bar modal that opens when editor clicks "Replace image" on any
[social_plan_slot](../src/app/admin/social/plan/PlanGridClient.tsx) card.
Six tabs, in order of how often they'd be used:

| Tab | Behavior | Cost | Build effort |
|---|---|---|---|
| **Article hero** | Auto-pulls hero from the source article. One-click "use this." | Free | Trivial (5 min) |
| **Upload** | Drag-drop + paste URL. Stores in our existing media library. | Free | Half-day |
| **Stock** | Search → Unsplash + Pexels grid (both have free APIs). One-click insert. | Free APIs | 1 day |
| **Canva** | "Design in Canva" button → opens Canva with brand kit prefilled → paste final URL back. No API needed; deep link. | Existing Canva sub | Half-day |
| **AI generate** | Prompt textarea + style picker (Photo / Illustration / Watercolor / etc) → calls OpenAI gpt-image-1 → 1-4 variations → editor picks one. | ~$0.04/image medium quality | 1 day |
| **Magnific polish** | If editor has already picked an image, "Send to Magnific to polish" → opens Magnific in new tab with image pre-loaded → paste enhanced URL back. | Existing Magnific sub | Half-day |

**Workflow integration:**

- Empty slot → image area shows `+ Add image` → opens modal
- Slot with image → shows + a small "Replace" overlay → opens modal preselected to current source
- Modal saves the chosen URL back to `social_plan_slot.image_url`

**Strategist gets smarter too:** The weekly planner's Claude prompt could
output an `image_strategy` field per slot:
- Articles → `"article_hero"` (default)
- Events → `"article_hero"` if event has one, else `"stock"` with search hint
- Quotes → `"ai_generate"` with a suggested prompt
- School bits → `"article_hero"`
- Spotlights → `"existing"` (the spotlight has an image_url already)

That way the strategist *proposes* a sensible image source per slot type;
editor overrides per slot.

**Build order when picked up:**

1. **Phase 1 (4 hours):** Article hero auto-pull + Upload + Stock (Unsplash). Free + handles 80% of cases.
2. **Phase 2 (1 day):** AI generate via gpt-image-1. The piece that lets the strategist run truly autonomously.
3. **Phase 3 (half day):** Canva + Magnific deep-link tabs. No API, just "Open in Canva pre-filled with brand kit" + "Open in Magnific with this image."

**Total:** ~2-2.5 days. Operating cost at scale ($30/mo for gpt-image-1 at
~720 graphics/month across 6 brands).

**Open decision when picked up:** Default AI-generate style to "Photo" (most
universally usable, matches current Canva aesthetic) OR let editors set a
brand-default style in the brand profile so each brand has its own look.
Recommend brand-default — costs nothing, matches the multi-brand voice
philosophy we already use for captions.

**Relevant code references:**
- [src/app/admin/social/plan/PlanGridClient.tsx](../src/app/admin/social/plan/PlanGridClient.tsx) — where the picker would mount per slot
- [src/lib/social-strategist/planner.ts](../src/lib/social-strategist/planner.ts) — where `image_strategy` would be added to Claude's output schema
- [src/lib/ai/client.ts](../src/lib/ai/client.ts) — `runAI()` wrapper; needs an OpenAI image branch added
- Migration 200 (social_plan_slot table) already has `image_url` — no schema change needed

---
