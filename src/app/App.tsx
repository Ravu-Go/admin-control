import { AccountsScreen, AccountReviewScreen } from '../modules/accounts/AccountsScreen';
import { SettingsPage } from '../modules/settings/SettingsPage';
import { AuditLogScreen } from '../modules/audit/AuditLogScreen';
import { AdminSections } from '../modules/settings/AdminSections';
import { useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { AppShell } from './Shell';
import { Button, BilingualPreview, ConfirmDialog, EvidencePanel, KeyboardHints, KpiCard, MaskedField, Panel, StatusBadge, Timeline } from '../design/components';
import { DataTable } from '../design/DataTable';
import { ConnectionLostState, EmptyState, LoadingState, PermissionState } from '../design/States';
import { exampleRecords, exampleTimeline } from './fixtures';
import { LoginPage, safeReturnPath } from './LoginPage';
import { useStaffSession } from './StaffSession';
import { PasswordChange } from './PasswordChange';
import { IdentityVerificationDialog } from '../design/IdentityVerificationDialog';
import { canOpenRoute, routePermissions } from './permissions';
import { StaffAccessScreen } from '../modules/administration/StaffAccessScreen';
import { OverviewScreen } from '../modules/overview/OverviewScreen';
import { AcceptStaffInvitation } from '../modules/administration/AcceptStaffInvitation';

function ReauthenticationPreview() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  return <Panel title={t('reauthPreview')} description={t('reauthPreviewCopy')}>
    <Button onClick={() => { setNotice(''); setOpen(true); }}>{t('reauthPreview')}</Button>
    {notice && <p role="status">{notice}</p>}
    {open && <IdentityVerificationDialog preview contextKey="fictional-preview" canVerify deadline={Infinity}
      actionLabel={t('reauthPreview')} verify={async () => {}} onCancel={() => setOpen(false)}
      onVerified={() => { setNotice(t('savedPreview')); setOpen(false); }}/>}
  </Panel>;
}

function SecurityPage() {
  const { t } = useTranslation();
  const { clear } = useStaffSession();
  return <Panel title={t('changePassword')}><PasswordChange onChanged={clear} onExpired={clear}/></Panel>;
}

function Playground() {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState('');
  const columns: ColumnDef<(typeof exampleRecords)[number]>[] = [
    { accessorKey: 'name', header: t('name') },
    { accessorKey: 'status', header: t('status'), cell: ({ row }) => <StatusBadge status={row.original.status} label={t(row.original.status === 'success' ? 'verified' : 'pending')}/> },
  ];
  return <>
    <div className="preview-intro"><strong>{t('preview')}</strong><p>{t('previewNote')}</p><Link to="/playground/states">A28 · {t('states')}</Link></div>
    <div className="playground-grid">
      <KpiCard label={t('componentTable')} value={null} detail={t('noFakeTotals')} context={t('preview')}/>
      <Panel title={t('confirmTitle')}><Button onClick={() => setConfirming(true)}>{t('previewConfirm')}</Button>{notice && <p role="status">{notice}</p>}<KeyboardHints hints={[{ keys: '/', action: t('searchLabel') }, { keys: 'Esc', action: t('cancel') }, { keys: 'Ctrl+Enter', action: t('confirm') }]}/></Panel>
      <Panel title={t('componentTable')}><DataTable rows={exampleRecords} columns={columns} previousTimestamp="10 Oct 2026, 09:40 EAT"/></Panel>
      <Panel title={t('masked')}><MaskedField label={t('contact')} maskedValue="+255 *** *** 014" version={1} currentVersion={1}/></Panel>
      <Panel title={t('timeline')}><Timeline items={exampleTimeline.map(item => ({ ...item, title: t('exampleReceived'), detail: t('exampleQueued') }))}/></Panel>
      <EvidencePanel label="DEMO-014"/>
      <Panel title={t('bilingual')}><BilingualPreview copy={{ en: 'This is a fictional message preview.', sw: 'Huu ni mfano wa ujumbe wa kubuni.' }} reviews={{ en: false, sw: false }}/></Panel>
    </div>
    {confirming && <ConfirmDialog title={t('previewConfirm')} version={1} currentVersion={1} canConfirm onCancel={() => setConfirming(false)} onConfirm={async () => { setNotice(t('savedPreview')); setConfirming(false); }}/ >}
  </>;
}
function StatesPlayground() {
  const { t } = useTranslation();
  const [notice, setNotice] = useState('');
  const preview = () => setNotice(t('savedPreview'));
  return <><div className="states-grid"><EmptyState onClear={preview}/><LoadingState previousTimestamp="09:40 EAT"/><ConnectionLostState draftRetained={false} onReconnect={preview}/><PermissionState onRequest={preview} onReload={preview}/></div>{notice && <p role="status">{notice}</p>}</>;
}
function NotConnected() {
  const { t } = useTranslation();
  return <Panel title={t('noFeature')} description={t('noFeatureCopy')}><Link className="button secondary" to="/">{t('returnPreview')}</Link></Panel>;
}
function AccessDenied() {
  const { t } = useTranslation();
  const { refresh } = useStaffSession();
  return <Panel title={t('permissionDenied')}><Button kind="secondary" onClick={() => void refresh()}>{t('reloadPermissions')}</Button></Panel>;
}
export function App() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { session, checking } = useStaffSession();
  if (pathname === '/accept-invitation') return <AcceptStaffInvitation/>;
  if (pathname === '/login') return <LoginPage/>;
  if (checking) return <div className="session-check" role="status">{t('checkingSession')}</div>;
  if (!session) return <Navigate to="/login" replace state={{ returnTo: safeReturnPath(pathname) }}/>;
  const states = pathname === '/playground/states';
  const denied = pathname in routePermissions && !canOpenRoute(session.permissions, pathname);
  if (import.meta.env.VITE_APP_ENV === 'production' && import.meta.env.VITE_DEMO_MODE === 'false') return <main className="production-gate"><h1>Ravu</h1><p>{t('noFeature')}</p></main>;
  if (pathname === '/administration/settings') return <AppShell title={t('administration')} description="" hideHeader><AdminSections current="settings"/>{denied ? <AccessDenied/> : <SettingsPage/>}</AppShell>;
  if (pathname === '/administration/audit') return <AppShell title={t('administration')} description="" hideHeader><AdminSections current="audit"/>{denied ? <AccessDenied/> : <AuditLogScreen/>}</AppShell>;
  if (pathname === '/administration' || pathname === '/administration/access') return <AppShell title={t('administration')} description="" hideHeader><AdminSections current="access"/><StaffAccessScreen/></AppShell>;
  return <AppShell title={t(pathname === '/account/security' ? 'changePassword' : states ? 'states' : 'welcome')} description={t(states ? 'statesSubtitle' : 'subtitle')} bodyLayout={pathname.startsWith('/accounts') ? 'accounts' : 'default'} hideHeader={(pathname === '/' && session.enabled_features.includes('overview')) || pathname.startsWith('/accounts')}>{denied ? <AccessDenied/> : <Routes><Route path="/" element={session.enabled_features.includes('overview') ? <OverviewScreen/> : <Playground/>}/><Route path="/accounts" element={<AccountsScreen/>}/><Route path="/accounts/:accountId" element={session.permissions.includes('accounts.read') ? <AccountReviewScreen/> : <AccessDenied/>}/><Route path="/account/security" element={<SecurityPage/>}/><Route path="/playground/states" element={<StatesPlayground/>}/><Route path="/playground/reauthentication" element={import.meta.env.VITE_APP_ENV !== 'production' ? <ReauthenticationPreview/> : <NotConnected/>}/><Route path="*" element={<NotConnected/>}/></Routes>}</AppShell>;
}
