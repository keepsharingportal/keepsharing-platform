// One renderer per section_type. ListingDetailPage walks listing_sections
// and dispatches to the matching component here. Unknown types render
// nothing rather than crash — keeps the page safe for editor-supplied
// new types until they get a renderer.

import { OurStorySection }         from './OurStorySection'
import { WhatsDifferentSection }   from './WhatsDifferentSection'
import { FeaturesBulletsSection }  from './FeaturesBulletsSection'
import { MeetTeamSection }         from './MeetTeamSection'
import { ParentsSaySection }       from './ParentsSaySection'
import { FAQSection }              from './FAQSection'
import { SpecialOfferSection }     from './SpecialOfferSection'
import { PartyPackagesSection }    from './PartyPackagesSection'
import { PartyHoursSection }       from './PartyHoursSection'
import { ThemesAvailableSection }  from './ThemesAvailableSection'
import { PartyAddOnsSection }      from './PartyAddOnsSection'
import { BestForSection }          from './BestForSection'
import { HealthSafetySection }     from './HealthSafetySection'
import { BookingNotesSection }     from './BookingNotesSection'
import type { ListingSection }     from './types'

export function SectionRenderer({ section }: { section: ListingSection }) {
  if (!section.is_active) return null
  switch (section.section_type) {
    case 'our_story':        return <OurStorySection section={section} />
    case 'whats_different':  return <WhatsDifferentSection section={section} />
    case 'features_bullets': return <FeaturesBulletsSection section={section} />
    case 'meet_team':        return <MeetTeamSection section={section} />
    case 'parents_say':      return <ParentsSaySection section={section} />
    case 'faq':              return <FAQSection section={section} />
    case 'special_offer':    return <SpecialOfferSection section={section} />
    // Birthday-rich types (also reusable by any guide whose schema lists them)
    case 'party_packages':   return <PartyPackagesSection section={section} />
    case 'party_hours':      return <PartyHoursSection section={section} />
    case 'themes_available': return <ThemesAvailableSection section={section} />
    case 'party_addons':     return <PartyAddOnsSection section={section} />
    case 'best_for':         return <BestForSection section={section} />
    case 'health_safety':    return <HealthSafetySection section={section} />
    case 'booking_notes':    return <BookingNotesSection section={section} />
    default:                 return null
  }
}
