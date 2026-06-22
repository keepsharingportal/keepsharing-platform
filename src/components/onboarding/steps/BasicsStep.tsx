'use client'

// Onboarding Step 1 — Business basics.
// Fields map directly to advertiser_accounts columns:
//   business_name, address, city_state_zip, neighborhood,
//   office_phone, contact_email, website_url
// onSave fires on blur to persist a single field at a time.

import { useState, useEffect } from 'react'

type Advertiser = Record<string, unknown> & {
  business_name?:  string | null
  address?:        string | null
  city_state_zip?: string | null
  neighborhood?:   string | null
  office_phone?:   string | null
  contact_email?:  string | null
  website_url?:    string | null
}

interface Props {
  advertiser: Advertiser
  onSave:     (patch: Partial<Advertiser>) => void
}

export function BasicsStep({ advertiser, onSave }: Props) {
  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-[20px] font-bold text-portal-text">Business basics</h2>
        <p className="text-[12px] text-portal-sub mt-1">
          The essentials parents need to find and contact you. All fields save as you type.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          label="Business name *"
          value={advertiser.business_name ?? ''}
          onSave={v => onSave({ business_name: v })}
          placeholder="Confetti Cove Party Studio"
        />
        <Field
          label="Website URL"
          value={advertiser.website_url ?? ''}
          onSave={v => onSave({ website_url: v })}
          placeholder="https://yourbusiness.com"
          type="url"
        />
        <Field
          label="Phone (main)"
          value={advertiser.office_phone ?? ''}
          onSave={v => onSave({ office_phone: v })}
          placeholder="(334) 555-1234"
          type="tel"
        />
        <Field
          label="Contact email"
          value={advertiser.contact_email ?? ''}
          onSave={v => onSave({ contact_email: v })}
          placeholder="hello@yourbusiness.com"
          type="email"
        />
        <Field
          label="Street address"
          value={advertiser.address ?? ''}
          onSave={v => onSave({ address: v })}
          placeholder="500 Festival Way"
        />
        <Field
          label="City, state, ZIP"
          value={advertiser.city_state_zip ?? ''}
          onSave={v => onSave({ city_state_zip: v })}
          placeholder="Montgomery, AL 36117"
        />
        <Field
          label="Neighborhood (optional)"
          hint="Shown above the blurb on cards — helps parents identify location."
          value={advertiser.neighborhood ?? ''}
          onSave={v => onSave({ neighborhood: v })}
          placeholder="Eastdale"
        />
      </div>
    </div>
  )
}

function Field({
  label, value: initial, onSave, placeholder, type = 'text', hint,
}: {
  label:       string
  value:       string
  onSave:      (v: string) => void
  placeholder?: string
  type?:       string
  hint?:       string
}) {
  const [value, setValue] = useState(initial)
  // Sync if the parent advertiser changes (e.g. after another save).
  useEffect(() => { setValue(initial) }, [initial])
  return (
    <div>
      <label className="block text-[11px] font-bold text-portal-text mb-1">{label}</label>
      {hint && <p className="text-[10px] text-portal-sub mb-1">{hint}</p>}
      <input
        type={type}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={() => { if (value !== initial) onSave(value) }}
        placeholder={placeholder}
        className="w-full px-2.5 py-2 text-[13px] border border-portal-border-2 rounded bg-white outline-none focus:border-portal-blue"
      />
    </div>
  )
}
