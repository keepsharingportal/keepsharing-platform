export type DesignStatus = 'New' | 'Pick-up' | 'DropBox'
export type Stage = 'Closed Won' | 'Verbal' | 'Prospect' | 'Renewed' | 'Dropped'
export type Orientation = 'Horizontal' | 'Vertical' | 'Square'
export type SpecialPosition =
  | 'Inside Front Cover'
  | 'Inside Back Cover'
  | 'Back Cover'
  | 'First Right Hand Read'

export interface AdvertiserRecord {
  id: string
  businessName: string
  contactName: string
  publication: string        // 'RRP' | 'MBP' | 'AOP' | 'ESP' | 'GPP' | 'RRB'
  issue: string              // 'RRP MAR26'
  stage: Stage
  amount: number
  directory: boolean
  layoutNotes: string
  social: string | null
  invoiceType: 'Invoice' | 'A Check'
  designer: string
  designStatus: DesignStatus
  size: number               // 0.12, 0.16, 0.25, 0.33, 0.5, 0.66, 1, 2
  orientation: Orientation | null
  specialPosition: SpecialPosition | null
  specificMonths: string[]
  expires: string            // 'Dec26'
  description: string
}

export interface Publication {
  abbrev: string
  name: string
  market: string
  state: string
  skin: 'parenting' | 'prime'
  active: boolean
}

export interface Business {
  id: string
  name: string
  ownerName: string
  phone: string
  fax?: string
  website?: string
  email: string
  billingStreet?: string
  billingCity?: string
  billingState?: string
  billingZip?: string
  primaryPublication: string
  magazineInterest?: string
  specialMarkets: string[]
  salesRep: string
  callbackDate?: string
  notes: string
  createdAt: string
}

export interface UserProfile {
  id: string
  name: string
  role: 'super_admin' | 'publisher' | 'va' | 'driver'
  publications: string[]  // which pubs they can see
  email: string
}
