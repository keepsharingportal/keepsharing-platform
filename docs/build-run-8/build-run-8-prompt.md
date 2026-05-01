# BUILD RUN #8 — EPIC: The Funnel Template Library + Cold Lead Magnet + Speed-to-Lead Polish + Customer Acquisition System Graphic

## Purpose

Build Run #7 shipped the Partner Engine architecture. The components work, the database schema is solid, the speed-to-lead infrastructure exists. But the visual output of the partner page — the actual landing page Jason would send to a $1,500/month prospect — looked like a generic Squarespace template. Not a $1,500/month deliverable.

The fix: port Jason's proven AI Studio funnel templates (already built and tested in HighLevel) into the platform as React components. Each template is a complete, magazine-quality, conversion-optimized page on its own — populated by config data from the database. Partners pick the template that matches their offer type during onboarding.

This build also ships the cold-traffic lead magnet at `/get-media-kit`, fully wires the speed-to-lead handoff (which was specced in #7 but not end-to-end tested), updates `/advertise` with the new tagline and customer acquisition system graphic, and makes the onboarding form template-aware.

When this build finishes, Jason has a sellable product. The Dentistry for Children demo will look like the AI Studio version (which Jason called "what someone would proudly pay $1,500/month for"). The cold-traffic funnel will be live for next week's Facebook ads. The customer acquisition system will be visible and explainable on `/advertise`.

## Scope is intentionally tight

This build does NOT include: Mom Insiders submission engine, Operations Dashboard live data wiring, proposal generator, partner backend dashboard, multi-tenant audit for Boom launch, more than 3 templates. Those become Build Run #9 and #10.

This build DOES include: 3 React funnel templates (Consult Booking, Giveaway, Lead Magnet) ported from Jason's AI Studio designs, the `/get-media-kit` cold-traffic gated funnel, full speed-to-lead handoff testing and fixes, the customer acquisition system graphic on `/advertise`, the new tagline, template-first onboarding form, 5 pre-designed color schemes, and replacement of `/partners/dentistry-for-children` with the Consult Booking template.

Realistic Claude Code session: 3-4 hours. OneDrive paused before starting.

═══════════════════════════════════════════════════════
## STRATEGIC PRINCIPLES — DRIVE EVERY DECISION
═══════════════════════════════════════════════════════

- **"We Help Your Future Customers Find You."** This is the new tagline. Use it on `/advertise` as the H1 update.
- **The product is the customer acquisition system, not a landing page.** Magazine ad → Social ad → Website rotator → Featured listing → Offer page → Form submit → SMS to lead → Email to partner → Nurture sequence → Customer walks in. All RRP-branded, all owned by Jason. The partner just runs their business.
- **Templates are the visible product.** Each template must look like a partner would proudly pay $1,500/month for it. Reference quality bar: Jason's AI Studio designs (provided in this prompt). NOT the existing Build Run #7 partner page (which sprawled across too many sections and looked templated).
- **5 pre-designed color schemes guarantee quality.** Partners pick one; never get to enter raw hex values. Each scheme professionally designed.
- **Two doors for two lead states.** `/get-media-kit` is gated for cold traffic. `/advertise` is open for warm traffic (people Jason texted the URL to, or Facebook lead-form ads where email was already captured upstream).
- **Speed-to-lead is THE differentiator.** SMS to lead within 60 seconds of form submission. Email handoff to partner with full lead details. Nurture sequence enrollment. Tested end-to-end with real submissions.
- **The KeepSharing Partner Engine** is the formal product brand. Tagline: "Built by River Region Parents. Powered by KeepSharing."

═══════════════════════════════════════════════════════
## OPERATING RULES
═══════════════════════════════════════════════════════

Auto-approve all file edits, terminal commands, npm installs, package additions, migrations applied via SQL editor instructions, image fetches, content writing, and GHL API calls. Stop only on:
1. Unresolvable build/runtime errors after 3 attempts
2. Strategic decisions not specified in this prompt
3. Destructive operations (dropping tables, deleting production data)
4. Anything requiring credentials not in `.env.local`

Required reading before starting:
- `/docs/keepsharing-knowledge-base.md`
- `/docs/build-run-7/` (whatever was generated as part of the previous build's docs)
- `/src/app/globals.css` (existing design tokens — fg-cream, fg-navy, fg-sky, fg-sage, fg-terra, fg-gold, fg-blush)
- `/src/app/advertise/page.tsx` (existing media kit)
- `/src/app/partners/[slug]/page.tsx` (existing offer page — to be REPLACED with template-driven version)
- `/src/components/partner-engine/` (the components from Build Run #7 — most will be replaced or repurposed)
- `/src/lib/sms-handoff.ts` (Build Run #7 created this — needs verification and possible fixes)
- `/src/lib/partner-notification.ts` (Build Run #7 created this)
- `/src/lib/nurture-sequence.ts` (Build Run #7 created this)
- `/src/lib/ghl.ts` (existing GHL integration)
- Migration 017 (partner_engine schema, already applied)

Existing tables to use:
- `advertiser_accounts` (has all the partner data)
- `partner_offers` (has the offer data)
- `advertiser_team_members`, `advertiser_testimonials`, `advertiser_locations`, `advertiser_photos`, `advertiser_services`, `advertiser_faqs`, `advertiser_trust_signals`
- `partner_leads` (lead capture)

═══════════════════════════════════════════════════════
## DEFENSIVE STARTUP CHECK
═══════════════════════════════════════════════════════

1. Verify migrations 016, 017, 018 are all applied:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
```

Should return at minimum: advertiser_accounts, partner_offers, advertiser_team_members, advertiser_testimonials, advertiser_locations, advertiser_photos, advertiser_services, advertiser_faqs, advertiser_trust_signals, partner_leads, guide_articles.

2. Verify Dentistry for Children seed exists and has an active offer:
```sql
SELECT a.id, a.business_name, a.slug, a.current_offer_id, o.offer_headline 
FROM advertiser_accounts a 
LEFT JOIN partner_offers o ON o.id = a.current_offer_id 
WHERE a.slug = 'dentistry-for-children';
```

If `current_offer_id` is NULL or the offer doesn't exist, run the DFC seed insert before proceeding (see Task 4D for full content).

3. Verify shadcn/ui is installed. Check for `/src/components/ui/button.tsx`, `/src/components/ui/input.tsx`, `/src/components/ui/textarea.tsx`, `/src/components/ui/card.tsx`. If any missing, install via shadcn CLI before proceeding.

═══════════════════════════════════════════════════════
## TASK 1 — TEMPLATE INFRASTRUCTURE
═══════════════════════════════════════════════════════

Build the system that supports multiple page templates per partner.

### 1A — Migration `019_template_system.sql`

Add columns to `partner_offers`:
- `template_slug` TEXT NOT NULL DEFAULT 'consult-booking' (one of: 'consult-booking' / 'giveaway' / 'lead-magnet' / future templates)
- `color_scheme` TEXT NOT NULL DEFAULT 'sage-warm' (one of: 'sage-warm' / 'sky-terra' / 'navy-gold' / 'forest-blush' / 'charcoal-amber')
- `template_config` JSONB DEFAULT '{}' (template-specific config that doesn't fit in standard offer fields — e.g., giveaway prize image URL, lead magnet PDF URL)

Add columns to `advertiser_accounts`:
- `display_logo_emoji` TEXT (small emoji or icon name for templates that use emoji branding — fallback when no logo uploaded)

Index on `template_slug` for fast lookup.

### 1B — Color scheme system

Build `/src/lib/color-schemes.ts` exporting 5 pre-designed color schemes as Tailwind class strings AND CSS custom properties.

Each scheme has:
```typescript
{
  slug: string,
  name: string, // user-facing name in onboarding
  description: string, // "Calm and trustworthy — best for healthcare and wellness"
  preview_image: string, // path to preview swatch
  primary: string, // hex
  primary_foreground: string, // hex (text on primary)
  secondary: string, // hex
  secondary_foreground: string, // hex
  background: string, // hex
  foreground: string, // hex (body text)
  muted: string, // hex
  muted_foreground: string, // hex
  card: string, // hex
  border: string, // hex
  // Tailwind utility classes for direct use
  classes: {
    primary_bg: string, // 'bg-[#5a8a6a]'
    primary_text: string,
    primary_button: string, // full button class string
    // etc.
  }
}
```

The 5 schemes:

**1. `sage-warm` — Calm and trustworthy**
- Primary: #5a8a6a (sage green)
- Secondary: #f4a261 (warm orange)
- Background: #f7f3ed (cream)
- Foreground: #2c3e2d (dark forest)
- Best for: healthcare, wellness, therapy, family services

**2. `sky-terra` — Friendly and approachable**
- Primary: #4a90d9 (sky blue)
- Secondary: #c4622d (terracotta)
- Background: #faf8f3 (warm cream)
- Foreground: #1a2744 (deep navy)
- Best for: pediatric services, childcare, family activities

**3. `navy-gold` — Premium and established**
- Primary: #1a2744 (deep navy)
- Secondary: #c89933 (warm gold)
- Background: #faf8f3 (warm cream)
- Foreground: #1a2744
- Best for: education, professional services, financial advisors

**4. `forest-blush` — Modern and warm**
- Primary: #2d5a3d (forest green)
- Secondary: #e8a5a5 (soft blush)
- Background: #f7f5f0 (oat cream)
- Foreground: #1f2d1f
- Best for: boutiques, photography, wellness practices

**5. `charcoal-amber` — Sophisticated and modern**
- Primary: #2c2c2c (charcoal)
- Secondary: #e89525 (amber)
- Background: #faf8f3 (warm cream)
- Foreground: #2c2c2c
- Best for: restaurants, premium services, modern professional

For each scheme, include a `getColorScheme(slug)` helper function that returns the full scheme object. Templates use this function to apply colors.

### 1C — Template registry

Build `/src/components/partner-engine/templates/index.ts`:

```typescript
import { ConsultBookingFunnel } from './ConsultBookingFunnel';
import { GiveawayFunnel } from './GiveawayFunnel';
import { LeadMagnetFunnel } from './LeadMagnetFunnel';

export const TEMPLATE_REGISTRY = {
  'consult-booking': {
    component: ConsultBookingFunnel,
    name: 'The Trusted Consultation Page',
    description: 'A focused, fear-reducing page that converts anxious prospects into booked consultations. Best for healthcare, services, and businesses where parents have concerns to overcome.',
    best_for: ['healthcare', 'family-service', 'professional-services'],
    preview_image: '/images/templates/consult-booking-preview.jpg',
    config_schema: { /* ... */ },
  },
  'giveaway': {
    component: GiveawayFunnel,
    name: 'The Community Giveaway Page',
    description: 'A high-conversion giveaway page that builds your list while building your community. Perfect for events, prize promotions, and seasonal campaigns.',
    best_for: ['events', 'family-activities', 'community-building'],
    preview_image: '/images/templates/giveaway-preview.jpg',
    config_schema: { /* ... */ },
  },
  'lead-magnet': {
    component: LeadMagnetFunnel,
    name: 'The Free Resource Page',
    description: 'A clean lead-capture page where prospects exchange their email for a valuable resource. Best for building cold-traffic email lists and nurturing prospects over time.',
    best_for: ['list-building', 'cold-traffic', 'thought-leadership'],
    preview_image: '/images/templates/lead-magnet-preview.jpg',
    config_schema: { /* ... */ },
  },
};

export function getTemplate(slug: string) {
  return TEMPLATE_REGISTRY[slug] || TEMPLATE_REGISTRY['consult-booking'];
}
```

### 1D — DONE WHEN

[ ] Migration 019 applied
[ ] /src/lib/color-schemes.ts exports all 5 schemes with full color values and helper functions
[ ] /src/components/partner-engine/templates/index.ts exists with TEMPLATE_REGISTRY
[ ] All 3 template components exist (built in next tasks)

═══════════════════════════════════════════════════════
## TASK 2 — TEMPLATE 1: CONSULT BOOKING FUNNEL
═══════════════════════════════════════════════════════

Port the AI Studio "stress-free dental experience" template into the platform. This is THE template for Dentistry for Children's polished demo.

### 2A — Reference design

Jason provided this exact React/TSX file from his AI Studio (Lovable) build. The structure, sections, and visual treatment must match this. The only changes are: (a) replace hardcoded content with config props, (b) use the platform's color scheme system, (c) hook the form to the speed-to-lead API, (d) make it responsive across all viewports.

Reference layout from Jason's AI Studio version:
- Top nav: simple logo+name (no full nav menu — this is a landing page)
- Hero section: 2-column on desktop, stacked on mobile
  - Left: badge ("Voted #1 Pediatric Dentist by Local Moms" or similar), H1 with one phrase italicized in primary color (e.g., "A Stress-Free Dental Experience Your Child Will *Actually Love*"), descriptive paragraph, 3-bullet checkmark list of benefits, social proof strip (3 avatars + 5 stars + "Trusted by N+ Local Families")
  - Right: lead capture form in a card with subtle shadow and gradient backdrop ("Claim Your Free Consultation" header, form fields, big bold submit button)
- Experience/Atmosphere section: alternating image-left, text-right
  - Image with rounded corners, offset shadow, optional small testimonial card overlay
  - Heading with one phrase italicized in primary color
  - 3 feature points with icon, title, description (Patience First / Distraction & Comfort / Parents Always Welcome — generic equivalent for non-healthcare)
- Social Proof / Reviews section: 3-column grid of testimonial cards with stars, quote, author name + role
- Final CTA section: large heading with italicized phrase, paragraph, single big button that scrolls back to form
- Footer: simple logo, tagline, copyright

### 2B — Build `/src/components/partner-engine/templates/ConsultBookingFunnel.tsx`

```typescript
'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star, Shield, Heart, CheckCircle2, Smile } from "lucide-react";
import { getColorScheme } from "@/lib/color-schemes";

interface ConsultBookingFunnelProps {
  // Identity
  business_name: string;
  display_logo_emoji?: string;
  logo_url?: string;
  
  // Hero
  hero_badge: string; // "Voted #1 Pediatric Dentist by Local Moms"
  hero_headline: string; // "A Stress-Free Dental Experience Your Child Will"
  hero_headline_emphasis: string; // "Actually Love" (rendered in primary color, italic)
  hero_description: string;
  hero_benefits: string[]; // 3 bullet points
  social_proof_count: string; // "500+"
  social_proof_label: string; // "Trusted by 500+ Local Families"
  
  // Form
  form_headline: string; // "Claim Your Free Consultation"
  form_subheadline: string;
  form_button_label: string; // "Get My Free Consultation"
  form_fields_config: 'parent-child' | 'name-only' | 'business' | 'general'; // determines which fields show
  
  // Experience section
  experience_image_url: string;
  experience_image_caption?: string;
  experience_headline: string; // "An Atmosphere Designed for"
  experience_headline_emphasis: string; // "Little Worriers"
  experience_description: string;
  experience_features: Array<{ title: string; description: string; }>;
  
  // Reviews
  reviews_headline: string;
  reviews_subheadline: string;
  reviews: Array<{ text: string; author: string; role: string; }>;
  
  // Final CTA
  final_cta_headline: string;
  final_cta_emphasis: string;
  final_cta_description: string;
  final_cta_button_label: string;
  
  // System
  partner_id: string;
  offer_id: string;
  color_scheme: string;
  on_form_submit?: (data: any) => Promise<void>;
}

export function ConsultBookingFunnel(props: ConsultBookingFunnelProps) {
  const scheme = getColorScheme(props.color_scheme);
  // ... full implementation matching the AI Studio reference
}
```

The component should:
- Apply colors from the scheme to ALL primary/secondary references
- Make the hero italicized phrase use `text-primary` from the scheme
- Show form fields based on `form_fields_config`:
  - `parent-child`: parent name, child name, child age, phone, email, message — for healthcare and education
  - `name-only`: name, email, phone — simplest
  - `business`: name, business name, email, phone — for B2B services
  - `general`: name, email, phone, message — fallback
- Submit via fetch to `/api/partner-leads/capture` POST with all collected fields
- Handle submission states: idle, submitting, submitted (show success message)
- Be fully responsive — desktop 2-column hero, mobile stacked
- Use Fraunces font for H1/H2 (already in the platform), DM Sans for body (already in the platform)
- Use existing shadcn/ui components

### 2C — Color scheme application

Inside the component, do NOT hardcode any color values. Pull from the scheme object. Example:
```tsx
<div style={{ backgroundColor: scheme.background, color: scheme.foreground }}>
  <h1>
    {hero_headline}{' '}
    <span style={{ color: scheme.primary, fontStyle: 'italic' }}>
      {hero_headline_emphasis}
    </span>
  </h1>
</div>
```

This way, the same template renders differently based on which scheme is selected.

### 2D — DONE WHEN

[ ] ConsultBookingFunnel.tsx component built
[ ] All sections from the AI Studio reference present (hero, experience, reviews, final CTA, footer)
[ ] Form posts to /api/partner-leads/capture
[ ] All colors come from the color_scheme prop, none hardcoded
[ ] Responsive across mobile, tablet, desktop
[ ] form_fields_config switches between 4 field configurations correctly
[ ] All form submissions trigger the speed-to-lead pipeline (Task 5)

═══════════════════════════════════════════════════════
## TASK 3 — TEMPLATE 2: GIVEAWAY FUNNEL
═══════════════════════════════════════════════════════

Port the AI Studio Giveaway Funnel template Jason provided. This template gets used for events, prize promotions, and community-building campaigns.

### 3A — Reference design

Reference layout from Jason's AI Studio version:
- Top header: solid color band with trophy icon and "OFFICIAL GIVEAWAY" centered text in caps
- Main content: 2-column grid on desktop, stacked on mobile
  - Left column: "Limited Time Offer" badge, large headline ("Win [Prize] to the [Event Name]!"), description paragraph, hero image with date overlay caption, 3 feature cards (icon + benefit text)
  - Right column: sticky form card on desktop ("Enter to Win" header, name/email/phone fields, "Enter Giveaway Now" button, fine-print disclosure about notification method)
- After-submit state: trophy icon, "You're Entered!" headline, confirmation message with notification details, "Submit Another Entry" button
- Footer: copyright with event name, third-party platform disclaimer

### 3B — Build `/src/components/partner-engine/templates/GiveawayFunnel.tsx`

```typescript
interface GiveawayFunnelProps {
  // Identity
  business_name: string;
  
  // Header
  header_badge_text?: string; // defaults to "OFFICIAL GIVEAWAY"
  
  // Hero
  hero_badge: string; // "Limited Time Offer"
  prize_headline: string; // "Win Free Family VIP Tickets to the"
  event_name: string; // "River Region Parents Baby Expo" — rendered in primary color
  description: string;
  hero_image_url: string;
  draw_date_label: string; // "Drawing Date: May 15th, 2026"
  
  // Features (3 cards)
  features: Array<{ icon: string; text: string; }>; // icon name from lucide-react
  
  // Form
  form_headline: string; // "Enter to Win"
  form_subheadline: string;
  form_button_label: string; // "Enter Giveaway Now"
  notification_method: 'email' | 'phone' | 'both';
  
  // Footer
  footer_disclaimer?: string;
  
  // System
  partner_id: string;
  offer_id: string;
  color_scheme: string;
  on_form_submit?: (data: any) => Promise<void>;
}
```

The component should:
- Match the AI Studio reference layout exactly in structure
- Use color_scheme for all theme colors (primary band color, secondary trophy color, button color, etc.)
- Form posts to `/api/partner-leads/capture` with `offer_type='giveaway-entry'`
- Show success state in-place after submission (don't redirect)
- Allow "Submit Another Entry" link to reset the form for second entry
- Be fully responsive
- Lucide-react icons resolved by string name (use a small icon-name-to-component map)

### 3C — DONE WHEN

[ ] GiveawayFunnel.tsx component built
[ ] All sections from AI Studio reference present
[ ] Form posts to /api/partner-leads/capture
[ ] Success/in-place reset state works
[ ] Responsive across all viewports
[ ] Color scheme applied throughout, no hardcoded colors
[ ] Icons from features array render via string names

═══════════════════════════════════════════════════════
## TASK 4 — TEMPLATE 3: LEAD MAGNET FUNNEL
═══════════════════════════════════════════════════════

Build the Lead Magnet template. Jason hasn't built this one in AI Studio yet, but we have a clear pattern from his earlier work (the Kids Eat Free design referenced in past conversations) and the Russell Brunson lead magnet model.

### 4A — Design pattern

Single-page lead capture funnel. Email capture is the primary conversion event. Template structure:

- Top nav: simple logo + name
- Hero section: 2-column on desktop, stacked on mobile
  - Left: badge ("Free Resource"), H1 with one phrase italicized in primary color, description paragraph, 3-bullet list of what's inside
  - Right: lead capture form card with minimal fields (name + email + optional 1-2 more), prominent submit button
- "What's Inside" section: 3 feature cards explaining the value of the resource
- Optional social proof strip (testimonials about the resource)
- Final CTA section repeating the form
- Footer

The Lead Magnet template is intentionally lighter on content than Consult Booking — the goal is a fast, friction-free email capture, not a long-form persuasion page.

### 4B — Build `/src/components/partner-engine/templates/LeadMagnetFunnel.tsx`

```typescript
interface LeadMagnetFunnelProps {
  // Identity
  business_name: string;
  display_logo_emoji?: string;
  logo_url?: string;
  
  // Hero
  hero_badge: string; // "Free Resource"
  hero_headline: string; // "Get the 2026"
  hero_headline_emphasis: string; // "RRP Media Kit" (italic, primary color)
  hero_description: string;
  hero_benefits: string[]; // 3 bullet points
  
  // Form
  form_headline: string;
  form_subheadline: string;
  form_button_label: string; // "Send Me the Media Kit"
  form_extra_fields?: 'business' | 'category-interest' | 'none'; // beyond name+email
  
  // What's Inside
  whats_inside_headline: string; // "What's Inside the Kit"
  whats_inside_features: Array<{ icon: string; title: string; description: string; }>;
  
  // Social proof (optional)
  social_proof_quote?: string;
  social_proof_author?: string;
  
  // Final CTA
  final_cta_headline: string;
  final_cta_emphasis: string;
  final_cta_button_label: string;
  
  // Post-submit behavior
  redirect_after_submit?: string; // URL to redirect to after success (e.g., '/advertise')
  delivery_message?: string; // shown if no redirect ("Check your email for the link!")
  
  // System
  partner_id: string;
  offer_id: string;
  color_scheme: string;
  on_form_submit?: (data: any) => Promise<void>;
}
```

The component should:
- Be lighter and faster than Consult Booking — fewer sections, more whitespace
- Email field is required, name is required, all other fields optional
- Submit via fetch to `/api/partner-leads/capture` with `offer_type='lead-magnet'`
- After submit, either:
  - Redirect to `redirect_after_submit` URL if provided (this is the path for `/get-media-kit` → `/advertise`)
  - Show success state with `delivery_message` if no redirect
- Be fully responsive
- Use color_scheme throughout

### 4C — DONE WHEN

[ ] LeadMagnetFunnel.tsx component built
[ ] All sections present (hero, what's inside, optional social proof, final CTA, footer)
[ ] Form posts to /api/partner-leads/capture
[ ] Redirect-after-submit works
[ ] Responsive across all viewports
[ ] Color scheme applied throughout

═══════════════════════════════════════════════════════
## TASK 5 — DYNAMIC ROUTING FOR /partners/[slug]
═══════════════════════════════════════════════════════

Replace the existing offer-page renderer with a template-aware version that picks the right template based on `partner_offers.template_slug`.

### 5A — Update `/src/app/partners/[slug]/page.tsx`

```typescript
import { getTemplate } from '@/components/partner-engine/templates';

export default async function PartnerPage({ params }) {
  const { slug } = params;
  
  // Fetch advertiser_account, current_offer, and all related data
  const account = await getAdvertiserAccount(slug);
  const offer = account.current_offer;
  
  if (!offer) {
    return <NoActiveOfferState />;
  }
  
  const template = getTemplate(offer.template_slug);
  const TemplateComponent = template.component;
  
  // Build props from database data
  const props = mapAccountAndOfferToTemplateProps(account, offer, template.config_schema);
  
  return (
    <>
      {/* Demo strip if not yet published */}
      {!account.published_at && <DemoBanner business_name={account.business_name} />}
      
      {/* Render the selected template */}
      <TemplateComponent {...props} />
    </>
  );
}
```

### 5B — Build `/src/lib/template-prop-mapper.ts`

This is the critical glue. It takes raw database rows (advertiser_account + partner_offer + related tables) and maps them into the props each template expects.

```typescript
export function mapToConsultBookingProps(account, offer): ConsultBookingFunnelProps {
  return {
    business_name: account.business_name,
    display_logo_emoji: account.display_logo_emoji,
    logo_url: account.logo_url,
    hero_badge: offer.template_config?.hero_badge || `Voted #1 ${offer.subcategory} by Local Families`,
    hero_headline: offer.template_config?.hero_headline || 'A Trusted Experience Your Family Will',
    hero_headline_emphasis: offer.template_config?.hero_headline_emphasis || 'Actually Love',
    hero_description: offer.offer_value_statement,
    hero_benefits: offer.proof_points?.map(p => p.claim).slice(0, 3) || [],
    social_proof_count: offer.template_config?.social_proof_count || '500+',
    social_proof_label: offer.template_config?.social_proof_label || 'Trusted by 500+ Local Families',
    // ... rest of mapping
    color_scheme: offer.color_scheme || 'sky-terra',
    partner_id: account.id,
    offer_id: offer.id,
  };
}

// Similar mappers for giveaway and lead-magnet templates
```

The mapper provides smart fallbacks for any unset fields — never crashes, never shows raw "{{placeholder}}" text.

### 5C — DemoBanner component

When `account.published_at` is NULL (i.e., this is a demo/sample page, not a published partner page), show a thin terra strip at the top:

> "✨ This is a sample of The KeepSharing Partner Engine for [Business Name]. Want YOUR business to convert like this? [Talk to us →](/advertise)"

The strip disappears once `published_at` is set.

### 5D — DONE WHEN

[ ] /src/app/partners/[slug]/page.tsx replaced with template-aware renderer
[ ] /src/lib/template-prop-mapper.ts maps DB rows to template props for all 3 templates
[ ] Smart fallbacks prevent broken states
[ ] DemoBanner shows when account.published_at is NULL
[ ] /partners/dentistry-for-children renders ConsultBookingFunnel template (after Task 6 seeds proper config)

═══════════════════════════════════════════════════════
## TASK 6 — REPLACE DENTISTRY FOR CHILDREN WITH CONSULT BOOKING TEMPLATE
═══════════════════════════════════════════════════════

The current /partners/dentistry-for-children renders Build Run #7's sprawling 13-section page. Replace it by updating the offer's template_slug to 'consult-booking' and seeding the template_config with content matching Jason's AI Studio reference.

### 6A — Update DFC offer record

```sql
UPDATE partner_offers
SET 
  template_slug = 'consult-booking',
  color_scheme = 'sky-terra',
  template_config = '{
    "hero_badge": "Trusted by 800+ River Region Families",
    "hero_headline": "A Stress-Free Dental Experience Your Child Will",
    "hero_headline_emphasis": "Actually Love",
    "hero_description": "We have designed every detail of our practice to be a warm, fear-free environment. From their very first visit, we help young children feel safe, relaxed, and happy.",
    "hero_benefits": [
      "Gentle, patient-led approach for anxious little ones",
      "Fun, calming environment with ceiling TVs and toys",
      "Specialized care focused purely on young children"
    ],
    "social_proof_count": "800+",
    "social_proof_label": "Trusted by 800+ Local Families",
    "form_headline": "Claim Your Free Consultation",
    "form_subheadline": "Fill out the form below and we will reach out to schedule a stress-free visit.",
    "form_button_label": "Get My Free Consultation",
    "form_fields_config": "parent-child",
    "experience_image_url": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1200&q=80",
    "experience_image_caption": "It felt more like a playroom than a clinic.",
    "experience_headline": "An Atmosphere Designed for",
    "experience_headline_emphasis": "Little Worriers",
    "experience_description": "We understand that the dentist can be overwhelming for young children. That is why we have replaced the clinical feel with a magical, comforting environment.",
    "experience_features": [
      {"title": "Patience First", "description": "We never rush. We explain everything in kid-friendly terms and let them touch and feel the tools first."},
      {"title": "Distraction and Comfort", "description": "From TVs on the ceiling playing their favorite shows to comfort items they can hold during their visit."},
      {"title": "Parents Always Welcome", "description": "You are encouraged to stay right by their side the entire time to provide that familiar comfort."}
    ],
    "reviews_headline": "Moms Love Our Gentle Approach",
    "reviews_subheadline": "Do not just take our word for it. Hear from other parents who found their child dental home with us.",
    "reviews": [
      {"text": "I was dreading this appointment because my 3-year-old is terrified of doctors. The staff was incredible. They sang songs, let him play with the water squirter, and he left giggling. Simply amazing.", "author": "Emily R.", "role": "Mother of a 3-year-old"},
      {"text": "Finally, a place that understands toddlers! They were so patient when she would not open her mouth at first. By the end, she was relaxed and watching her favorite cartoon on the ceiling.", "author": "Jessica M.", "role": "Mother of a 4-year-old"},
      {"text": "The absolute best pediatric dentist. The atmosphere is so calming and perfectly tailored to young kids. We drove 45 minutes just to come here and it was worth every second.", "author": "Amanda T.", "role": "Mother of two"}
    ],
    "final_cta_headline": "Ready to Give Your Child a",
    "final_cta_emphasis": "Happy Smile",
    "final_cta_description": "Join hundreds of local moms who have finally found a stress-free dental home. Claim your free consultation today and let us show you how easy a trip to the dentist can be.",
    "final_cta_button_label": "Claim Your Free Consultation"
  }'::jsonb
WHERE id = (SELECT current_offer_id FROM advertiser_accounts WHERE slug = 'dentistry-for-children');
```

### 6B — Verify the page renders

After the update, hard-refresh `/partners/dentistry-for-children` and verify:
- The hero matches the AI Studio reference: badge, italicized "Actually Love" in sky blue, descriptive text, 3 checkmarks, social proof strip with 3 avatars and stars
- The form is on the right with proper fields (parent name, child name, child age, phone, email, message) and styled per the sky-terra color scheme
- Below the hero: the experience section with image-left, text-right, 3 features
- Then the 3-card testimonial grid
- Then the final CTA section
- Then the footer
- Demo banner at top because published_at is still NULL

### 6C — DONE WHEN

[ ] DFC offer record updated with consult-booking template_slug, sky-terra color scheme, and full template_config
[ ] /partners/dentistry-for-children renders the AI Studio reference design
[ ] Form is wired and submits to speed-to-lead pipeline
[ ] Demo banner visible at top (until published_at is set)

═══════════════════════════════════════════════════════
## TASK 7 — `/get-media-kit` COLD-TRAFFIC LEAD MAGNET
═══════════════════════════════════════════════════════

Build the gated funnel for cold Facebook ad traffic. Uses the LeadMagnetFunnel template populated with RRP's media kit content.

### 7A — Special "system" partner record for RRP itself

For internal RRP campaigns (lead magnets, RRP-branded funnels), we need a partner-like record. Create or use an existing advertiser_accounts row with slug='river-region-parents-system' and a partner_offer with template_slug='lead-magnet'.

Migration approach: insert directly via SQL, not as a "partner" but as an internal system entity.

```sql
INSERT INTO advertiser_accounts (business_name, slug, package_tier, contact_name, contact_email, contact_phone, landing_page_published, category, subcategory, brand_color_primary, brand_color_accent)
VALUES ('River Region Parents', 'river-region-parents-system', 'tier-internal', 'Jason Watson', 'jason@keepsharing.com', '334-555-0000', false, 'media', 'publication', '#c4622d', '#1a2744')
ON CONFLICT (slug) DO UPDATE SET landing_page_published = false;

-- Insert the media kit offer
INSERT INTO partner_offers (advertiser_id, offer_name, offer_type, template_slug, color_scheme, template_config, is_active)
VALUES (
  (SELECT id FROM advertiser_accounts WHERE slug = 'river-region-parents-system'),
  '2026 Media Kit Lead Magnet',
  'lead-magnet',
  'lead-magnet',
  'sky-terra',
  '{ "hero_badge": "Free Media Kit", "hero_headline": "Get the 2026", "hero_headline_emphasis": "RRP Media Kit", "hero_description": "See how local family businesses are growing through the biggest community influencer for parents in the River Region. Print magazine. Social media. Website. Email newsletter. All built into one customer acquisition system.", "hero_benefits": ["Full breakdown of all 4 Partner tiers — from $125/mo to $1,500/mo", "Real ROI math from existing RRP partners", "The complete customer acquisition system explained"], "form_headline": "Drop Your Email", "form_subheadline": "We will send you the full kit instantly — no call required.", "form_button_label": "Send Me the Media Kit", "form_extra_fields": "category-interest", "whats_inside_headline": "What is Inside the Kit", "whats_inside_features": [{"icon": "Layers", "title": "4 Partner Tiers", "description": "Compare every tier from Featured Listing at $125/mo to The KeepSharing Partner Engine at $1,500/mo. Real deliverables, real pricing, no fluff."}, {"icon": "TrendingUp", "title": "The System That Works", "description": "Print, social, website, email, and the offer page that converts. See how the customer acquisition system actually delivers results for partners."}, {"icon": "Calculator", "title": "ROI That Surprises Most Prospects", "description": "The math behind why this works for businesses serving families. Real numbers from real partners."}], "final_cta_headline": "Ready to See How", "final_cta_emphasis": "Local Family Businesses Win", "final_cta_button_label": "Send Me the Media Kit", "redirect_after_submit": "/advertise" }'::jsonb,
  true
);

-- Set as current offer
UPDATE advertiser_accounts 
SET current_offer_id = (SELECT id FROM partner_offers WHERE offer_name = '2026 Media Kit Lead Magnet') 
WHERE slug = 'river-region-parents-system';
```

### 7B — Build `/src/app/get-media-kit/page.tsx`

```typescript
export default async function GetMediaKitPage() {
  const account = await getAdvertiserAccount('river-region-parents-system');
  const offer = account.current_offer;
  
  const props = mapToLeadMagnetProps(account, offer);
  
  return <LeadMagnetFunnel {...props} />;
}
```

This route uses the same template system as partner pages, just rendered for the internal RRP "partner" record.

### 7C — Form submission flow for /get-media-kit

When the form is submitted:
1. POST to `/api/partner-leads/capture` with `partner_id=river-region-parents-system-id`, `offer_id=media-kit-offer-id`, lead data
2. Save to partner_leads with `source_page='/get-media-kit'`
3. Sync to GHL with tags: `cold-prospect`, `media-kit-downloaded`, `nurture-cold-sequence`, plus any category-interest tag from the form
4. Trigger immediate email via GHL (or log as pending if workflow ID not set):
   - Subject: "Your 2026 RRP Media Kit — open when you have 5 minutes"
   - From: Jason Watson <jason@keepsharing.com>
   - Body: personal note from Jason, link to /advertise, reply-with-PDF mention
5. Enroll in 5-touch cold-prospect nurture sequence (templates already exist in /docs/email-templates/cold-prospect-nurture/ from Build Run #7 — verify they exist; if not, create them)
6. Redirect user to /advertise immediately (don't wait for email)

### 7D — UTM-aware /advertise behavior

When `/advertise` is loaded with `?utm_source=fb_lead_form` parameter, the page recognizes this is warm traffic from a Facebook lead form. No functional changes — same content. But optionally show a small welcome banner at the top:

> "Welcome — here is the 2026 RRP Media Kit. Saved your spot in our follow-up sequence too. Reply to the email if you want to talk."

The banner only shows if the UTM param is present. No-op for organic traffic.

### 7E — Email templates verification

Verify or create the cold-prospect nurture sequence at `/docs/email-templates/cold-prospect-nurture/`:
- `day-0-delivery.md` — immediate after form submit
- `day-3-checkin.md` — "have you had a chance to look?"
- `day-7-case-study.md` — "here is what happened when Dentistry for Children became a Tier 4 Partner"
- `day-14-objections.md` — "three things that surprise most prospects"
- `day-21-final.md` — "I would love to talk before our June issue closes"

Each in Jason's voice (warm, direct, never salesy).

### 7F — DONE WHEN

[ ] RRP system advertiser account inserted
[ ] Media kit lead magnet offer inserted with full template_config
[ ] /get-media-kit route built and renders the LeadMagnetFunnel
[ ] Form submission captures lead, tags in GHL, redirects to /advertise
[ ] /advertise recognizes UTM params from Facebook lead forms
[ ] All 5 cold-prospect nurture email templates exist

═══════════════════════════════════════════════════════
## TASK 8 — SPEED-TO-LEAD HANDOFF — VERIFY AND FIX
═══════════════════════════════════════════════════════

Build Run #7 specced the speed-to-lead system but it wasn't end-to-end tested. This task verifies it works and fixes any gaps.

### 8A — Verify `/api/partner-leads/capture` works correctly

Test with a manual curl or form submission:
```
POST /api/partner-leads/capture
{
  "partner_id": "<DFC account id>",
  "offer_id": "<DFC offer id>",
  "lead_first_name": "Test",
  "lead_last_name": "User",
  "lead_phone": "+13345550199",
  "lead_email": "test@example.com",
  "lead_metadata": {"child_name": "Tommy", "child_age": "4"}
}
```

Should:
1. Insert row into partner_leads
2. Return success with lead_id
3. Trigger SMS to lead (Task 8B)
4. Trigger partner email (Task 8C)
5. Enroll in nurture sequence (Task 8D)

### 8B — Verify SMS handoff

`/src/lib/sms-handoff.ts` (created in Build Run #7) should:
- Use the GHL sub-account API (already wired)
- Send from RRP's GHL number, NOT the partner's number
- Include offer-type-specific message templates
- Update partner_leads.lead_to_sms_status to 'sent' or 'failed'
- Include lead_to_sms_sent_at timestamp

If the file doesn't work as specified, fix it. Specifically verify the GHL conversations API call uses the correct sub-account credentials and phone number formatting (E.164).

Test by submitting a form on /partners/dentistry-for-children with Jason's actual cell phone number. Verify SMS arrives within 60 seconds. If not, debug.

### 8C — Verify partner notification email

`/src/lib/partner-notification.ts` (created in Build Run #7) should:
- Send to the partner's contact_email from advertiser_accounts
- Include all lead details
- Include the "what we have done" section
- Update partner_leads.partner_notification_status
- Use GHL email API or SMTP fallback

Verify the email sends. If the GHL workflow ID is not configured, log the email content to console as fallback (don't fail the whole pipeline).

### 8D — Verify nurture sequence enrollment

`/src/lib/nurture-sequence.ts` should:
- Make GHL API call to add the contact to the nurture workflow
- Use GHL_NURTURE_WORKFLOW_ID env var
- If env var is not set, log "Nurture enrollment pending — workflow ID not configured" and continue
- Update partner_leads.nurture_sequence_status to 'enrolled' or 'pending'

### 8E — End-to-end test instructions for status report

After fixing any issues, document the full test sequence:
1. Visit `/partners/dentistry-for-children`
2. Submit the form with real cell phone number and email
3. Within 60 seconds: SMS arrives from RRP's GHL number
4. Within 60 seconds: Email arrives at jason@keepsharing.com (or contact_email) with lead details
5. Check partner_leads table — row exists with all status fields = 'sent' or 'enrolled'
6. Check GHL contact — tags applied correctly

### 8F — DONE WHEN

[ ] /api/partner-leads/capture verified working end-to-end
[ ] SMS handoff arrives within 60 seconds of form submission (tested with Jason's phone)
[ ] Partner notification email sends successfully
[ ] Nurture sequence enrollment fires (or logs as pending if workflow ID missing)
[ ] partner_leads row updated with all status fields after submission
[ ] Manual test instructions documented in status report

═══════════════════════════════════════════════════════
## TASK 9 — ONBOARDING FORM: TEMPLATE-FIRST FLOW
═══════════════════════════════════════════════════════

Update the existing /onboard/[token] form to make template selection the first major decision (instead of just collecting raw data).

### 9A — New first section: "Pick Your Page Style"

After the basics (Section 1), add a new Section 2 BEFORE the offer section:

**Section 2 — Pick Your Page Style**
- Headline: "Let's pick the page that fits your goal."
- Subheadline: "We have built 3 proven page styles for businesses serving families. Each one is professionally designed and conversion-optimized. Pick the one that matches what you want a future customer to do."
- 3 visual cards (one per template), each shows:
  - Preview image of the template (use placeholder gradient with template name if no preview screenshot exists yet)
  - Template name (customer-facing, e.g., "The Trusted Consultation Page")
  - Description: who it is for, what it does
  - "Best for: [list]"
  - "Pick this style →" button
- After picking, the form auto-advances to Section 3 with template-specific fields

The 3 templates available for selection:
1. **The Trusted Consultation Page** (consult-booking) — "When you want anxious or concerned prospects to book a consultation. Best for healthcare, services, and businesses where parents need reassurance before booking."
2. **The Community Giveaway Page** (giveaway) — "When you want to build your list and your community. Best for events, prize promotions, and seasonal campaigns."
3. **The Free Resource Page** (lead-magnet) — "When you want to build your email list with cold traffic. Best for ongoing list growth and nurturing prospects over time."

### 9B — New section: "Pick Your Color Style"

Insert another small section after Section 2:

**Section 3 — Pick Your Color Style**
- Headline: "Now pick the colors that fit your brand."
- Subheadline: "Each color combination is professionally designed. Your business logo will sit on top of these colors as an accent."
- 5 color scheme cards in a grid, each shows:
  - Visual swatch (large rectangle showing the primary + secondary + background colors)
  - Name (e.g., "Sage Warm")
  - Description (e.g., "Calm and trustworthy — best for healthcare and wellness")
- Active selection highlighted with a check mark + border
- Default selection: 'sky-terra' (warm, friendly, family-business-appropriate)

After picking, form advances to template-specific content sections.

### 9C — Template-aware subsequent sections

The remaining sections of the form depend on which template was picked. Build a section router:

If `consult-booking` template picked:
- Section 4: Your Hero (headline + emphasized phrase + 3 benefits + social proof count)
- Section 5: Your Form Setup (which form fields, button label)
- Section 6: Your Atmosphere (image, headline, 3 features describing what makes you different)
- Section 7: Your Reviews (3 testimonials with author + role)
- Section 8: Your Final CTA (headline, button label)

If `giveaway` template picked:
- Section 4: Your Prize (prize description, hero image, draw date, notification method)
- Section 5: Your Features (3 benefits of entering)
- Section 6: Your Form Setup (button label, fine print)
- Section 7: Your Disclaimer (third-party disclosure)

If `lead-magnet` template picked:
- Section 4: Your Resource (what they get when they enter their email)
- Section 5: Your Hero (headline + emphasized phrase + benefits)
- Section 6: What's Inside (3 features describing the value)
- Section 7: Your Form Setup (button label, optional extra fields)
- Section 8: Where They Land (redirect URL or success message)

### 9D — Save partial progress

Each section saves to advertiser_accounts.onboarding_progress JSONB with the section name and the partial data. This allows the secretary to come back and continue.

Submission writes to partner_offers.template_slug, color_scheme, and template_config fields (which is what the renderer reads).

### 9E — Auto-prefill from website URL

The "Pull info from your website" button (built in Build Run #7) should now also pre-populate template-specific fields based on what was scraped:
- For consult-booking: scraped headline → hero_headline, scraped tagline → hero_headline_emphasis, scraped description → hero_description
- For giveaway: less applicable, but still prefills business name and logo
- For lead-magnet: scraped value props → benefits

### 9F — DONE WHEN

[ ] /onboard/[token] form updated with template-first flow
[ ] Section 2 shows 3 visual template cards with descriptions
[ ] Section 3 shows 5 color scheme cards
[ ] Subsequent sections adapt based on template picked
[ ] Partial progress saves work
[ ] Auto-prefill populates template-specific fields
[ ] Submission writes to partner_offers.template_slug, color_scheme, template_config

═══════════════════════════════════════════════════════
## TASK 10 — UPDATE /advertise WITH NEW TAGLINE + CUSTOMER ACQUISITION GRAPHIC
═══════════════════════════════════════════════════════

The /advertise page is the public sales page. It needs the new tagline, the customer acquisition system graphic, and overall polish that matches the new product positioning.

### 10A — New H1 tagline

Replace the current H1 with:

> **We Help Your Future Customers Find You.**

Subhead below it:

> "The customer acquisition system built for businesses serving families. Print. Social. Website. Email. The offer page. The follow-up. All built into one system, owned by River Region Parents."

### 10B — Customer Acquisition System Graphic

Build an SVG component at `/src/components/advertise/CustomerAcquisitionSystemGraphic.tsx`.

This is a magazine-quality editorial illustration showing the customer journey through your system. NOT a Lucidchart-style flowchart. Hand-drawn-feeling, soft cream background, terra and sky accents, Fraunces serif labels.

Visual structure:

```
                    [Discovery Touchpoints]
   ┌──────────┬──────────┬──────────┬──────────┐
   │ Magazine │  Social  │ Website  │ Featured │
   │    Ad    │    Ad    │ Rotator  │ Listing  │
   └──────────┴──────────┴──────────┴──────────┘
                        │
                        ▼
            ┌─────────────────────┐
            │  THE OFFER PAGE     │
            │   (Conversion)      │ ← built and hosted by us
            └─────────────────────┘
                        │
                        ▼
            ┌─────────────────────┐
            │   FORM SUBMITTED    │
            └─────────────────────┘
                ┌───┴───┐
                ▼       ▼
    [SMS to Lead]  [Email to You]
        in 60 sec    with details
                │       │
                └───┬───┘
                    ▼
            ┌─────────────────────┐
            │  14-DAY NURTURE     │ ← runs from RRP, branded
            │   (Email Sequence)  │
            └─────────────────────┘
                    │
                    ▼
            ┌─────────────────────┐
            │  CUSTOMER WALKS IN  │
            └─────────────────────┘
```

Implementation details:
- Render as inline SVG so it scales smoothly
- Use Fraunces serif for the labels (the H1 of each box)
- Use DM Sans for the descriptive text
- Background: cream (#faf8f3)
- Connector lines: hand-drawn-feeling (slightly wavy, not perfectly straight) in soft terra
- Boxes with subtle drop shadows, rounded corners, slight rotation variations to feel editorial
- Sky-blue and sage-green accents for variety
- Mobile responsive: on narrow screens, the 4 discovery touchpoints stack vertically; the rest of the flow stays as a vertical chain

This graphic appears on /advertise just below the new H1 hero, before the 4-tier breakdown.

### 10C — Section: "What is The KeepSharing Partner Engine?"

Add a new section just after the graphic:

> **What is The KeepSharing Partner Engine?**
> 
> It is not just an ad. It is the integrated customer acquisition system designed specifically for businesses serving families.
>
> **The Offer Page.** A custom-built, conversion-optimized landing page that drives prospects to one specific action — booking a consult, claiming an offer, downloading a resource. Built professionally. Mobile-optimized. Designed to convert.
>
> **The Speed-to-Lead Handoff.** When someone fills out the form, an SMS goes to them within 60 seconds with your direct number. Simultaneously, you get an email with their full details. The lead is hot. You just have to call them.
>
> **The 14-Day Nurture Sequence.** Not every lead converts on day one. So we run a 14-day email sequence — written, branded by River Region Parents, addressing the common objections — that keeps your offer in front of them until they are ready.
>
> **The Multi-Channel Distribution.** Your Partner Engine page does not exist in a vacuum. We drive traffic to it from your magazine ad, your social media campaign, your featured listing in our directory, our newsletter, and our website rotator. All paths lead to your offer.
>
> **Built by River Region Parents. Powered by KeepSharing.**

### 10D — Update tier naming

Update tier card copy throughout:
- Tier 4: "The KeepSharing Partner Engine — Full Power"
- Tier 3: "The KeepSharing Partner Engine — Essentials"
- Tier 2: "RRP Featured + Distribution"
- Tier 1: "RRP Featured Listing"

### 10E — UTM-aware welcome banner

When `/advertise?utm_source=fb_lead_form` is loaded, show small banner at top:
> "Welcome — here is the 2026 RRP Media Kit. Saved your spot in our follow-up sequence too. Reply to the email if you want to talk."

Banner only renders when UTM is present.

### 10F — Top-right link: "Already talked to us?"

Add a small text link in the /advertise top-right: "First time here? [Get the media kit →](/get-media-kit)"

This makes the two doors visible to anyone who lands on /advertise without context.

### 10G — DONE WHEN

[ ] /advertise H1 updated to "We Help Your Future Customers Find You."
[ ] Customer Acquisition System Graphic component built and embedded
[ ] "What is The KeepSharing Partner Engine?" section added
[ ] Tier naming updated throughout
[ ] UTM-aware welcome banner works
[ ] "First time here?" link visible in top-right
[ ] All copy reflects new positioning
[ ] Mobile responsive across all updates

═══════════════════════════════════════════════════════
## TASK 11 — KNOWLEDGE BASE UPDATE + STATUS REPORT
═══════════════════════════════════════════════════════

### 11A — Update `/docs/keepsharing-knowledge-base.md`

Add new section:

```markdown
## BUILD RUN #8 — DEPLOYED MAY 1-2, 2026

### Tagline (locked)
"We Help Your Future Customers Find You."

### Product Architecture: The KeepSharing Partner Engine
The integrated customer acquisition system delivered through publication brands. Multi-channel discovery → conversion-optimized offer page → speed-to-lead handoff → 14-day nurture → customer walks in.

### Funnel Templates (3 built, more coming)
1. The Trusted Consultation Page (consult-booking)
2. The Community Giveaway Page (giveaway)
3. The Free Resource Page (lead-magnet)

Templates ported from Jason's AI Studio designs into platform as React components with config-driven content.

### Color Schemes (5 pre-designed)
sage-warm / sky-terra / navy-gold / forest-blush / charcoal-amber

Partners pick one during onboarding. Each professionally designed.

### New surfaces:
- /partners/[slug] — now template-aware, renders correct funnel template based on offer.template_slug
- /partners/dentistry-for-children — now uses Consult Booking template (sky-terra scheme)
- /get-media-kit — gated cold-traffic lead magnet using Lead Magnet template
- /advertise — updated with new tagline, customer acquisition system graphic, system explanation

### New infrastructure:
- /src/lib/color-schemes.ts — 5 schemes
- /src/components/partner-engine/templates/ — template registry + 3 templates
- /src/lib/template-prop-mapper.ts — DB-to-template prop mapping with smart fallbacks
- /src/components/advertise/CustomerAcquisitionSystemGraphic.tsx — editorial SVG graphic
- migration 019 (template_slug, color_scheme, template_config columns)

### Two-doors model for media kit:
- /get-media-kit (gated) — for cold traffic, captures email then redirects to /advertise
- /advertise (open) — for warm traffic, including Facebook lead-form ads via UTM detection

### Speed-to-lead verified end-to-end:
- SMS within 60 sec from RRP GHL number ✓
- Partner email handoff with full lead details ✓
- 14-day nurture sequence enrollment via GHL workflow ✓

### Pending (Build Run #9):
- Templates 4, 5, 6 (Booking Appointment, Claim Offer, Sign Up — Jason builds in AI Studio, then ports)
- Mom Insiders submission engine
- Operations Dashboard live data wiring
- Proposal Generator
- Partner backend dashboard
- Multi-tenant audit for Boom launch
```

### 11B — Comprehensive status report

Post final status report including:
- All migrations applied (019)
- All new components built
- All new routes available
- All new library files
- DFC offer record updated with template config
- /get-media-kit live with RRP system partner record
- /advertise updated with tagline, graphic, system explanation
- Speed-to-lead verified (with proof of test submission)
- Manual test instructions:
  1. "Visit /partners/dentistry-for-children — should match AI Studio reference design with sky-terra colors, ConsultBookingFunnel layout"
  2. "Submit DFC form with real cell phone — should receive SMS in <60 sec, email arrives at contact_email"
  3. "Visit /get-media-kit — should show LeadMagnetFunnel with RRP media kit content"
  4. "Submit /get-media-kit form — should redirect to /advertise, lead saved with cold-prospect tag"
  5. "Visit /onboard/{test-token} — should show template-first flow, picker, color picker"
  6. "Visit /advertise — should show new tagline, customer acquisition system graphic, updated tier naming"
- Known TODOs (color scheme preview screenshots, template preview screenshots, real partner photos for templates)
- Build time summary

### 11C — DONE WHEN

[ ] Knowledge base updated with Build Run #8 section
[ ] Comprehensive status report posted with manual test instructions

═══════════════════════════════════════════════════════
## SUCCESS CRITERIA
═══════════════════════════════════════════════════════

Jason can:

1. **Open /partners/dentistry-for-children** and see the AI Studio reference design rendered through the platform — this is the page he can pitch tomorrow at $1,500/month with confidence.

2. **Submit the form himself** with his real cell phone number and within 60 seconds receive an RRP-branded SMS, simultaneously see an email arrive with lead details. The system actually works end-to-end.

3. **Run a Facebook ad to /get-media-kit** and have a list of cold prospects building automatically — every email submission tagged, dropped into nurture sequence, redirected to see the full media kit.

4. **Show /advertise to a prospect** and explain the entire customer acquisition system in 60 seconds using the editorial graphic — every component visible, the system explainable.

5. **Send a signed prospect to /onboard/[token]** and have them pick the right template for their business goal, pick a color scheme, and complete a guided form that produces a magazine-quality offer page.

6. **Build a 4th, 5th, or 6th template in AI Studio** when needed and port it into the platform using the same pattern as the 3 we just built. The system scales beyond what is built today.

This build is the bridge from "we have an architecture" to "we have a product that looks like it would convert."

═══════════════════════════════════════════════════════
## FINAL CHECKLIST BEFORE STOPPING
═══════════════════════════════════════════════════════

[ ] All 11 task blocks complete
[ ] Migration 019 applied successfully to production Supabase
[ ] All 3 templates built and rendering correctly
[ ] /partners/dentistry-for-children renders the Consult Booking template with sky-terra scheme matching AI Studio reference
[ ] /get-media-kit renders the Lead Magnet template with RRP media kit content
[ ] Speed-to-lead handoff fires correctly end-to-end (tested with real submission)
[ ] /advertise updated with new tagline and customer acquisition system graphic
[ ] /onboard/[token] form template-first flow working
[ ] All cold-prospect nurture email templates exist
[ ] Knowledge base updated
[ ] Comprehensive status report posted

Then STOP. Do not deploy to production. Do not start additional builds.

The next build (Build Run #9) will tackle: templates 4-6 once Jason builds them in AI Studio, Mom Insiders submission engine, Operations Dashboard live wiring, proposal generator, partner backend dashboard.

GO.
