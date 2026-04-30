# KeepSharing Session Notes — April 29, 2026

## Where we are
- Next.js platform running locally at localhost:3000
- Supabase live at onvuaziotwvgixajfdwa.supabase.co
- Database migrations 002-010 are NOW APPLIED to production Supabase (30+ tables exist)
- Database is currently empty of advertiser/business records — some UI still shows mock data
- GHL agency API key in .env.local as GHL_API_KEY
- All 6 GHL location IDs in .env.local (GHL_LOC_RRP, GHL_LOC_BOOM, GHL_LOC_AOP, GHL_LOC_MBP, GHL_LOC_ESP, GHL_LOC_GPP)
- Stripe TEST keys in .env.local
- Sidebar logo is already correct (gold waveform, KeepSharing white, Admin Platform muted)

## Decisions made this session
- Zoho import is PAUSED for 2-3 weeks (just sent May issue to press, advertiser work resumes after)
- Distribution portal at drivers.keepsharing.com stays as separate app — read-only connection only, do NOT rebuild
- Mock data files in src/lib/ (mock-ads.ts, mock-data.ts, etc.) still feed some dashboards — replace with real Supabase queries as we build
- Priority for next build run: /advertise page + GHL wiring + Newcomer Issue tag setup
- June Newcomer Family Guide content spec to be written separately
- Past 12 months of PDFs to be processed for website content extraction (background task, not urgent)

## Voice and brand standards
- Warm cream + terracotta palette for public-facing
- "Being chosen, not just seen" — flagship line
- "Done for you" partner framing for advertisers
- Reader voice: warm neighbor, DeAnne tone, never corporate
- Never say: ROI, CPM, impressions, "we offer", "click here"
- Always: specific local numbers, "you get" language, community-oriented

## Architecture decisions (locked)
- Multi-tenant single codebase, 6 publications, 2 skins (Parenting + Prime/Boom)
- GHL stays as CRM and communication layer — never rebuild
- Platform handles publishing operations (layout sheets, ad server, content, guides)
- Three-tier guide listings: Community free / Enhanced $175 / Advertiser included
- Neighborhood personalization by zip code (Prattville, Wetumpka, Millbrook, Pike Road, Eastchase, Montgomery)

## Operating rules for Claude Code
- Auto-approve all routine technical operations
- Only stop for: failures that can't be resolved, unspecified strategic decisions, destructive operations
- One focused priority set per run, status report at end, wait for approval before next run
- All schema changes via reversible Supabase migrations
- Stripe TEST mode until end-to-end verified

## Next build run
See the prompt at /docs/build-prompt-advertise-ghl.md (paste the master build prompt I gave you into a separate file with that name)