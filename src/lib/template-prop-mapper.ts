import type { PartnerPageData } from '@/components/partner-engine/types'
import type { ConsultBookingFunnelProps } from '@/components/partner-engine/templates/ConsultBookingFunnel'
import type { GiveawayFunnelProps } from '@/components/partner-engine/templates/GiveawayFunnel'
import type { LeadMagnetFunnelProps } from '@/components/partner-engine/templates/LeadMagnetFunnel'

// ── Helpers ───────────────────────────────────────────────────────────────────

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v ? v : undefined
}

function arr(v: unknown): string[] | undefined {
  return Array.isArray(v) && v.length > 0 ? (v as unknown[]).map(String) : undefined
}

function objArr<T>(v: unknown): T[] | undefined {
  return Array.isArray(v) && v.length > 0 ? (v as T[]) : undefined
}

// ── consult-booking ───────────────────────────────────────────────────────────

export function mapToConsultBookingProps(data: PartnerPageData): ConsultBookingFunnelProps {
  const { account, offer, testimonials, services, photos, team } = data
  const tc = offer?.template_config ?? {}
  const sub = account.subcategory ?? account.category ?? 'Practice'

  return {
    business_name:                account.business_name,
    display_logo_emoji:           account.display_logo_emoji ?? '🏥',
    logo_url:                     account.logo_url ?? undefined,

    hero_badge:                   str(tc.hero_badge) ?? 'Accepting New Patients · Montgomery, AL',
    hero_headline:                str(tc.hero_headline) ?? 'Care You Can Trust,',
    hero_headline_emphasis:       str(tc.hero_headline_emphasis) ?? 'For Families in Montgomery.',
    hero_description:             str(tc.hero_description) ?? offer?.offer_value_statement ?? `${account.business_name} is committed to providing excellent care for your family.`,
    hero_benefits:                arr(tc.hero_benefits) ?? services.slice(0, 4).map(s => s.service_name ?? '').filter(Boolean),
    social_proof_count:           str(tc.social_proof_count) ?? '500+',
    social_proof_label:           str(tc.social_proof_label) ?? `Families in Montgomery trust ${account.business_name}`,

    form_headline:                str(tc.form_headline) ?? 'Book Your Consultation',
    form_subheadline:             str(tc.form_subheadline) ?? 'Our team will reach out within 24 hours.',
    form_button_label:            str(tc.form_button_label) ?? offer?.cta_button_text ?? 'Request My Appointment',
    form_fields_config:           (tc.form_fields_config as ConsultBookingFunnelProps['form_fields_config']) ?? 'parent-child',

    experience_image_url:         str(tc.experience_image_url) ?? photos[0]?.photo_url ?? 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800',
    experience_image_caption:     str(tc.experience_image_caption) ?? undefined,
    experience_headline:          str(tc.experience_headline) ?? `Our ${sub} Was Designed`,
    experience_headline_emphasis: str(tc.experience_headline_emphasis) ?? 'With Your Family in Mind.',
    experience_description:       str(tc.experience_description) ?? 'We go out of our way to make every visit comfortable and stress-free.',
    experience_features:          objArr<{ title: string; description: string }>(tc.experience_features) ?? services.slice(0, 3).map(s => ({ title: s.service_name ?? '', description: s.description ?? '' })),

    reviews_headline:             str(tc.reviews_headline) ?? 'What Families Are Saying',
    reviews_subheadline:          str(tc.reviews_subheadline) ?? 'Real reviews from Montgomery parents.',
    reviews:                      objArr<{ text: string; author: string; role: string }>(tc.reviews) ?? testimonials.slice(0, 3).map(t => ({
                                    text: t.quote ?? '',
                                    author: t.author_name ?? 'Local Parent',
                                    role: t.author_context ?? 'River Region Family',
                                  })),

    final_cta_headline:           str(tc.final_cta_headline) ?? 'Ready to Experience',
    final_cta_emphasis:           str(tc.final_cta_emphasis) ?? 'The Difference?',
    final_cta_description:        str(tc.final_cta_description) ?? undefined,
    final_cta_button_label:       str(tc.final_cta_button_label) ?? offer?.cta_button_text ?? 'Schedule My Visit',

    team_members:                 team.length > 0 ? team.map(m => ({
                                    display_name:        m.display_name,
                                    title:               m.title,
                                    credentials:         m.credentials,
                                    bio:                 m.bio,
                                    philosophy_quote:    m.philosophy_quote,
                                    photo_url:           m.photo_url,
                                    years_with_practice: m.years_with_practice,
                                  })) : undefined,
    team_section_headline:        str(tc.team_section_headline) ?? "Meet the Team Who'll Care for Your Child",
    team_section_subheadline:     str(tc.team_section_subheadline) ?? 'Every provider on our team shares the same commitment: making your child feel safe, comfortable, and cared for.',

    partner_id:                   account.id,
    offer_id:                     offer?.id ?? '',
    color_scheme:                 offer?.color_scheme ?? 'sky-terra',
    contact_phone:                account.contact_phone ?? undefined,
  }
}

// ── giveaway ──────────────────────────────────────────────────────────────────

export function mapToGiveawayProps(data: PartnerPageData): GiveawayFunnelProps {
  const { account, offer, services, photos } = data
  const tc = offer?.template_config ?? {}

  return {
    business_name:       account.business_name,
    header_badge_text:   str(tc.header_badge_text) ?? 'OFFICIAL GIVEAWAY',
    hero_badge:          str(tc.hero_badge) ?? 'Enter to Win',
    prize_headline:      str(tc.prize_headline) ?? offer?.offer_headline ?? 'Win an Amazing Prize from',
    event_name:          str(tc.event_name) ?? account.business_name,
    description:         str(tc.description) ?? offer?.offer_value_statement ?? "We're giving back to our community!",
    hero_image_url:      str(tc.hero_image_url) ?? photos[0]?.photo_url ?? 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800',
    draw_date_label:     str(tc.draw_date_label) ?? 'Drawing Date: TBD',
    features:            objArr<{ icon: string; text: string }>(tc.features) ?? services.slice(0, 3).map(s => ({ icon: 'Star', text: s.service_name ?? '' })),
    form_headline:       str(tc.form_headline) ?? 'Enter the Giveaway',
    form_subheadline:    str(tc.form_subheadline) ?? 'Fill in your info below for a chance to win!',
    form_button_label:   str(tc.form_button_label) ?? offer?.cta_button_text ?? 'Enter Now',
    notification_method: (tc.notification_method as GiveawayFunnelProps['notification_method']) ?? 'email',
    footer_disclaimer:   str(tc.footer_disclaimer) ?? undefined,
    partner_id:          account.id,
    offer_id:            offer?.id ?? '',
    color_scheme:        offer?.color_scheme ?? 'sky-terra',
    contact_phone:       account.contact_phone ?? undefined,
  }
}

// ── lead-magnet ───────────────────────────────────────────────────────────────

export function mapToLeadMagnetProps(data: PartnerPageData): LeadMagnetFunnelProps {
  const { account, offer, testimonials, services } = data
  const tc = offer?.template_config ?? {}

  return {
    business_name:          account.business_name,
    display_logo_emoji:     account.display_logo_emoji ?? '📰',
    logo_url:               account.logo_url ?? undefined,

    hero_badge:             str(tc.hero_badge) ?? 'Free Resource',
    hero_headline:          str(tc.hero_headline) ?? offer?.offer_headline ?? 'Get Your Free Guide from',
    hero_headline_emphasis: str(tc.hero_headline_emphasis) ?? account.business_name,
    hero_description:       str(tc.hero_description) ?? offer?.offer_value_statement ?? 'Download this free resource and get the information you need.',
    hero_benefits:          arr(tc.hero_benefits) ?? services.slice(0, 3).map(s => s.service_name ?? '').filter(Boolean),

    form_headline:          str(tc.form_headline) ?? 'Get Instant Access',
    form_subheadline:       str(tc.form_subheadline) ?? 'Enter your email to download for free.',
    form_button_label:      str(tc.form_button_label) ?? offer?.cta_button_text ?? 'Send Me the Free Guide',
    form_extra_fields:      (tc.form_extra_fields as LeadMagnetFunnelProps['form_extra_fields']) ?? 'none',

    whats_inside_headline:  str(tc.whats_inside_headline) ?? "What's Inside",
    whats_inside_features:  objArr<{ icon: string; title: string; description: string }>(tc.whats_inside_features) ?? services.slice(0, 3).map(s => ({ icon: 'Star', title: s.service_name ?? '', description: s.description ?? '' })),

    social_proof_quote:     str(tc.social_proof_quote) ?? testimonials[0]?.quote ?? undefined,
    social_proof_author:    str(tc.social_proof_author) ?? testimonials[0]?.author_name ?? undefined,

    final_cta_headline:     str(tc.final_cta_headline) ?? 'Ready to',
    final_cta_emphasis:     str(tc.final_cta_emphasis) ?? 'Get Started?',
    final_cta_button_label: str(tc.final_cta_button_label) ?? offer?.cta_button_text ?? 'Download the Free Guide',

    redirect_after_submit:  str(tc.redirect_after_submit) ?? undefined,
    delivery_message:       str(tc.delivery_message) ?? undefined,

    partner_id:             account.id,
    offer_id:               offer?.id ?? '',
    color_scheme:           offer?.color_scheme ?? 'sky-terra',
  }
}
