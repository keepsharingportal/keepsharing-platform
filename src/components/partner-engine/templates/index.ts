import { ConsultBookingFunnel } from './ConsultBookingFunnel'
import { GiveawayFunnel } from './GiveawayFunnel'
import { LeadMagnetFunnel } from './LeadMagnetFunnel'
import type { ConsultBookingFunnelProps } from './ConsultBookingFunnel'
import type { GiveawayFunnelProps } from './GiveawayFunnel'
import type { LeadMagnetFunnelProps } from './LeadMagnetFunnel'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = React.ComponentType<any>

export interface TemplateDefinition {
  component: AnyComponent
  name: string
  description: string
  best_for: string[]
}

export const TEMPLATE_REGISTRY: Record<string, TemplateDefinition> = {
  'consult-booking': {
    component: ConsultBookingFunnel,
    name: 'The Trusted Consultation Page',
    description: 'A focused, fear-reducing page that converts anxious prospects into booked consultations. Best for healthcare, services, and businesses where parents need reassurance before booking.',
    best_for: ['healthcare', 'family-service', 'education', 'professional-services'],
  },
  'giveaway': {
    component: GiveawayFunnel,
    name: 'The Community Giveaway Page',
    description: 'A high-conversion giveaway page that builds your list while building your community. Perfect for events, prize promotions, and seasonal campaigns.',
    best_for: ['events', 'family-activities', 'community-building'],
  },
  'lead-magnet': {
    component: LeadMagnetFunnel,
    name: 'The Free Resource Page',
    description: 'A clean lead-capture page where prospects exchange their email for a valuable resource. Best for building email lists and nurturing prospects over time.',
    best_for: ['list-building', 'cold-traffic', 'media'],
  },
}

export function getTemplate(slug: string): TemplateDefinition {
  return TEMPLATE_REGISTRY[slug] ?? TEMPLATE_REGISTRY['consult-booking']
}

export { ConsultBookingFunnel, GiveawayFunnel, LeadMagnetFunnel }
export type { ConsultBookingFunnelProps, GiveawayFunnelProps, LeadMagnetFunnelProps }
