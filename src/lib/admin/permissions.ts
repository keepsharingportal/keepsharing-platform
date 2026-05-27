// Admin-user management permission rules.
//
// Lives separately from auth.ts because these rules govern who can manage
// *other admin rows* — not "can I do X to a piece of content?" but "can I
// promote this person to editor, demote that one to publisher, suspend a
// peer?" Pulled out so the rules are inspectable in one place and easy to
// extend (e.g., per-market admin granularity later).
//
// Tier order (high → low):
//   super  >  admin  >  publisher  >  editor
//
// Core rules:
//   - Super can do anything to anyone (including other supers).
//   - Admin can manage publisher + editor rows. Admin cannot touch super
//     or other admin rows, and cannot promote anyone TO super or admin.
//   - Publisher + editor cannot manage admin users at all.
//
// Returning a reason string from the deny-path keeps API responses self-
// explanatory ("Admins can't edit other admins" beats a bare 403).

import type { AdminRole } from './auth'

const TIER: Record<AdminRole, number> = {
  super:     3,
  admin:     2,
  publisher: 1,
  editor:    0,
}

export type ManageDecision =
  | { allowed: true }
  | { allowed: false; reason: string }

/**
 * Can `actor` view the admin user management page at all? Yes for super
 * and admin; no for publisher/editor.
 */
export function canViewAdminUsers(actor: AdminRole): boolean {
  return actor === 'super' || actor === 'admin'
}

/**
 * Can `actor` create a new admin user with the given target role?
 */
export function canCreateAdminRole(actor: AdminRole, targetRole: AdminRole): ManageDecision {
  if (!canViewAdminUsers(actor)) return { allowed: false, reason: 'Settings access required' }
  if (actor === 'super') return { allowed: true }
  // actor is 'admin' here
  if (targetRole === 'super' || targetRole === 'admin') {
    return { allowed: false, reason: `Only Super Admin can create ${targetRole === 'super' ? 'Super Admins' : 'Admins'}` }
  }
  return { allowed: true }
}

/**
 * Can `actor` modify (edit/suspend/delete) an existing admin user with the
 * given current role? `isSelf` carves out self-edits — anyone can edit
 * their own profile (name, etc.) regardless of tier.
 */
export function canManageAdminRow(
  actor: AdminRole,
  targetRole: AdminRole,
  isSelf: boolean,
): ManageDecision {
  if (isSelf) return { allowed: true }
  if (!canViewAdminUsers(actor)) return { allowed: false, reason: 'Settings access required' }
  if (actor === 'super') return { allowed: true }
  // actor is 'admin'
  if (targetRole === 'super' || targetRole === 'admin') {
    return { allowed: false, reason: 'Admins cannot manage Super or Admin accounts' }
  }
  return { allowed: true }
}

/**
 * When promoting/demoting an existing row, does the actor have the headroom
 * to set the new role? Rejects any attempt to write a role that outranks
 * what the actor is allowed to create.
 */
export function canAssignRole(actor: AdminRole, newRole: AdminRole): ManageDecision {
  if (actor === 'super') return { allowed: true }
  if (actor === 'admin') {
    if (newRole === 'super' || newRole === 'admin') {
      return { allowed: false, reason: `Only Super Admin can assign the ${newRole} role` }
    }
    return { allowed: true }
  }
  return { allowed: false, reason: 'Settings access required' }
}

/**
 * Self-protect: can `actor` delete their own admin row? Always no — a
 * super-admin removing the last super-admin would lock everyone out.
 * Suspending is fine; outright deletion of self is not.
 */
export function canDeleteSelf(): boolean {
  return false
}

export function isHigherTier(a: AdminRole, b: AdminRole): boolean {
  return TIER[a] > TIER[b]
}
