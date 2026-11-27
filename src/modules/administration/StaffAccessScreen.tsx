import { ManagedUsersPanel } from './ManagedUsersPanel';
import { useEffect, useRef, useState } from 'react';
import './StaffAccessScreen.css';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { AccessRequestsPanel } from './AccessRequestsPanel';
import { StaffSessionsPanel } from './StaffSessionsPanel';
import { useTranslation } from 'react-i18next';
import { StaffAccessPage, type AccessFormCommand } from './StaffAccessPage';
import { Button, ConfirmDialog, type ConfirmedCommand } from '../../design/components';
import { Pager } from './ListToolbar';
import { CriticalActionDialog } from '../../app/CriticalActionDialog';
import { useStaffSession } from '../../app/StaffSession';
import { StaffAuthError, type StaffStepUpRequest } from '../../api/staff-auth';
import { loadAreas, loadInvitations, loadRequests, loadRoles, loadSessions, loadStaff, resendInvitation, reviewChange, revoke, submitChange, type AccessRequest, type Command, type Invitation, type Session } from '../../api/staff-admin';

type Authorization = { action: StaffStepUpRequest['action']; label: string; context: string; run: () => Promise<void>; resolve: () => void; reject: (error: Error) => void };
type Confirmation = { kind: 'review'; record: AccessRequest; decision: 'approve' | 'reject' } | { kind: 'invitation'; record: Invitation } | { kind: 'resend'; record: Invitation } | { kind: 'session'; record: Session };
export function StaffAccessScreen() {
  const { i18n } = useTranslation();
  const sw = i18n.language.startsWith('sw');
  const text = (en: string, translation: string) => sw ? translation : en;
  const { session, clear } = useStaffSession();
  const client = useQueryClient();
  const [staffPage, setStaffPage] = useState(1);
  const [requestsPage, setRequestsPage] = useState(1);
  const [invitationsPage, setInvitationsPage] = useState(1);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [search, setSearch] = useState('');
  const staffQuery = useDebounced(search);
  const [peopleSearch, setPeopleSearch] = useState('');
  const peopleQuery = useDebounced(peopleSearch);
  const [status, setStatus] = useState('');
  const [requestStatus, setRequestStatus] = useState('pending');
  const [selectedStaff, setSelectedStaff] = useState(session?.staff_id ?? '');
  const [authorization, setAuthorization] = useState<Authorization | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [mutationError, setMutationError] = useState('');
  const [notice, setNotice] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const enabled = !!session?.permissions.includes('access.read');
  const superAdmin = session?.is_super_admin === true && session.permissions.includes('access.manage') && session.permissions.includes('access.approve');
  // Search runs on the server so it covers every staff record, not just the loaded page.
  const staff = useQuery({ queryKey: ['staff-management', 'staff', staffPage, status, staffQuery], queryFn: ({ signal }) => loadStaff(staffPage, status, signal, staffQuery), enabled, retry: false, placeholderData: keepPreviousData });
  const people = useQuery({ queryKey: ['staff-management', 'session-people', peopleQuery], queryFn: ({ signal }) => loadStaff(1, '', signal, peopleQuery), enabled, retry: false, placeholderData: keepPreviousData });
  const roles = useQuery({ queryKey: ['staff-management', 'roles'], queryFn: ({ signal }) => loadRoles(signal), enabled, retry: false });
  const areas = useQuery({ queryKey: ['staff-management', 'areas'], queryFn: ({ signal }) => loadAreas(signal), enabled, retry: false });
  const requests = useQuery({ queryKey: ['staff-management', 'requests', requestsPage, requestStatus], queryFn: ({ signal }) => loadRequests(requestsPage, signal, requestStatus), enabled, retry: false });
  const pending = useQuery({ queryKey: ['staff-management', 'requests', 'pending-count'], queryFn: ({ signal }) => loadRequests(1, signal, 'pending'), enabled, retry: false });
  const invitations = useQuery({ queryKey: ['staff-management', 'invitations', invitationsPage], queryFn: ({ signal }) => loadInvitations(invitationsPage, signal), enabled, retry: false });
  const sessions = useQuery({ queryKey: ['staff-management', 'sessions', selectedStaff, sessionsPage], queryFn: ({ signal }) => loadSessions(selectedStaff, sessionsPage, signal), enabled: enabled && !!selectedStaff, retry: false });
  const errors = [staff.error, people.error, pending.error, roles.error, areas.error, requests.error, invitations.error, sessions.error];
  const expired = errors.some(error => error instanceof StaffAuthError && [401, 419].includes(error.status));
  useEffect(() => { if (expired) clear(); }, [expired, clear]);
  const explain = (error: unknown) => error instanceof StaffAuthError && error.status === 403
    ? text('Permission or approved global scope is missing. Ask an authorized administrator to review your access.', 'Ruhusa au wigo ulioidhinishwa haupo. Wasiliana na msimamizi ahakiki ufikiaji wako.')
    : error instanceof StaffAuthError && error.status === 409
      ? text('The record changed. Nothing was applied. Reload and review the latest version.', 'Rekodi imebadilika. Hakuna kilichotekelezwa. Pakia upya na uhakiki toleo jipya.')
      : text('The request could not be confirmed. No automatic retry was made. Check current status before trying again.', 'Ombi halikuthibitishwa. Halijarudiwa kiotomatiki. Hakiki hali ya sasa kabla ya kujaribu tena.');
  const reload = () => { setMutationError(''); void client.invalidateQueries({ queryKey: ['staff-management'] }); void client.invalidateQueries({ queryKey: ['managed-users'] }); };
  const authorize = (action: StaffStepUpRequest['action'], context: string, run: () => Promise<void>) => new Promise<void>((resolve, reject) => {
    setMutationError(''); setAuthorization({ action, context, run, resolve, reject, label: text('Confirm staff administration change', 'Thibitisha mabadiliko ya usimamizi wa watumishi') });
  });
  const submitForm = (values: AccessFormCommand, command: ConfirmedCommand) => {
    const payload: Command = values.kind === 'role'
      ? { kind: 'role', apply_immediately: superAdmin, ...(values.id ? { subject_id: Number(values.id), subject_version: values.version } : {}), payload: { name: { en: values.name, sw: values.nameSw }, permissions: values.permissions, enabled: values.enabled }, confirmed: true, reason: command.reason }
      : { kind: values.kind, apply_immediately: superAdmin, ...(values.kind === 'staff' ? { subject_id: Number(values.id), subject_version: values.version } : {}), payload: { name: values.name, role_id: Number(values.roleId), scope: { kind: values.scope as 'global' | 'area', area_id: values.scope === 'area' ? Number(values.areaId) : null }, ...(values.kind === 'staff' ? { status: values.status } : { email: values.email }) }, confirmed: true, reason: command.reason };
    return authorize('access.manage', JSON.stringify([values, command.idempotencyKey]), () => submitChange(payload, command.idempotencyKey));
  };
  const currentVersion = confirmation?.kind === 'review' ? requests.data?.data.find(record => record.id === confirmation.record.id)?.version
    : confirmation?.kind === 'invitation' || confirmation?.kind === 'resend' ? invitations.data?.data.find(record => record.id === confirmation.record.id)?.version
      : confirmation ? sessions.data?.data.find(record => record.id === confirmation.record.id)?.version : undefined;
  const confirm = (command: ConfirmedCommand) => {
    if (!confirmation) return Promise.reject(new Error('No selected command'));
    const selected = confirmation;
    return authorize(selected.kind === 'review' ? 'access.approve' : 'access.manage', JSON.stringify([selected.kind, selected.record.id, selected.record.version, command.idempotencyKey]), async () => {
      if (selected.kind === 'review') await reviewChange(selected.record, selected.decision, command.reason, command.idempotencyKey);
      else if (selected.kind === 'resend') await resendInvitation(selected.record, command.reason, command.idempotencyKey);
      else await revoke(selected.kind === 'invitation' ? `staff-invitations/${selected.record.id}/revoke` : `staff/${selected.record.staff_id}/sessions/${selected.record.id}/revoke`, selected.record.version, command.reason, command.idempotencyKey);
      if (mounted.current) {
        setConfirmation(null);
        setNotice(selected.kind === 'resend' ? text('Invitation resent.', 'Mwaliko umetumwa tena.') : selected.kind === 'review' ? (selected.decision === 'approve' ? text('Request approved.', 'Ombi limeidhinishwa.') : text('Request rejected.', 'Ombi limekataliwa.')) : '');
      }
    });
  };
  const pager = (page: number, last: number, setPage: (page: number) => void) => <Pager page={page} last={last} onPage={setPage} labels={{ previous: text('Previous', 'Iliyotangulia'), next: text('Next', 'Inayofuata'), page: text('Page', 'Ukurasa'), of: text('of', 'kati ya') }}/>;
  const time = (value: string) => new Intl.DateTimeFormat(sw ? 'sw-TZ' : 'en-TZ', { timeZone: 'Africa/Dar_es_Salaam', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) + ' EAT';
  const can = (permission: 'access.manage' | 'access.approve') => !!session?.permissions.includes(permission);
  const requestsPanel = <AccessRequestsPanel requests={requests} requestStatus={requestStatus} onRequestStatus={value => { setRequestStatus(value); setRequestsPage(1); }} onRequestsPage={setRequestsPage}
    invitations={invitations} onInvitationsPage={setInvitationsPage} roles={roles.data ?? []} areas={areas.data ?? []} me={session?.staff_id} superAdmin={superAdmin}
    canApprove={can('access.approve')} canManage={can('access.manage')} explain={explain} time={time}
    onReview={(record, decision) => { setNotice(''); setConfirmation({ kind: 'review', record, decision }); }}
    onResend={record => { setNotice(''); setConfirmation({ kind: 'resend', record }); }} onRevoke={record => { setNotice(''); setConfirmation({ kind: 'invitation', record }); }}/>;
  const sessionsPanel = <StaffSessionsPanel people={people} peopleQuery={peopleSearch} onPeopleQuery={setPeopleSearch} searching={people.isFetching} me={session?.staff_id}
    selected={selectedStaff} onSelect={id => { setSelectedStaff(id); setSessionsPage(1); }} sessions={sessions} onSessionsPage={setSessionsPage}
    canManage={can('access.manage')} onRevoke={record => { setNotice(''); setConfirmation({ kind: 'session', record }); }} explain={explain} time={time}/>;
  return <>{notice && <p className="access-notice" role="status">{notice}</p>}{mutationError && <div className="access-notice" role="alert">{mutationError}<Button kind="secondary" onClick={reload}>{text('Reload current status', 'Pakia hali ya sasa')}</Button></div>}
    <StaffAccessPage isSuperAdmin={superAdmin} pendingRequests={pending.data?.total || undefined} users={<ManagedUsersPanel areas={areas.data ?? []} superAdmin={superAdmin} canRequest={can('access.manage')} pendingClosures={new Set(pending.data?.data.filter(record => record.kind === 'account_closure').map(record => record.subject_id ?? '') ?? [])} authorize={(context, run) => authorize('access.manage', context, run)}/>} staff={staff.data?.data ?? []} roles={roles.data ?? []} permissions={session?.permissions ?? []} capabilities={Array.from(new Set(roles.data?.flatMap(role => role.permissions) ?? [])).sort()} areas={areas.data ?? []} loading={enabled && (staff.isPending || roles.isPending || areas.isPending)} error={staff.error || roles.error || areas.error ? explain(staff.error ?? roles.error ?? areas.error) : undefined} onReload={reload} onRequestChange={submitForm} totalStaff={staff.data?.total}
      staffSearch={{ value: search, onChange: value => { setSearch(value); setStaffPage(1); }, searching: staff.isFetching && search.trim() !== staffQuery.trim() }} staffStatus={{ value: status, onChange: value => { setStatus(value); setStaffPage(1); } }} pagination={staff.data ? pager(staff.data.page, staff.data.lastPage, setStaffPage) : undefined} requests={requestsPanel} sessions={sessionsPanel}/>
    {confirmation && <ConfirmDialog title={confirmation.kind === 'resend' ? text('Resend invitation', 'Tuma mwaliko tena') : text('Confirm administration request', 'Thibitisha ombi la usimamizi')} version={confirmation.record.version} currentVersion={currentVersion ?? -1} canConfirm onCancel={() => setConfirmation(null)} onConfirm={confirm}/>}
    {authorization && <CriticalActionDialog action={authorization.action} contextKey={authorization.context} actionLabel={authorization.label} onCancel={() => { authorization.reject(new Error('Cancelled')); setAuthorization(null); }} onVerified={() => { const pending = authorization; setAuthorization(null); void pending.run().then(() => { if (mounted.current) { pending.resolve(); reload(); } }).catch(error => { if (mounted.current) { setMutationError(explain(error)); if (error instanceof StaffAuthError && [401, 419].includes(error.status)) clear(); pending.reject(error instanceof Error ? error : new Error('Request failed')); } }); }}/>}</>;
}

/** Waits for typing to pause before the value is sent to the server. */
function useDebounced(value: string, delay = 250) {
  const [settled, setSettled] = useState(value);
  useEffect(() => { const timer = window.setTimeout(() => setSettled(value), delay); return () => window.clearTimeout(timer); }, [value, delay]);
  return settled;
}
