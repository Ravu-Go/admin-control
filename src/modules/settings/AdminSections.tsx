import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStaffSession } from '../../app/StaffSession';
import { canOpenRoute } from '../../app/permissions';

/** Switch between the administration areas the signed-in staff member can open. */
export function AdminSections({ current }: { current: 'access' | 'settings' }) {
  const { i18n } = useTranslation();
  const sw = i18n.language.startsWith('sw');
  const { session } = useStaffSession();
  const permissions = session?.permissions ?? [];
  const sections = [
    { key: 'access', href: '/administration/access', label: sw ? 'Watumishi na majukumu' : 'Staff & roles' },
    { key: 'settings', href: '/administration/settings', label: sw ? 'Mipangilio ya mfumo' : 'System settings' },
  ].filter(section => section.key === current || canOpenRoute(permissions, section.href));
  if (sections.length < 2) return null;
  return <nav className="admin-sections" aria-label={sw ? 'Sehemu za usimamizi' : 'Administration sections'}>
    {sections.map(section => <Link key={section.key} to={section.href} aria-current={section.key === current ? 'page' : undefined}>{section.label}</Link>)}
  </nav>;
}
