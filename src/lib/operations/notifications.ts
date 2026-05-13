// src/lib/operations/notifications.ts
// Operation event types and lightweight dispatch hook.
//
// Architecture:
// - If OPERATIONS_WEBHOOK_URL env var is set, POSTs event payload to that URL.
//   Wire this to a GHL workflow trigger or internal Slack/email endpoint.
// - Always logs to server console for observability (visible in Vercel logs).
// - Never throws — dispatch is best-effort and must not block the main workflow.
//
// To activate email/SMS notifications:
// 1. Create a GHL workflow that accepts a webhook trigger
// 2. Set OPERATIONS_WEBHOOK_URL in Vercel env vars
// 3. Map event.type to GHL workflow actions inside GHL

export type OperationEventType =
  | 'submission_received'        // new submission landed in the queue
  | 'submission_stalled'         // submission hasn't moved past threshold
  | 'submission_needs_info'      // AI flagged missing required fields
  | 'approval_pending'           // editorial item waiting >threshold in ai-draft-ready
  | 'asset_missing'              // submission approved but no photo linked
  | 'asset_design_needed'        // asset needs Canva/design work
  | 'advertiser_renewal_due'     // contract end date within warning window
  | 'advertiser_onboarding_stuck'// advertiser stuck in onboarding >14 days
  | 'advertiser_at_risk'         // advertiser flagged at-risk of churn
  | 'social_queue_ready'         // social items approved and ready to export
  | 'newsletter_ready_to_export' // newsletter items assembled and ready
  | 'ff_deadline_approaching'    // Family Favorites phase deadline within 7 days
  | 'ai_task_needs_review'       // AI task completed but not yet human-reviewed

export interface OperationEvent {
  type:         OperationEventType
  entityId?:    string              // DB row ID of the affected entity
  entityLabel?: string              // human-readable name (business, person, title)
  role?:        string              // which role should act ('va', 'editor', etc.)
  urgency?:     'low' | 'normal' | 'high'
  meta?:        Record<string, string | number | boolean | null>
}

interface DispatchPayload extends OperationEvent {
  timestamp: string
  source:    string
}

/**
 * Dispatch an operation event.
 * Fires a GHL webhook if OPERATIONS_WEBHOOK_URL is configured.
 * Always logs to console. Never throws.
 */
export async function dispatchOperationEvent(event: OperationEvent): Promise<void> {
  const webhookUrl = process.env.OPERATIONS_WEBHOOK_URL

  const payload: DispatchPayload = {
    ...event,
    timestamp: new Date().toISOString(),
    source:    'keepsharing-platform',
  }

  console.log('[ops-event]', JSON.stringify(payload))

  if (!webhookUrl) return

  try {
    await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
  } catch (err) {
    console.warn('[ops-event] webhook dispatch failed:', err)
  }
}

/**
 * Batch dispatch: fire multiple events in parallel.
 * Use when an action triggers several downstream notifications.
 * Never throws — individual failures are swallowed and logged.
 */
export async function dispatchOperationEvents(events: OperationEvent[]): Promise<void> {
  await Promise.allSettled(events.map(dispatchOperationEvent))
}

/**
 * Build a plain-text summary of an operation event.
 * Useful for pasting as a CRM note or internal Slack message.
 */
export function formatEventSummary(event: OperationEvent): string {
  const lines: string[] = [
    `[${event.type.replace(/_/g, ' ').toUpperCase()}]`,
  ]
  if (event.entityLabel) lines.push(`Entity: ${event.entityLabel}`)
  if (event.role)        lines.push(`Owner: ${event.role}`)
  if (event.urgency)     lines.push(`Urgency: ${event.urgency}`)
  lines.push(`Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}`)
  return lines.join('\n')
}

// ── Convenience wrappers ──────────────────────────────────────────────────────
// Use these in server actions and API routes to keep call sites clean.

export const notify = {
  submissionReceived: (id: string, label: string) =>
    dispatchOperationEvent({ type: 'submission_received', entityId: id, entityLabel: label, role: 'va', urgency: 'normal' }),

  submissionStalled: (id: string, label: string, status: string, hoursStalled: number) =>
    dispatchOperationEvent({ type: 'submission_stalled', entityId: id, entityLabel: label, urgency: hoursStalled > 96 ? 'high' : 'normal', meta: { status, hoursStalled } }),

  submissionNeedsInfo: (id: string, label: string) =>
    dispatchOperationEvent({ type: 'submission_needs_info', entityId: id, entityLabel: label, role: 'va', urgency: 'normal' }),

  approvalPending: (id: string, label: string) =>
    dispatchOperationEvent({ type: 'approval_pending', entityId: id, entityLabel: label, role: 'editor', urgency: 'normal' }),

  assetMissing: (submissionId: string, label: string) =>
    dispatchOperationEvent({ type: 'asset_missing', entityId: submissionId, entityLabel: label, role: 'va', urgency: 'normal' }),

  advertiserRenewalDue: (advertiserId: string, businessName: string, daysUntil: number) =>
    dispatchOperationEvent({ type: 'advertiser_renewal_due', entityId: advertiserId, entityLabel: businessName, role: 'jason', urgency: daysUntil <= 30 ? 'high' : 'normal', meta: { daysUntil } }),

  advertiserAtRisk: (advertiserId: string, businessName: string) =>
    dispatchOperationEvent({ type: 'advertiser_at_risk', entityId: advertiserId, entityLabel: businessName, role: 'jason', urgency: 'high' }),

  socialQueueReady: (count: number) =>
    dispatchOperationEvent({ type: 'social_queue_ready', role: 'publisher', urgency: 'low', meta: { count } }),

  newsletterReady: (count: number) =>
    dispatchOperationEvent({ type: 'newsletter_ready_to_export', role: 'publisher', urgency: 'normal', meta: { count } }),

  ffDeadlineApproaching: (phase: string, daysUntil: number) =>
    dispatchOperationEvent({ type: 'ff_deadline_approaching', role: 'jason', urgency: daysUntil <= 3 ? 'high' : 'normal', meta: { phase, daysUntil } }),

  aiTaskNeedsReview: (taskId: string) =>
    dispatchOperationEvent({ type: 'ai_task_needs_review', entityId: taskId, role: 'editor', urgency: 'normal' }),
}
