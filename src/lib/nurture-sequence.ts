/**
 * 14-day RRP-branded nurture sequence enrollment via GHL workflow.
 * GHL_NURTURE_WORKFLOW_ID set in .env.local by Jason once workflow is created in GHL.
 * If not set, logs as pending_workflow_id (established pattern from existing GHL integration).
 */

import { addToWorkflow } from './ghl'

export async function enrollInNurtureSequence(
  contactId: string,
  publicationSlug = 'rrp',
): Promise<{ success: boolean; pending?: boolean; error?: string }> {
  const workflowId = process.env.GHL_NURTURE_WORKFLOW_ID

  if (!workflowId) {
    console.error('[nurture-sequence] GHL_NURTURE_WORKFLOW_ID not set — lead queued for manual enrollment. contactId:', contactId)
    return { success: false, pending: true, error: 'pending_workflow_id' }
  }

  try {
    await addToWorkflow(contactId, workflowId, publicationSlug)
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}
