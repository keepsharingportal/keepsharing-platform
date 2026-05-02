import { OurStorySection }       from './OurStorySection'
import { WhatsDifferentSection } from './WhatsDifferentSection'
import { FeaturesBulletsSection } from './FeaturesBulletsSection'
import { MeetTeamSection }       from './MeetTeamSection'
import { ParentsSaySection }     from './ParentsSaySection'
import { FAQSection }            from './FAQSection'
import { SpecialOfferSection }   from './SpecialOfferSection'
import type { ListingSection }   from './types'

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
    default:                 return null
  }
}
