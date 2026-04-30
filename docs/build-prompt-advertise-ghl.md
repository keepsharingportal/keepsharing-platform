KEEPSHARING PLATFORM — FOCUSED BUILD: /advertise + GHL + Newcomer Issue prep

OPERATING RULES FOR THIS SESSION
For this entire session: auto-approve all file edits, terminal commands, npm installs, and migrations. Do not ask permission for routine technical operations. Only stop and ask me when (1) something fails and you cannot resolve it, (2) you need a strategic decision not specified below, or (3) an operation would delete production data or charge money. Otherwise — keep building.

Before writing any code, read these files in /docs (or project root) for full context:
- keepsharing-knowledge-base.md (business model, voice, strategy)
- session-notes-2026-04-29.md (current state, recent decisions)
- supabase/migrations/ (existing schema)
- src/lib/ghl.ts (GHL service if it exists)

CURRENT STATE (verified)
- Next.js App Router project at /src/app
- Supabase live, all migrations 002-010 applied (30+ tables exist)
- 6 publications seeded (RRP, BOOM, AOP, MBP, ESP, GPP)
- Database currently empty of advertiser/business records (mock data still rendering some UI)
- GHL agency API key in .env.local as GHL_API_KEY
- All 6 location IDs in .env.local: GHL_LOC_RRP, GHL_LOC_BOOM, GHL_LOC_AOP, GHL_LOC_MBP, GHL_LOC_ESP, GHL_LOC_GPP
- Stripe TEST keys in .env.local
- Sidebar logo already correct (gold waveform, KeepSharing white, Admin Platform muted)

If any of the above is wrong, STOP and tell me before proceeding.

BUILD ORDER

═══════════════════════════════════════════════
TASK 1 — GHL Service Module (src/lib/ghl.ts)
═══════════════════════════════════════════════

Create a TypeScript module that wraps GHL API v2 with these functions:

upsertContact({ publicationSlug, email, phone, firstName, lastName, businessName, tags, customFields })
addTag(publicationSlug, contactId, tag)
removeTag(publicationSlug, contactId, tag)
triggerWorkflow({ publicationSlug, contactId, workflowId })
getContactByEmail(publicationSlug, email)

Internal map publicationSlug → location ID env var:
  rrp → GHL_LOC_RRP
  boom → GHL_LOC_BOOM
  aop → GHL_LOC_AOP
  mbp → GHL_LOC_MBP
  esp → GHL_LOC_ESP
  gpp → GHL_LOC_GPP

Failure handling: log to integration_log table (create migration if it doesn't exist) with {event_type, publication_slug, payload, error_message, retry_count, created_at}. Never throw — return {success: false, error} so calling code doesn't crash.

Workflow IDs are TODO. For any triggerWorkflow call where the workflow ID is not yet provided, log the intended trigger to integration_log with status='pending_workflow_id' and continue.

DONE WHEN
[ ] ghl.ts compiles, types check
[ ] Test endpoint at /api/test/ghl-ping that calls upsertContact with a fake email and returns success — verified by checking the contact appears in GHL UI
[ ] integration_log table exists with RLS policy (Super Admin read all)
[ ] A deliberately failed call (bad email format) logs to integration_log without crashing

═══════════════════════════════════════════════
TASK 2 — /advertise public page (visual spot picker)
═══════════════════════════════════════════════

Page: /advertise (public, no auth required)
Match the warm cream + terracotta voice from the existing GHL landing page text. Keep the value-prop hero that's already on this page if present — add the spot picker BELOW it.

Scope this run: River Region Parents publication only. Other 5 publications come later via a publication switcher.

VISUAL MAGAZINE LAYOUT
Render an 8.5×11 vertical SVG of a magazine page with positioned ad zones:
- Full Page (full bleed)
- Half Page Horizontal (top half)
- Half Page Vertical (right half)
- Quarter Page (4 quadrants)
- Sixth Page (6 zones)

Zone state colors:
- Green (#22c55e): available — show price for currently-selected term
- Gray (#9ca3af): taken — show business name on hover
- Yellow (#eab308): pending booking, not bookable

Source of truth: query bookings table where publication_id = RRP AND month overlaps any selected month AND status IN ('confirmed','pending'). If bookings table doesn't exist, create migration with columns:
id uuid pk, publication_id uuid fk, advertiser_email text, business_name text, ad_size text, ad_position text, months text[] (array of YYYY-MM), term_length int, monthly_rate numeric, total numeric, design_help boolean, graphic_url text, stripe_session_id text, status text default 'pending', ghl_contact_id text, created_at timestamptz default now()

WEB ZONES (below print mock)
Simplified site mockup showing: Header Leaderboard 728x90, Article Inline Top 600x300, Article Inline Mid 600x300, Article Inline Bottom 600x150, Guide Sidebar 300x250, Email Banner 600x200. Same color states.

BOOKING SIDE PANEL (slides in on click)
Step 1 — Month selector: checkbox grid for next 18 months. VALIDATE consecutive-only. Error: "Months must be consecutive — no gaps."
Step 2 — Rate auto-calculates per term bracket using EXACT rate card:
  Full: $937/1mo, $863/3mo, $797/6mo, $747/12mo, $697/18mo
  Half: $637/1mo, $573/3mo, $537/6mo, $497/12mo, $447/18mo
  Quarter: $453/1mo, $407/3mo, $377/6mo, $337/12mo, $297/18mo
  Sixth: $327/1mo, $297/3mo, $263/6mo, $223/12mo, $197/18mo
Bracket logic: total months = 1 → 1mo rate; 2-3 → 3mo rate; 4-6 → 6mo rate; 7-12 → 12mo rate; 13-18 → 18mo rate.
Step 3 — Business info form: business name, contact first/last name, email, phone, website (optional)
Step 4 — Graphic: upload PDF/PNG/JPG max 25MB OR check "I need design help (+$150)"
Step 5 — Order summary + "Continue to Payment" button

STRIPE CHECKOUT
Use TEST keys. Create checkout session with line items per booking. Success URL: /advertise/success?session_id={CHECKOUT_SESSION_ID}. Cancel URL: /advertise

WEBHOOK at /api/webhooks/stripe
Listen for checkout.session.completed:
1. Update booking row → status='confirmed', stripe_session_id set
2. Call ghl.upsertContact with business name + email + tag `pub:rrp` and `tier:[size]-advertiser`
3. Call ghl.triggerWorkflow with workflowId='wf_new_advertiser_welcome' (will log pending until ID provided)
4. Insert notification row for VA2 in notifications table: type='new_advertiser', publication_id=RRP, payload={business_name, total, months}
5. Return 200

VOICE NOTES (match the brand)
Hero copy if not already there: "Get More Local Families Choosing Your Business" / "If You're Not Reaching Moms... You're Losing Business" / "Most businesses don't struggle because they're not good. They struggle because they're not seen — or not remembered."
Button text: "Reserve This Spot" not "Buy Now" — "Continue to Secure Booking" not "Pay"
After-purchase: "You're in. Welcome to River Region Parents." (warm, not corporate)

DONE WHEN
[ ] /advertise renders with spot picker and rate calculator
[ ] Selecting non-consecutive months shows validation error
[ ] Rate auto-updates as months are selected
[ ] Stripe TEST checkout completes successfully with test card 4242 4242 4242 4242
[ ] On success: bookings row created with status='confirmed', GHL contact appears (verified in GHL UI), notification appears in /admin/today
[ ] Design-help checkbox adds $150 to total

═══════════════════════════════════════════════
TASK 3 — Newcomer Issue tag setup
═══════════════════════════════════════════════

In the bookings flow, if any selected month is '2026-06', auto-append tag 'newcomer-issue-2026' to the GHL contact when upserting. This sets up the segment for Facebook ad campaigns and follow-up sequences.

Add a simple admin view at /admin/advertisers/segments showing tag-based counts:
- Newcomer Issue 2026 advertisers (count + list)
- Active by tier (T1/T2/T3 counts)
- Expiring 30/60/90 days (counts only — list comes later)

DONE WHEN
[ ] A test booking with June 2026 selected creates a GHL contact with tag 'newcomer-issue-2026'
[ ] /admin/advertisers/segments displays counts correctly

═══════════════════════════════════════════════
FINAL VERIFICATION REPORT
═══════════════════════════════════════════════

After all three tasks are complete, post a STATUS REPORT including:
- Migrations added (filenames)
- New routes added (public + admin)
- Env vars consumed
- Outstanding TODOs (workflow IDs, etc.)
- Test instructions for Jason to verify each DONE WHEN item

Then STOP. Do not deploy. Do not switch Stripe to live.