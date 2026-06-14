// ── src/types/db.ts ────────────────────────────────────────────────────────────
// Shared TypeScript row interfaces for Supabase query results.
// Every field matches an actual database column — no speculative fields.
//
// Usage:
//   import type { SubmissionRow, AdvertiserRow } from '@/types/db'
//
// These are "full schema" types. Partial SELECT queries return a subset of
// these fields — TypeScript treats missing fields as potentially undefined.
// Use the provided column-list constants in lib/queries/* to fetch only what
// your view actually needs.
// ─────────────────────────────────────────────────────────────────────────────

// ── community_submissions ─────────────────────────────────────────────────────
// Source: migrations 053–060. ~50 columns accumulated across editorial,
// distribution, and social-export workflows.

export interface SubmissionRow {
  id:                         string
  submission_type:            string
  target_publication:         string
  status:                     string   // see STATUS_CONFIG in lib/submissions.ts
  ai_draft_status:            string   // none | queued | generating | ready | needs_info | edited | failed
  ai_draft_content:           string | null
  ai_prompt_used:             string | null
  working_title:              string | null
  related_person_name:        string | null
  related_business_name:      string | null
  related_school_name:        string | null
  excerpt:                    string | null
  slug_suggestion:            string | null
  feature_image_url:          string | null
  photo_urls:                 Array<{ url: string }>
  tags:                       string[] | null
  payload:                    Record<string, unknown>
  submitter_name:             string | null
  submitter_email:            string | null
  submitter_phone:            string | null
  internal_priority:          string   // low | normal | high | urgent
  assigned_to:                string | null
  editor_notes:               string | null
  target_market:              string | null
  issue_month:                string | null
  issue_year:                 number | null
  // editorial production columns (migration 055)
  destination_section:        string | null
  destination_guide_slug:     string | null
  print_placement:            string | null
  publish_date:               string | null
  newsletter_include:         boolean
  social_queue:               boolean
  homepage_feature:           boolean
  permissions_confirmed:      boolean
  // distribution coordination columns (migration 057)
  homepage_section:           string | null
  homepage_priority:          number | null
  homepage_remove_on:         string | null
  newsletter_section:         string | null
  newsletter_order:           number | null
  social_priority:            string
  approved_social:            boolean
  // editor approval columns (migration 058)
  approved_web:               boolean
  approved_newsletter:        boolean
  needs_changes_note:         string | null
  editor_reviewed_at:         string | null
  editor_name:                string | null
  caption_facebook:           string | null
  caption_instagram:          string | null
  caption_sms:                string | null
  social_hashtags:            string | null
  social_image_note:          string | null
  social_publish_date:        string | null
  social_link:                string | null
  newsletter_teaser:          string | null
  published_url:              string | null
  social_planner_ready:       boolean
  // social export columns (migration 060)
  image_status:               string | null  // image_ready | needs_photo | needs_canva_graphic | use_existing_image | no_image_needed
  exported_to_social_planner: boolean
  social_promoted_at:         string | null
  // bridge lineage (migration 178) — set when the publish-to-article
  // bridge has promoted this submission into a guide_articles row.
  promoted_to_article_id:     string | null
  created_at:                 string
  updated_at:                 string
}

// ── advertiser_accounts ───────────────────────────────────────────────────────
// Source: migrations 016, 050, 051.

export interface AdvertiserRow {
  id:                    string
  business_name:         string
  slug:                  string | null
  package_tier:          string | null
  lifecycle_stage:       string   // lead | consultation | proposal | onboarding | active | upgrade-ready | sponsor-qualified | renewal | dormant | reactivation
  loyalty_tier:          string   // bronze | silver | gold | platinum
  upgrade_flagged_at:    string | null
  at_risk_flagged_at:    string | null
  sponsor_category_slug: string | null
  sponsor_guide_slug:    string | null
  contract_start_date:   string | null
  contract_end_date:     string | null
  onboarding_status:     string | null
  primary_contact_email: string | null
  primary_contact_name:  string | null
  website_url:           string | null
  created_at:            string
  updated_at:            string
}

// ── media_assets ──────────────────────────────────────────────────────────────
// Source: migration 061.

export interface MediaAssetRow {
  id:                       string
  filename:                 string
  title:                    string | null
  description:              string | null
  alt_text:                 string | null
  source_attribution:       string | null
  storage_url:              string
  thumbnail_url:            string | null
  asset_type:               string   // photo | graphic | logo | illustration | document
  content_category:         string | null  // editorial | sponsor | social | guide | print | family-favorites | event | school
  publication:              string | null
  upload_source:            string   // submission | operator-upload | sponsor-provided | canva | stock
  tags:                     string[] | null
  width_px:                 number | null
  height_px:                number | null
  file_size_bytes:          number | null
  status:                   string   // uploaded | needs_review | approved | needs_graphic | social_ready | print_ready | archived
  used_on_homepage:         boolean
  used_in_article:          boolean
  used_in_guide:            boolean
  used_in_newsletter:       boolean
  used_on_social:           boolean
  used_in_print:            boolean
  used_in_family_favorites: boolean
  used_in_sponsor_section:  boolean
  linked_submission_id:     string | null
  linked_advertiser_id:     string | null
  linked_guide_slug:        string | null
  needs_canva_graphic:      boolean
  canva_link:               string | null
  assigned_designer:        string | null
  graphic_requested_at:     string | null
  graphic_completed_at:     string | null
  needs_quote_graphic:      boolean
  needs_social_square:      boolean
  needs_print_crop:         boolean
  needs_homepage_hero:      boolean
  has_web_crop:             boolean
  has_social_crop:          boolean
  has_print_crop:           boolean
  permission_confirmed:     boolean
  created_at:               string
  updated_at:               string
}

// ── ai_tasks ──────────────────────────────────────────────────────────────────
// Source: migration 059. Safety invariant: human_review_required is always TRUE.

export interface AITaskRow {
  id:                    string
  task_type:             string   // social_caption | newsletter_teaser | missing_info_email | article_refresh | proposal_notes | sponsor_pairing | headline_options | seo_suggestions | event_summary
  source_table:          string | null
  source_id:             string | null
  status:                string   // queued | running | completed | needs_review | approved | rejected | failed | canceled
  priority:              string   // low | normal | high | urgent
  requested_by:          string | null
  assigned_to:           string | null
  input_snapshot:        Record<string, unknown> | null
  output_preview:        string | null
  output_payload:        Record<string, unknown> | null
  error_message:         string | null
  human_review_required: boolean  // always TRUE — safety invariant
  approved_by:           string | null
  approved_at:           string | null
  rejected_at:           string | null
  rejection_note:        string | null
  created_at:            string
  started_at:            string | null
  completed_at:          string | null
}

// ── guide_listings ────────────────────────────────────────────────────────────
// Source: migrations 003, 016, 028.

export interface GuideListingRow {
  id:                  string
  slug:                string
  guide_slug:          string | null
  category_slug:       string | null
  business_name:       string
  tagline:             string | null
  description:         string | null
  phone:               string | null
  website_url:         string | null
  email:               string | null
  address_line_1:      string | null
  city:                string | null
  state:               string | null
  listing_tier:        string | null  // free | enhanced | featured
  is_active:           boolean
  click_count_phone:   number
  click_count_website: number
  advertiser_id:       string | null
  created_at:          string
  updated_at:          string
}

// ── partner_leads ─────────────────────────────────────────────────────────────
// Source: migration 017. Full lead capture from Partner Engine offer forms.

export interface PartnerLeadRow {
  id:                          string
  advertiser_id:               string | null
  offer_id:                    string | null
  lead_first_name:             string | null
  lead_last_name:              string | null
  lead_email:                  string | null
  lead_phone:                  string | null
  lead_metadata:               Record<string, unknown>
  source_page:                 string | null
  referrer_url:                string | null
  utm_source:                  string | null
  utm_medium:                  string | null
  utm_campaign:                string | null
  partner_last_action_at:      string | null
  partner_marked_converted:    boolean
  partner_marked_converted_at: string | null
  lead_to_sms_status:          string | null
  partner_notification_status: string | null
  nurture_sequence_status:     string | null
  created_at:                  string
}

// ── ad_placements ─────────────────────────────────────────────────────────────
// Source: migration 035. The canonical active ad tracking table.
// Only table with working RPC increment functions.

export interface AdPlacementRow {
  id:               string
  advertiser_id:    string | null
  placement_type:   string
  context_type:     string | null
  context_slug:     string | null
  ad_headline:      string | null
  ad_eyebrow:       string | null
  ad_body:          string | null
  ad_cta_label:     string | null
  ad_cta_url:       string | null
  is_active:        boolean
  impression_count: number
  click_count:      number
  starts_at:        string
  ends_at:          string | null
  created_at:       string
}

// ── proposals ────────────────────────────────────────────────────────────────
// Source: migration 022.

export interface ProposalRow {
  id:             string
  token_slug:     string
  business_name:  string | null
  contact_first_name: string | null
  contact_email:  string | null
  recommended_tier: string | null
  custom_monthly_price: number | null
  status:         string
  viewed_count:   number
  sent_at:        string | null
  accepted_at:    string | null
  declined_at:    string | null
  expires_at:     string | null
  created_at:     string
}

// ── newsletter_subscribers ────────────────────────────────────────────────────
// Source: migration 026.

export interface NewsletterSubscriberRow {
  id:               string
  email:            string
  first_name:       string | null
  last_name:        string | null
  source:           string | null
  tags:             string[]
  ghl_contact_id:   string | null
  publication_slug: string
  is_subscribed:    boolean
  unsubscribed_at:  string | null
  subscribed_at:    string
  created_at:       string
}

// ── engagement_campaigns ──────────────────────────────────────────────────────
// Source: migration 062.

export interface EngagementCampaignRow {
  id:               string
  name:             string
  campaign_type:    string   // participation | newsletter | seasonal | sponsor | content | retention
  publication:      string | null
  target_category:  string | null
  target_guide_slug:string | null
  target_school:    string | null
  status:           string   // idea | planned | active | complete | paused
  goal:             string | null
  notes:            string | null
  start_date:       string | null
  end_date:         string | null
  owner:            string | null
  result_notes:     string | null
  created_at:       string
  updated_at:       string
}
