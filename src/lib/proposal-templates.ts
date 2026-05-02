export interface ProposalTemplate {
  category: string
  tier: string
  title: string
  recommended_addons: string[]
  monthly_price: number
  contract_months: number
  intro_paragraph: string
  value_props: string[]
  roi_math: string
  onboarding_timeline: string
}

export const PROPOSAL_TEMPLATES: ProposalTemplate[] = [
  {
    category: 'pediatric-care',
    tier: 'tier-4',
    title: 'The KeepSharing Partner Engine — Full System',
    recommended_addons: ['Monthly Performance Reports', 'Speed-to-Lead SMS', '14-Day Nurture Sequence'],
    monthly_price: 1500,
    contract_months: 12,
    intro_paragraph: 'After our conversation, here\'s what we\'d build for {{business_name}} as a Tier 4 KeepSharing Partner. Pediatric practices need more than visibility — they need a system that takes a hesitant parent from "I\'m not sure" to "I trusted my child with these people." That\'s exactly what this does.',
    value_props: [
      'Custom Offer Page — A conversion-optimized landing page built around your specific offer (free first visit, stress-free consultation, etc.)',
      'Magazine Presence — Full-page ad in River Region Parents every month, with QR codes routing parents directly to your offer page',
      'Social Campaign — Targeted Facebook and Instagram ads pointing to your offer page',
      'Email Mention — Featured in our weekly newsletter to 8,000+ family inboxes',
      'Speed-to-Lead Handoff — When a parent submits your form, an SMS goes to them within 60 seconds. Email lands in your inbox immediately.',
      '14-Day Nurture Sequence — RRP-branded follow-up emails keep your offer in front of parents until they\'re ready',
      'Monthly Performance Reports — Lead count, conversion rate, ROI estimate',
    ],
    roi_math: 'A pediatric practice typically has a family LTV of $1,200–$3,000. Generating just 3 new patient families per month from this system pays for the entire $1,500/mo investment. If your practice converts at a typical 30% rate from initial contact, this system needs to generate 10 leads per month to break even. Most Tier 4 partners see 15–25 leads per month within 90 days.',
    onboarding_timeline: 'Week 1: Onboarding form (60 minutes total, completed by your office staff on their phone). Week 2: Page goes live. Week 3–4: First leads start flowing. Month 2: First monthly performance report.',
  },
  {
    category: 'school',
    tier: 'tier-4',
    title: 'The KeepSharing Partner Engine — Enrollment System',
    recommended_addons: ['Monthly Enrollment Reports', 'Admissions Nurture Sequence'],
    monthly_price: 1500,
    contract_months: 12,
    intro_paragraph: 'Here\'s what we\'d build for {{business_name}} as a Tier 4 KeepSharing Partner. Enrollment for private schools is won or lost at the moment of discovery. When a new family moves to the River Region or when a parent starts questioning whether their current school is the right fit, they turn to River Region Parents first. This system ensures {{business_name}} is the answer they find.',
    value_props: [
      'Custom Offer Page — A conversion page built around your specific enrollment offer (free shadow day, fee waiver, open house)',
      'Magazine Presence — Full-page ad in every issue, reaching 15,000+ families in your area',
      'Social Campaign — Facebook and Instagram campaigns targeting parents in your enrollment zip codes',
      'Email Newsletter — Featured placement in our weekly family newsletter',
      'Speed-to-Lead — Inquiries trigger an immediate SMS to the family and an email to your admissions team',
      'Admissions Nurture — 14-day email sequence keeping your school top-of-mind through the decision process',
    ],
    roi_math: 'A private school student represents $8,000–$15,000+ in annual tuition. One new enrollment per quarter from this system delivers a 2–5x ROI on the $1,500/mo investment. Most school partners see 3–8 qualified campus tour requests per month within the first semester.',
    onboarding_timeline: 'Week 1: Onboarding form and offer selection with your admissions team. Week 2: Page and campaign go live. Week 3: First inquiries start flowing. Month 2: First enrollment attribution report.',
  },
  {
    category: 'pediatric-care',
    tier: 'tier-3',
    title: 'Print + Digital + Social — High Visibility',
    recommended_addons: ['Directory Listing', 'Social Promotion'],
    monthly_price: 895,
    contract_months: 6,
    intro_paragraph: 'Here\'s what we\'d build for {{business_name}} at Tier 3. This package gives you consistent visibility across every channel River Region families use to make decisions — without the full Partner Engine commitment.',
    value_props: [
      'Magazine Ad — Half-page ad every month in River Region Parents',
      'Featured Directory Listing — Premium placement in the Family Resource Guide',
      'Social Media Promotion — Monthly feature on our Instagram and Facebook',
      'Email Newsletter — Quarterly feature in our family email newsletter',
    ],
    roi_math: 'At $895/mo, you need this system to generate roughly 1–2 new patients per month to break even on a typical healthcare practice LTV. Most Tier 3 partners see 5–10 new inquiries per month within 60 days.',
    onboarding_timeline: 'Week 1: Ad design brief and directory info collected. Week 2: Ad live in print pipeline. Month 2: Full monthly print ad, social promotion begins.',
  },
  {
    category: 'healthcare',
    tier: 'tier-3',
    title: 'Print + Digital Visibility Package',
    recommended_addons: ['Directory Listing'],
    monthly_price: 895,
    contract_months: 6,
    intro_paragraph: 'Here\'s the Tier 3 package for {{business_name}}. This gives you consistent visibility where River Region families are already looking for healthcare providers — without requiring the full system commitment.',
    value_props: [
      'Half-Page Magazine Ad — Professional ad design included, runs every month',
      'Featured Directory Listing — Priority placement in the Family Healthcare section',
      'Social Promotion — Monthly feature post reaching our 12,000+ followers',
      'Email Newsletter — Quarterly mention to 8,000+ family subscribers',
    ],
    roi_math: 'Healthcare practices typically see a patient LTV of $800–$2,500. Two new patients per month from this system covers the $895/mo investment entirely. Most healthcare Tier 3 partners see 4–8 new patient inquiries per month.',
    onboarding_timeline: 'Week 1: Ad brief and directory information. Week 2: Design proof for your approval. Month 2: Live in print and digital.',
  },
  {
    category: 'childcare',
    tier: 'tier-2',
    title: 'Enhanced Visibility Package',
    recommended_addons: [],
    monthly_price: 450,
    contract_months: 6,
    intro_paragraph: 'Here\'s the Tier 2 Enhanced Listing for {{business_name}}. This is the most cost-effective way to stand out in the Family Resource Guide and stay visible to families who are actively searching for childcare options in the River Region.',
    value_props: [
      'Enhanced Directory Listing — Premium placement with photos, extended description, and contact info',
      'Seasonal Spotlight Feature — Featured in our quarterly childcare guide issue',
      'Social Media Tag — Occasional mentions and shares when relevant',
    ],
    roi_math: 'Childcare enrollment represents $600–$1,200/month per child. One new enrollment from this $450/mo package pays for itself immediately. Enhanced listings typically see 3–5x more inquiries than standard free listings.',
    onboarding_timeline: 'Week 1: Directory information and photos. Week 2: Enhanced listing live on website. Next quarterly issue: Print feature.',
  },
  {
    category: 'boutique',
    tier: 'tier-1',
    title: 'Featured Listing — Get Found',
    recommended_addons: [],
    monthly_price: 125,
    contract_months: 3,
    intro_paragraph: 'Here\'s our Featured Listing package for {{business_name}}. The lowest-commitment way to get consistent visibility in the River Region Parents Family Resource Guide — the guide moms share with each other.',
    value_props: [
      'Featured Directory Listing — Priority placement above standard listings',
      'Photo Gallery — Up to 5 photos in your listing',
      'Extended Business Description — Tell your story in 300+ words',
      'Direct Contact Integration — Phone, website, and directions on your listing',
    ],
    roi_math: 'At $125/mo, you need this listing to bring in one customer per quarter to break even on most boutique purchase values. Featured listings typically see 10–20 visits per month and 2–5 direct inquiries.',
    onboarding_timeline: 'This week: Submit your listing info. Next business day: Live on the site.',
  },
]

export function getProposalTemplate(category: string, tier: string): ProposalTemplate | null {
  return PROPOSAL_TEMPLATES.find(t => t.category === category && t.tier === tier) ?? null
}

export function fillProposalTemplate(template: ProposalTemplate, businessName: string): ProposalTemplate {
  const fill = (s: string) => s.replace(/\{\{business_name\}\}/g, businessName)
  return {
    ...template,
    intro_paragraph: fill(template.intro_paragraph),
    roi_math: fill(template.roi_math),
    onboarding_timeline: fill(template.onboarding_timeline),
    value_props: template.value_props.map(fill),
  }
}

export const TIER_LABELS: Record<string, string> = {
  'tier-1': 'Tier 1 — Featured Listing ($125/mo)',
  'tier-2': 'Tier 2 — Enhanced Listing ($450/mo)',
  'tier-3': 'Tier 3 — Print + Digital ($895/mo)',
  'tier-4': 'Tier 4 — Partner Engine ($1,500/mo)',
}

export const CATEGORY_OPTIONS = [
  { value: 'pediatric-care',     label: 'Pediatric / Children\'s Healthcare' },
  { value: 'school',             label: 'Education / Private School' },
  { value: 'healthcare',         label: 'Healthcare (Adult / Family)' },
  { value: 'childcare',          label: 'Childcare / Preschool / Daycare' },
  { value: 'family-service',     label: 'Family Services / Counseling' },
  { value: 'restaurant',         label: 'Restaurant / Food & Beverage' },
  { value: 'boutique',           label: 'Boutique / Retail' },
  { value: 'sports-activities',  label: 'Sports / Activities / Fitness' },
  { value: 'faith',              label: 'Faith Community' },
  { value: 'events',             label: 'Event Venue / Entertainment' },
  { value: 'other',              label: 'Other' },
]
