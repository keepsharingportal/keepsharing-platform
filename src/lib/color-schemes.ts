/**
 * Pre-designed color schemes for the KeepSharing Partner Engine.
 * Partners select one during onboarding — never enter raw hex values.
 * Each scheme is professionally designed for legibility and brand appropriateness.
 */

export interface ColorScheme {
  slug: string
  name: string
  description: string
  best_for: string
  // Core colors
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  background: string
  foreground: string
  muted: string
  mutedForeground: string
  card: string
  border: string
  // Derived for common use
  primaryLight: string    // 12% opacity primary for backgrounds
  secondaryLight: string  // 12% opacity secondary
  heroGradient: string    // gradient for hero backgrounds
}

const SCHEMES: Record<string, ColorScheme> = {
  'sage-warm': {
    slug: 'sage-warm',
    name: 'Sage Warm',
    description: 'Calm and trustworthy — best for healthcare and wellness',
    best_for: 'Healthcare, wellness, therapy, family services',
    primary: '#5a8a6a',
    primaryForeground: '#ffffff',
    secondary: '#f4a261',
    secondaryForeground: '#2c3e2d',
    background: '#f7f3ed',
    foreground: '#2c3e2d',
    muted: '#e8e2da',
    mutedForeground: '#6b7763',
    card: '#ffffff',
    border: 'rgba(90,138,106,0.15)',
    primaryLight: 'rgba(90,138,106,0.1)',
    secondaryLight: 'rgba(244,162,97,0.12)',
    heroGradient: 'linear-gradient(160deg, #2c3e2d 0%, #5a8a6a 100%)',
  },
  'sky-terra': {
    slug: 'sky-terra',
    name: 'Sky Terra',
    description: 'Friendly and approachable — best for pediatric services and childcare',
    best_for: 'Pediatric services, childcare, family activities',
    primary: '#4a90d9',
    primaryForeground: '#ffffff',
    secondary: '#c4622d',
    secondaryForeground: '#ffffff',
    background: '#faf8f3',
    foreground: '#1a2744',
    muted: '#e8f2fc',
    mutedForeground: '#5a7fa8',
    card: '#ffffff',
    border: 'rgba(74,144,217,0.15)',
    primaryLight: 'rgba(74,144,217,0.08)',
    secondaryLight: 'rgba(196,98,45,0.08)',
    heroGradient: 'linear-gradient(160deg, #1a2744 0%, #4a90d9 100%)',
  },
  'navy-gold': {
    slug: 'navy-gold',
    name: 'Navy Gold',
    description: 'Premium and established — best for education and professional services',
    best_for: 'Education, professional services, financial',
    primary: '#1a2744',
    primaryForeground: '#ffffff',
    secondary: '#c89933',
    secondaryForeground: '#1a2744',
    background: '#faf8f3',
    foreground: '#1a2744',
    muted: '#eae8e0',
    mutedForeground: '#5a5a6a',
    card: '#ffffff',
    border: 'rgba(26,39,68,0.12)',
    primaryLight: 'rgba(26,39,68,0.06)',
    secondaryLight: 'rgba(200,153,51,0.12)',
    heroGradient: 'linear-gradient(160deg, #0d1829 0%, #1a2744 100%)',
  },
  'forest-blush': {
    slug: 'forest-blush',
    name: 'Forest Blush',
    description: 'Modern and warm — best for boutiques and wellness practices',
    best_for: 'Boutiques, photography, wellness practices',
    primary: '#2d5a3d',
    primaryForeground: '#ffffff',
    secondary: '#d98a8a',
    secondaryForeground: '#1f2d1f',
    background: '#f7f5f0',
    foreground: '#1f2d1f',
    muted: '#e4e0d8',
    mutedForeground: '#636b63',
    card: '#ffffff',
    border: 'rgba(45,90,61,0.12)',
    primaryLight: 'rgba(45,90,61,0.08)',
    secondaryLight: 'rgba(217,138,138,0.12)',
    heroGradient: 'linear-gradient(160deg, #1f2d1f 0%, #2d5a3d 100%)',
  },
  'charcoal-amber': {
    slug: 'charcoal-amber',
    name: 'Charcoal Amber',
    description: 'Sophisticated and modern — best for restaurants and premium services',
    best_for: 'Restaurants, premium services, modern professional',
    primary: '#2c2c2c',
    primaryForeground: '#ffffff',
    secondary: '#e89525',
    secondaryForeground: '#2c2c2c',
    background: '#faf8f3',
    foreground: '#2c2c2c',
    muted: '#e5e2db',
    mutedForeground: '#666666',
    card: '#ffffff',
    border: 'rgba(44,44,44,0.12)',
    primaryLight: 'rgba(44,44,44,0.06)',
    secondaryLight: 'rgba(232,149,37,0.12)',
    heroGradient: 'linear-gradient(160deg, #1a1a1a 0%, #2c2c2c 100%)',
  },
}

export function getColorScheme(slug: string): ColorScheme {
  return SCHEMES[slug] ?? SCHEMES['sky-terra']
}

export function getAllColorSchemes(): ColorScheme[] {
  return Object.values(SCHEMES)
}

export { SCHEMES }
