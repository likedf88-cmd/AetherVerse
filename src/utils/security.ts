/**
 * Security & Role Management Module
 * Enforces server-side role validation and immutable SUPER_ADMIN privileges.
 */

export const SUPER_ADMIN_EMAILS = [
  'cmoney20262626@gmail.com',
  'likedf88@gmail.com'
] as const;

export type UserRole = 'USER' | 'CREATOR' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';

export interface UserSession {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  isBanned?: boolean;
}

/**
 * Checks if a given email is a hardcoded SUPER_ADMIN.
 * These two accounts must always retain their highest administrative role.
 */
export function isDefaultSuperAdminEmail(email: string): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === normalized);
}

/**
 * Validates whether a user session has super admin authority.
 */
export function isSuperAdmin(session: UserSession | null | undefined): boolean {
  if (!session) return false;
  if (isDefaultSuperAdminEmail(session.email)) return true;
  return session.role === 'SUPER_ADMIN';
}

/**
 * Validates whether a user has administrative authority (ADMIN or SUPER_ADMIN).
 */
export function isAdmin(session: UserSession | null | undefined): boolean {
  if (!session) return false;
  if (isSuperAdmin(session)) return true;
  return session.role === 'ADMIN';
}

/**
 * Checks if a user is authorized to perform privileged admin actions.
 */
export function canManageRoles(session: UserSession | null | undefined): boolean {
  return isSuperAdmin(session);
}

/**
 * Checks whether a target user's role can be modified.
 * Default super admins can NEVER have their role downgraded or revoked by anyone.
 */
export function canModifyUserRole(
  actor: UserSession,
  targetEmail: string,
  newRole: UserRole
): { allowed: boolean; reason?: string } {
  if (!isSuperAdmin(actor)) {
    return { allowed: false, reason: 'Only SUPER_ADMIN can modify user roles.' };
  }

  if (isDefaultSuperAdminEmail(targetEmail) && newRole !== 'SUPER_ADMIN') {
    return {
      allowed: false,
      reason: 'Permanent SUPER_ADMIN accounts cannot have their administrative privileges revoked.'
    };
  }

  return { allowed: true };
}

/**
 * Validate username rules (3-20 characters, alphanumeric and underscores only).
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required.' };
  }
  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters long.' };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: 'Username cannot exceed 20 characters.' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores.' };
  }
  return { valid: true };
}
