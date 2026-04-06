export type UserRole = 'super_admin' | 'club_admin' | 'coach' | 'player';

export const ROLE_HIERARCHY: UserRole[] = ['player', 'coach', 'club_admin', 'super_admin'];

export function roleAtLeast(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}
