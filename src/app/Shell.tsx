import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { navigation } from './navigation';
import { Icon } from '../design/Icon';
import { BrandLogo } from './BrandLogo';
import { useStaffSession } from './StaffSession';
import { signOutStaff } from '../api/staff-auth';
import { canOpenRoute } from './permissions';

export function DemoBanner({ appEnv, demoMode }: { appEnv: string; demoMode: boolean }) {
  const { t } = useTranslation();
  return appEnv !== 'production' || demoMode ? <footer className="demo-banner" role="note">{t('demo')}</footer> : null;
}

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { session, clear } = useStaffSession();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  return <aside className={`sidebar ${open ? 'is-open' : ''}`}>
    <div className="brand"><BrandLogo/><span className="brand-badge">{t('staffPortal')}</span></div>
    <nav aria-label={t('navigation')}>
      {navigation.map(({ group, items }) => <section key={group} aria-labelledby={`nav-${group}`}>
        <h2 id={`nav-${group}`} className={`nav-group group-${group}`}>{t(group)}</h2>
        {items.map(([key, href, icon, y]) => !canOpenRoute(session?.permissions ?? [], href) ? <span key={key} className="nav-item nav-disabled" aria-disabled="true" style={{ top: y }}><Icon name={icon}/><span>{t(key)}</span></span> : <NavLink key={key} to={href} end={href === '/'} onClick={onNavigate} style={{ top: y }} className={({ isActive }) => `nav-item ${isActive || key === 'administration' && pathname.startsWith('/playground') ? 'active' : ''}`}>
          <Icon name={icon}/><span>{t(key)}</span>{key === 'sos' && session && session.open_sos_count !== null && <span className="sos-count" aria-label={t('openSos', { count: session.open_sos_count })}>{session.open_sos_count}</span>}
        </NavLink>)}
      </section>)}
    </nav>
    <div className="sidebar-profile"><Icon name="shield" size={24}/><div><strong>{session?.role}</strong><small>{t('location')}</small></div></div>
    <button className="security-link" type="button" disabled={signingOut} onClick={() => { setSigningOut(true); setLogoutError(false); void signOutStaff().then(clear).catch(() => setLogoutError(true)).finally(() => setSigningOut(false)); }}><Icon name="logout"/>{t(signingOut ? 'signingOut' : 'signOut')}</button>
    {logoutError && <p role="alert" className="logout-error">{t('logoutFailed')}</p>}
    <small className="sidebar-footer">RAVU CONTROL CENTRE</small>
  </aside>;
}

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const { t, i18n } = useTranslation();
  const { session } = useStaffSession();
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key === '/' && !target?.closest('input,textarea,[contenteditable="true"]')) { event.preventDefault(); search.current?.focus(); }
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, []);
  return <header className="topbar">
    <button className="menu-button" aria-label={t('menu')} onClick={onMenu}><Icon name="menu"/></button>
    <div className="global-search"><input ref={search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('search')} aria-label={t('searchLabel')}/><kbd>/</kbd>{query.length > 0 && <div className="search-results" role="status">{t('noFeature')}</div>}</div>
    <div className="topbar-actions">
      {canOpenRoute(session?.permissions ?? [], '/sos') && <NavLink to="/sos" className="button danger topbar-sos">{session?.open_sos_count === null ? t('sos') : t('openSos', { count: session?.open_sos_count })}</NavLink>}
      <button className="language" aria-label={i18n.language === 'en' ? 'Switch to Swahili' : 'Badili kwenda Kiingereza'} onClick={() => void i18n.changeLanguage(i18n.language === 'en' ? 'sw' : 'en')}>{i18n.language === 'en' ? 'EN' : 'SW'}</button>
      <NavLink to="/account/security" className="role-chip" aria-label={t('changePassword')}><strong>{session?.role}</strong><small>{t('changePassword')}</small></NavLink>
    </div>
  </header>;
}

export function PageHeader({ title, description, children, tabs, selectedTab, onTabChange }: { title: string; description: string; children?: ReactNode; tabs?: { id: string; label: string }[]; selectedTab?: string; onTabChange?: (id: string) => void }) {
  return <div className="page-header"><div><h1>{title}</h1><p>{description}</p></div>{tabs && <div className="filter-tabs">{tabs.map(tab => <button key={tab.id} type="button" aria-pressed={selectedTab === tab.id} onClick={() => onTabChange?.(tab.id)}>{tab.label}</button>)}</div>}{children}</div>;
}

export function AppShell({ children, title, description }: { children: ReactNode; title: string; description: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useTranslation();
  return <div className="app-shell"><a className="skip-link" href="#main">{t('skip')}</a>
    <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)}/><TopBar onMenu={() => setMenuOpen(!menuOpen)}/>
    <main id="main" tabIndex={-1}><PageHeader title={title} description={description}/><div className="page-body" data-testid="playground-body">{children}</div></main>
    <DemoBanner appEnv={import.meta.env.VITE_APP_ENV || 'staging'} demoMode={import.meta.env.VITE_DEMO_MODE !== 'false'}/>
  </div>;
}
