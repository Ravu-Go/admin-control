import type { StaffBootstrap } from '../api/staff-auth';

type Permission = StaffBootstrap['permissions'][number];
/** A label never grants access. These keys come from the generated API contract. */
export const routePermissions: Record<string, readonly Permission[]> = {
  '/': ['overview.read'], '/accounts': ['accounts.read'], '/verification': ['verification.read'],
  '/sos': ['sos.read'], '/trips': ['trips.read'], '/memberships': ['memberships.read'],
  '/payments': ['payments.read'], '/referrals': ['referrals.read'], '/partners': ['marketplace.read'],
  '/services': ['services.read'], '/support': ['support.read'], '/notifications': ['communications.read'],
  '/reports': ['reports.read'], '/administration': ['access.read', 'audit.read', 'settings.read', 'integrations.read'],
};
export function canOpenRoute(permissions: readonly Permission[], path: string): boolean {
  return routePermissions[path]?.some(permission => permissions.includes(permission)) ?? false;
}
