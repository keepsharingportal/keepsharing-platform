// Guide-type-aware at-a-glance fields rendered as a definition list

const FIELD_LABELS: Record<string, Record<string, string>> = {
  'private-school': {
    grade:         'Grades',
    leadership:    'Head of School',
    mission:       'Mission',
    extracurricula: 'Activities & Sports',
    other:         'Additional Details',
  },
  'childcare': {
    ages:        'Ages Served',
    hours:       'Hours',
    meals:       'Meals',
    staff_ratio: 'Staff Ratio',
    other:       'Additional Details',
  },
  'summer-camp': {
    ages:     'Ages',
    dates:    'Dates',
    cost:     'Cost',
    location: 'Location',
  },
  'healthy-kids': {
    category: 'Specialty',
    ages:     'Ages Served',
    hours:    'Hours',
  },
  'summer-fun': {
    category: 'Type',
    ages:     'Ages',
    cost:     'Cost',
  },
  'birthday-party': {
    category:    'Category',
    capacity:    'Capacity',
    price_range: 'Price Range',
  },
  'afterschool': {
    category: 'Type',
    ages:     'Ages',
    hours:    'Hours',
  },
  'special-needs': {
    category: 'Focus Area',
    ages:     'Ages Served',
  },
  'newcomer': {
    neighborhood: 'Neighborhood',
    category:     'Category',
  },
}

// Fields that always show on every guide type
const ALWAYS_SHOW = ['address', 'city_state_zip', 'phone', 'website']

interface Props {
  guideSlug: string
  guideData: Record<string, string>
  // account-level fields passed separately for always-show items
  phone?: string | null
  website?: string | null
  address?: string | null
  cityStateZip?: string | null
}

export function GuideSpecificFields({ guideSlug, guideData, phone, website, address, cityStateZip }: Props) {
  const fieldLabels = FIELD_LABELS[guideSlug] ?? {}

  const rows: { label: string; value: string }[] = []

  // Always-show from account
  if (address)      rows.push({ label: 'Address',  value: address })
  if (cityStateZip) rows.push({ label: 'Location', value: cityStateZip })
  if (phone)        rows.push({ label: 'Phone',    value: phone })
  if (website)      rows.push({ label: 'Website',  value: website })

  // Guide-specific from guide_data
  for (const [key, label] of Object.entries(fieldLabels)) {
    const val = guideData[key]
    if (val && val.trim()) rows.push({ label, value: val.trim() })
  }

  if (!rows.length) return null

  return (
    <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 24px', fontSize: 'var(--ed-text-small)', marginBottom: 'var(--ed-space-lg)' }}>
      {rows.map(({ label, value }) => (
        <>
          <dt key={`dt-${label}`} style={{ fontWeight: 700, color: 'var(--ed-text-soft)', whiteSpace: 'nowrap' }}>{label}</dt>
          <dd key={`dd-${label}`} style={{ color: 'var(--ed-text-muted)', margin: 0, lineHeight: 1.5 }}>
            {label === 'Website'
              ? <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ed-accent)', wordBreak: 'break-all' }}>{value.replace(/^https?:\/\//, '')}</a>
              : value
            }
          </dd>
        </>
      ))}
    </dl>
  )
}
