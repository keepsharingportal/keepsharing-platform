import type { PartnerPageData } from './types'
import { hexWithOpacity } from '@/lib/brand-colors'

const PROBLEM_COPY: Record<string, { heading: string; body: string[] }> = {
  'pediatric-dentistry': {
    heading: 'First dental visits can go wrong fast.',
    body: [
      'Most practices treat children like small adults. Quick exam, sharp tools, bright lights, "be brave." The child cries. The parent feels guilty. And suddenly dental anxiety is baked in for the next twenty years.',
      'It doesn\'t have to work this way. But most practices don\'t know another way.',
      'That\'s why families who\'ve been through a bad first experience come to us specifically. Because we built this practice around the idea that the first visit shapes every dental experience that follows.',
    ],
  },
  healthcare: {
    heading: 'Finding the right practice shouldn\'t feel like guesswork.',
    body: [
      'You\'ve asked around. You\'ve searched online. You\'ve read the reviews, which all say the same things. And you still don\'t know if this is the right fit for your child.',
      'Most medical practices want your insurance card before they want to know your family.',
      'We believe you deserve better than that.',
    ],
  },
  education: {
    heading: 'Finding the right school feels overwhelming.',
    body: [
      'Every school says they\'re excellent. Every brochure uses the same words. And the stakes are too high to get this wrong.',
      'What most families discover is that the information they actually needed — about culture, about what drop-off really feels like, about whether this is a place their child will belong — isn\'t in any pamphlet.',
      'It comes from people who\'ve been there.',
    ],
  },
  'family-service': {
    heading: 'Every option looks the same until something goes wrong.',
    body: [
      'When it matters, the difference between a business that cares and one that doesn\'t becomes very clear very fast.',
      'We\'ve spent years building the kind of service families come back to — and send their friends to.',
    ],
  },
}

export function OfferProblemAgitate({ data }: { data: PartnerPageData }) {
  const { account, brand } = data
  const sub = account.subcategory ?? account.category ?? 'family-service'
  const copy = PROBLEM_COPY[sub] ?? PROBLEM_COPY[account.category ?? 'family-service'] ?? PROBLEM_COPY['family-service']

  return (
    <section style={{ backgroundColor: 'white', padding: '72px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h2 style={{
          fontFamily: 'var(--font-fraunces, serif)',
          fontSize: 'clamp(26px, 4vw, 38px)',
          fontWeight: 700,
          color: '#1a1a1a',
          lineHeight: 1.2,
          marginBottom: 28,
        }}>
          {copy.heading}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {copy.body.map((para, i) => (
            <p key={i} style={{
              fontSize: 17,
              color: i === 0 ? '#333' : '#666',
              lineHeight: 1.75,
              fontStyle: i === copy.body.length - 1 ? 'italic' : undefined,
              borderLeft: i === copy.body.length - 1 ? `3px solid ${brand.accent}` : undefined,
              paddingLeft: i === copy.body.length - 1 ? 18 : undefined,
            }}>
              {para}
            </p>
          ))}
        </div>
        <div style={{ marginTop: 40, padding: '20px 24px', borderRadius: 14, backgroundColor: hexWithOpacity(brand.primary, 0.05), border: `1px solid ${hexWithOpacity(brand.primary, 0.12)}` }}>
          <a href="#offer-form" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: brand.accent, textDecoration: 'none' }}>
            See how {account.business_name.split(' ').slice(0, 2).join(' ')} does it differently →
          </a>
        </div>
      </div>
    </section>
  )
}
