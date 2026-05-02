-- Migration 019: Template system for the KeepSharing Partner Engine
-- Run in Supabase SQL editor after migration 018.

-- Add template fields to partner_offers
ALTER TABLE partner_offers
  ADD COLUMN IF NOT EXISTS template_slug TEXT NOT NULL DEFAULT 'consult-booking',
  ADD COLUMN IF NOT EXISTS color_scheme  TEXT NOT NULL DEFAULT 'sky-terra',
  ADD COLUMN IF NOT EXISTS template_config JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_partner_offers_template ON partner_offers(template_slug);

-- Add emoji fallback to advertiser_accounts
ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS display_logo_emoji TEXT;

-- RRP system account for internal campaigns (media kit lead magnet, etc.)
INSERT INTO advertiser_accounts (
  business_name, slug, package_tier, contact_name, contact_email, contact_phone,
  landing_page_published, category, subcategory,
  brand_color_primary, brand_color_accent, display_logo_emoji
)
VALUES (
  'River Region Parents', 'river-region-parents-system', 'tier-internal',
  'Jason Watson', 'jade31994@gmail.com', '334-328-5189',
  false, 'media', 'publication',
  '#c4622d', '#1a2744', '📰'
)
ON CONFLICT (slug) DO UPDATE SET
  contact_email = EXCLUDED.contact_email,
  display_logo_emoji = EXCLUDED.display_logo_emoji;

-- Media kit offer for /get-media-kit
DO $$
DECLARE
  v_rrp_id  UUID;
  v_offer_id UUID;
BEGIN
  SELECT id INTO v_rrp_id FROM advertiser_accounts WHERE slug = 'river-region-parents-system';

  IF NOT EXISTS (SELECT 1 FROM partner_offers WHERE advertiser_id = v_rrp_id AND offer_name = '2026 Media Kit Lead Magnet') THEN
    INSERT INTO partner_offers (
      advertiser_id, offer_name, offer_type,
      template_slug, color_scheme,
      offer_headline, offer_subheadline, offer_value_statement,
      cta_button_text, is_active,
      template_config
    ) VALUES (
      v_rrp_id,
      '2026 Media Kit Lead Magnet',
      'lead-magnet',
      'lead-magnet',
      'sky-terra',
      'Get the 2026 RRP Media Kit',
      'The customer acquisition system explained — free.',
      'See how local family businesses are growing through the biggest community influencer for parents in the River Region. Print magazine. Social media. Website. Email newsletter. All built into one customer acquisition system.',
      'Send Me the Media Kit',
      true,
      jsonb_build_object(
        'hero_badge', 'Free Resource',
        'hero_headline', 'Get the 2026',
        'hero_headline_emphasis', 'RRP Media Kit',
        'hero_description', 'See how local family businesses are growing through the biggest community influencer for parents in the River Region. Print magazine. Social media. Website. Email newsletter. All built into one customer acquisition system.',
        'hero_benefits', jsonb_build_array(
          'Full breakdown of all 4 Partner tiers — from $125/mo to $1,500/mo',
          'The complete customer acquisition system explained',
          'Real ROI math from existing RRP partners'
        ),
        'form_headline', 'Drop Your Email',
        'form_subheadline', 'We will send you the full kit instantly — no call required.',
        'form_button_label', 'Send Me the Media Kit',
        'form_extra_fields', 'category-interest',
        'whats_inside_headline', 'What Is Inside the Kit',
        'whats_inside_features', jsonb_build_array(
          jsonb_build_object('icon', 'Layers', 'title', '4 Partner Tiers', 'description', 'Compare every tier from Featured Listing at $125/mo to The KeepSharing Partner Engine at $1,500/mo. Real deliverables, real pricing, no fluff.'),
          jsonb_build_object('icon', 'TrendingUp', 'title', 'The System That Works', 'description', 'Print, social, website, email, and the offer page that converts. See how the customer acquisition system delivers results.'),
          jsonb_build_object('icon', 'Calculator', 'title', 'ROI That Surprises Most Prospects', 'description', 'The math behind why this works for businesses serving families. Real numbers from real partners.')
        ),
        'final_cta_headline', 'Ready to See How',
        'final_cta_emphasis', 'Local Family Businesses Win',
        'final_cta_button_label', 'Send Me the Media Kit',
        'redirect_after_submit', '/advertise'
      )
    ) RETURNING id INTO v_offer_id;

    UPDATE advertiser_accounts SET current_offer_id = v_offer_id WHERE id = v_rrp_id;
  END IF;

  -- Update DFC offer with template config
  UPDATE partner_offers SET
    template_slug  = 'consult-booking',
    color_scheme   = 'sky-terra',
    template_config = jsonb_build_object(
      'hero_badge', 'Trusted by 800+ River Region Families',
      'hero_headline', 'A Stress-Free Dental Experience Your Child Will',
      'hero_headline_emphasis', 'Actually Love',
      'hero_description', 'We have designed every detail of our practice to be a warm, fear-free environment. From their very first visit, we help young children feel safe, relaxed, and happy.',
      'hero_benefits', jsonb_build_array(
        'Gentle, patient-led approach for anxious little ones',
        'Fun, calming environment with ceiling TVs and toys',
        'Specialized care focused purely on young children'
      ),
      'social_proof_count', '800+',
      'social_proof_label', 'Trusted by 800+ Local Families',
      'form_headline', 'Claim Your Free Consultation',
      'form_subheadline', 'Fill out the form and we will reach out to schedule a stress-free visit.',
      'form_button_label', 'Get My Free Consultation',
      'form_fields_config', 'parent-child',
      'experience_image_url', 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&q=80',
      'experience_image_caption', 'It felt more like a playroom than a clinic.',
      'experience_headline', 'An Atmosphere Designed for',
      'experience_headline_emphasis', 'Little Worriers',
      'experience_description', 'We understand that the dentist can be overwhelming for young children. That is why we have replaced the clinical feel with a magical, comforting environment.',
      'experience_features', jsonb_build_array(
        jsonb_build_object('title', 'Patience First', 'description', 'We never rush. We explain everything in kid-friendly terms and let them touch and feel the tools first.'),
        jsonb_build_object('title', 'Distraction and Comfort', 'description', 'From TVs on the ceiling playing their favorite shows to comfort items they can hold during their visit.'),
        jsonb_build_object('title', 'Parents Always Welcome', 'description', 'You are encouraged to stay right by their side the entire time to provide that familiar comfort.')
      ),
      'reviews_headline', 'Moms Love Our Gentle Approach',
      'reviews_subheadline', 'Do not just take our word for it. Hear from other parents who found their dental home with us.',
      'reviews', jsonb_build_array(
        jsonb_build_object('text', 'I was dreading this appointment because my 3-year-old is terrified of doctors. The staff was incredible. They sang songs, let him play with the water squirter, and he left giggling. Simply amazing.', 'author', 'Emily R.', 'role', 'Mother of a 3-year-old'),
        jsonb_build_object('text', 'Finally, a place that understands toddlers! They were so patient. By the end, she was relaxed and watching her favorite cartoon on the ceiling.', 'author', 'Jessica M.', 'role', 'Mother of a 4-year-old'),
        jsonb_build_object('text', 'The absolute best pediatric dentist. The atmosphere is so calming and perfectly tailored to young kids. We drove 45 minutes just to come here and it was worth every second.', 'author', 'Amanda T.', 'role', 'Mother of two')
      ),
      'final_cta_headline', 'Ready to Give Your Child a',
      'final_cta_emphasis', 'Happy Smile',
      'final_cta_description', 'Join hundreds of local moms who have finally found a stress-free dental home. Claim your free consultation today.',
      'final_cta_button_label', 'Claim Your Free Consultation'
    )
  WHERE id = (SELECT current_offer_id FROM advertiser_accounts WHERE slug = 'dentistry-for-children');

END $$;
