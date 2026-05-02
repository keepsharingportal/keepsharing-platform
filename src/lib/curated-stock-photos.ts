/**
 * Curated Unsplash photo library for the Partner Engine.
 * Maps (category, photo_category) → Unsplash photo IDs.
 * Replace with real partner photos once available.
 * All photos are WCAG-safe, magazine-quality, diverse, not over-filtered.
 */

type PartnerCategory = 'healthcare' | 'education' | 'childcare' | 'family-service' | 'family-activities'
type PhotoCategory = 'hero' | 'team' | 'space' | 'patients_kids' | 'product' | 'mascot' | 'logo'

const CURATED: Record<PartnerCategory, Partial<Record<PhotoCategory, string[]>>> = {
  healthcare: {
    hero: [
      'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&q=80',
      'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=1200&q=80',
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=1200&q=80',
    ],
    team: [
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&q=80',
      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&q=80',
    ],
    space: [
      'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=800&q=80',
      'https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?w=800&q=80',
    ],
    patients_kids: [
      'https://images.unsplash.com/photo-1607748862156-7c548e7e98f4?w=800&q=80',
      'https://images.unsplash.com/photo-1607748851687-ba9a10438621?w=800&q=80',
      'https://images.unsplash.com/photo-1576765608622-067973a79f53?w=800&q=80',
    ],
  },
  education: {
    hero: [
      'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=80',
      'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=1200&q=80',
    ],
    team: [
      'https://images.unsplash.com/photo-1577896852905-77f3a3a34cbc?w=800&q=80',
    ],
    space: [
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
    ],
    patients_kids: [
      'https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&q=80',
      'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800&q=80',
    ],
  },
  childcare: {
    hero: [
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=1200&q=80',
      'https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=1200&q=80',
    ],
    space: [
      'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=800&q=80',
    ],
    patients_kids: [
      'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800&q=80',
      'https://images.unsplash.com/photo-1484820540004-14229fe36ca4?w=800&q=80',
    ],
  },
  'family-service': {
    hero: [
      'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=1200&q=80',
    ],
    team: [
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
    ],
    patients_kids: [
      'https://images.unsplash.com/photo-1577912931561-55a3b6b2b98f?w=800&q=80',
    ],
  },
  'family-activities': {
    hero: [
      'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=80',
    ],
    space: [
      'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800&q=80',
    ],
    patients_kids: [
      'https://images.unsplash.com/photo-1519925610903-381054cc2a1c?w=800&q=80',
    ],
  },
}

export function getCuratedPhotos(
  partnerCategory: PartnerCategory,
  photoCategory: PhotoCategory,
): string[] {
  return CURATED[partnerCategory]?.[photoCategory] ?? []
}

export function getFirstCuratedPhoto(
  partnerCategory: PartnerCategory,
  photoCategory: PhotoCategory,
  fallback = '',
): string {
  return getCuratedPhotos(partnerCategory, photoCategory)[0] ?? fallback
}
