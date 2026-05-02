export interface EmailTemplate {
  slug: string
  subject: string
  body: string
}

interface TemplateVars {
  businessName?: string | null
  contactName?: string | null
  contractExpiryDate?: string | null
}

const TEMPLATES: Record<string, EmailTemplate> = {
  'renew-contract-30day': {
    slug: 'renew-contract-30day',
    subject: 'Your River Region Parents contract — ready to renew?',
    body: `Hi [Contact Name],

Your [Business Name] advertising agreement with River Region Parents is coming up on renewal. Wanted to give you a heads up so we can lock in your spot before the deadline.

Same rate as last year, same package. I can have the new agreement over to you in 5 minutes if you're good to keep going.

Reply with a "yes" or give me a call at 334-328-5189.

Talk soon,
Jason Watson
River Region Parents`,
  },

  'check-dropbox-art': {
    slug: 'check-dropbox-art',
    subject: 'Ad artwork for River Region Parents — quick confirmation needed',
    body: `Hi [Contact Name],

Quick follow-up on your upcoming ad for River Region Parents — we have artwork in our Dropbox folder but wanted to confirm it's the final version before we send it to our designer.

Could you take 2 minutes to confirm: is the most recent file the version you want to run? Or is there an updated file coming?

Our deadline is approaching fast, so any response today is extremely helpful.

Thank you!
Jason Watson
River Region Parents`,
  },

  'send-agreement-new-advertiser': {
    slug: 'send-agreement-new-advertiser',
    subject: 'Welcome to River Region Parents — agreement ready to sign',
    body: `Hi [Contact Name],

Welcome to River Region Parents! We're excited to have [Business Name] join our partner network.

Your advertising agreement is ready and waiting for your signature. It takes about 2 minutes to review and sign digitally — no printing needed.

I'll send the agreement link in a separate email momentarily. If you have any questions on the terms or want to discuss the ad design brief, I'm at 334-328-5189 anytime this week.

Looking forward to a great partnership!
Jason Watson
River Region Parents`,
  },

  'verify-art-pre-print': {
    slug: 'verify-art-pre-print',
    subject: 'Final art confirmation — River Region Parents',
    body: `Hi [Contact Name],

We have your artwork on file for River Region Parents and are preparing to send it to our designer for the upcoming issue.

Just want to confirm: is the current file on file your final, approved version? If you'd like to make any changes before we go to print, now is the time.

Just reply here and I'll make sure we have the right version.

Thank you!
Jason Watson
River Region Parents`,
  },
}

export function getEmailTemplate(slug: string): EmailTemplate | null {
  return TEMPLATES[slug] ?? null
}

export function fillEmailTemplate(
  slug: string,
  vars: TemplateVars,
): { subject: string; body: string } | null {
  const tpl = TEMPLATES[slug]
  if (!tpl) return null

  const replace = (str: string) =>
    str
      .replace(/\[Business Name\]/g, vars.businessName ?? '[Business Name]')
      .replace(/\[Contact Name\]/g, vars.contactName ?? '[Contact Name]')
      .replace(/\[Contract Expiry\]/g, vars.contractExpiryDate ?? '[Contract Expiry]')

  return {
    subject: replace(tpl.subject),
    body: replace(tpl.body),
  }
}

export { TEMPLATES as EMAIL_TEMPLATES }
