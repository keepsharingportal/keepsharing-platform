import type { PartnerPageData } from './types'

export function PartnerSEO({ data }: { data: PartnerPageData }) {
  const { account, offer, locations, testimonials } = data
  const primary = locations.find(l => l.is_primary) ?? locations[0]
  const avgRating = testimonials.length
    ? Math.round((testimonials.reduce((s, t) => s + (t.rating ?? 5), 0) / testimonials.length) * 10) / 10
    : null

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': account.category === 'healthcare' ? 'Dentist' : account.category === 'education' ? 'School' : 'LocalBusiness',
    name: account.business_name,
    url: `https://www.riverregionparents.com/partners/${account.slug}`,
    telephone: account.contact_phone ?? undefined,
    address: primary ? {
      '@type': 'PostalAddress',
      streetAddress: primary.address_line_1 ?? undefined,
      addressLocality: primary.city ?? 'Montgomery',
      addressRegion: primary.state ?? 'AL',
      postalCode: primary.zip ?? undefined,
      addressCountry: 'US',
    } : undefined,
    ...(avgRating ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: avgRating,
        reviewCount: testimonials.length,
        bestRating: 5,
      },
    } : {}),
    ...(data.faqs.length ? {
      mainEntity: data.faqs.map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    } : {}),
  }

  if (offer) {
    schema.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: offer.offer_headline,
      description: offer.offer_value_statement,
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 0) }}
    />
  )
}
