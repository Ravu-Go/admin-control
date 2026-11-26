import { ManagedUsersPanel } from './ManagedUsersPanel';
import { useEffect, useRef, useState } from 'react';
import './StaffAccessScreen.css';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StaffAccessPage, type AccessFormCommand } from './StaffAccessPage';
import { Button, ConfirmDialog, Panel, StatusBadge, type ConfirmedCommand } from '../../design/components';
import { CriticalActionDialog } from '../../app/CriticalActionDialog';
import { useStaffSession } from '../../app/StaffSession';
import { StaffAuthError, type StaffStepUpRequest } from '../../api/staff-auth';
import { loadAreas, loadInvitations, loadRequests, loadRoles, loadSessions, loadStaff, reviewChange, revoke, submitChange, type AccessRequest, type Command, type Invitation, type Session } from '../../api/staff-admin';

type Authorization = { action: StaffStepUpRequest['action']; label: string; context: string; run: () => Promise<void>; resolve: () => void; reject: (error: Error) => void };
type Confirmation = { kind: 'review'; record: AccessRequest; decision: 'approve' | 'reject' } | { kind: 'invitation'; record: Invitation } | { kind: 'session'; record: Session };
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
  const [status, setStatus] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(session?.staff_id ?? '');
  const [authorization, setAuthorization] = useState<Authorization | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [mutationError, setMutationError] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const enabled = !!session?.permissions.includes('access.read');
  const superAdmin = session?.is_super_admin === true && session.permissions.includes('access.manage') && session.permissions.includes('access.approve');
  const staff = useQuery({ queryKey: ['staff-management', 'staff', staffPage, status], queryFn: ({ signal }) => loadStaff(staffPage, status, signal), enabled, retry: false });
  const roles = useQuery({ queryKey: ['staff-management', 'roles'], queryFn: ({ signal }) => loadRoles(signal), enabled, retry: false });
  const areas = useQuery({ queryKey: ['staff-management', 'areas'], queryFn: ({ signal }) => loadAreas(signal), enabled, retry: false });
  const requests = useQuery({ queryKey: ['staff-management', 'requests', requestsPage], queryFn: ({ signal }) => loadRequests(requestsPage, signal), enabled, retry: false });
  const invitations = useQuery({ queryKey: ['staff-management', 'invitations', invitationsPage], queryFn: ({ signal }) => loadInvitations(invitationsPage, signal), enabled, retry: false });
  const sessions = useQuery({ queryKey: ['staff-management', 'sessions', selectedStaff, sessionsPage], queryFn: ({ signal }) => loadSessions(selectedStaff, sessionsPage, signal), enabled: enabled && !!selectedStaff, retry: false });
  const errors = [staff.error, roles.error, areas.error, requests.error, invitations.error, sessions.error];
  const expired = errors.some(error => error instanceof StaffAuthError && [401, 419].includes(error.status));
  useEffect(() => { if (expired) clear(); }, [expired, clear]);
  const explain = (error: unknown) => error instanceof StaffAuthError && error.status === 403
    ? text('Permission or approved global scope is missing. Ask an authorized administrator to review your access.', 'Ruhusa au wigo ulioidhinishwa haupo. Wasiliana na msimamizi ahakiki ufikiaji wako.')
    : error instanceof StaffAuthError && error.status === 409
      ? text('The record changed. Nothing was applied. Reload and review the latest version.', 'Rekodi imebadilika. Hakuna kilichotekelezwa. Pakia upya na uhakiki toleo jipya.')
      : text('The request could not be confirmed. No automatic retry was made. Check current status before trying again.', 'Ombi halikuthibitishwa. Halijarudiwa kiotomatiki. Hakiki hali ya sasa kabla ya kujaribu tena.');
  const reload = () => { setMutationError(''); void client.invalidateQueries({ queryKey: ['staff-management'] }); };
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
    : confirmation?.kind === 'invitation' ? invitations.data?.data.find(record => record.id === confirmation.record.id)?.version
      : confirmation ? sessions.data?.data.find(record => record.id === confirmation.record.id)?.version : undefined;
  const confirm = (command: ConfirmedCommand) => {
    if (!confirmation) return Promise.reject(new Error('No selected command'));
    const selected = confirmation;
    return authorize(selected.kind === 'review' ? 'access.approve' : 'access.manage', JSON.stringify([selected.kind, selected.record.id, selected.record.version, command.idempotencyKey]), async () => {
      if (selected.kind === 'review') await reviewChange(selected.record, selected.decision, command.reason, command.idempotencyKey);
      else await revoke(selected.kind === 'invitation' ? `staff-invitations/${selected.record.id}/revoke` : `staff/${selected.record.staff_id}/sessions/${selected.record.id}/revoke`, selected.record.version, command.reason, command.idempotencyKey);
      if (mounted.current) setConfirmation(null);
    });
  };
  const pager = (page: number, last: number, setPage: (page: number) => void) => <div className="dialog-actions"><Button kind="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>{text('Previous', 'Iliyotangulia')}</Button><span>{page} / {last}</span><Button kind="secondary" disabled={page >= last} onClick={() => setPage(page + 1)}>{text('Next', 'Inayofuata')}</Button></div>;
  const time = (value: string) => new Intl.DateTimeFormat(sw ? 'sw-TZ' : 'en-TZ', { timeZone: 'Africa/Dar_es_Salaam', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) + ' EAT';
  const requestsPanel = <><Panel title={text('Access requests', 'Maombi ya ufikiaji')}>
    {requests.isPending ? <p role="status">{text('Loading…', 'Inapakia…')}</p> : requests.error ? <p role="alert">{explain(requests.error)}</p> : <>{requests.data?.data.length === 0 && <p>{text('No access requests.', 'Hakuna maombi ya ufikiaji.')}</p>}{requests.data?.data.map(record => <article className="access-request" key={record.id}>
      <div><strong>{record.summary.name}</strong><p>{record.kind} · {record.summary.email_masked ?? record.subject_id ?? '—'}</p><StatusBadge status={record.status === 'approved' ? 'success' : record.status === 'rejected' ? 'danger' : 'pending'} label={record.status}/><p>{record.summary.scope?.kind === 'global' ? text('All operations', 'Shughuli zote') : record.summary.scope?.area_id ? `${text('Operating area', 'Eneo la shughuli')}: ${areas.data?.find(area => area.id === String(record.summary.scope?.area_id))?.label ?? record.summary.scope.area_id}` : ''}</p>
        {record.summary.role_id && <p>{roles.data?.find(role => role.id === record.summary.role_id)?.name ?? record.summary.role_id}</p>}{record.summary.permissions && <details><summary>{text('Proposed permissions', 'Ruhusa zinazopendekezwa')}</summary><ul>{record.summary.permissions.map(permission => <li key={permission}>{permission}</li>)}</ul><p>{text('Enable after approval', 'Wezesha baada ya idhini')}: {String(record.summary.enabled)}</p></details>}<p>{record.reason}</p><small>{time(record.created_at)}</small></div>
      {record.status === 'pending' && <div className="dialog-actions"><Button disabled={!session?.permissions.includes('access.approve') || (record.requested_by === session.staff_id && !superAdmin)} onClick={() => setConfirmation({ kind: 'review', record, decision: 'approve' })}>{text('Approve…', 'Idhinisha…')}</Button><Button kind="danger" disabled={!session?.permissions.includes('access.approve') || (record.requested_by === session.staff_id && !superAdmin)} onClick={() => setConfirmation({ kind: 'review', record, decision: 'reject' })}>{text('Reject…', 'Kataa…')}</Button>{record.requested_by === session?.staff_id && !superAdmin && <small>{text('Another administrator must review your request.', 'Msimamizi mwingine lazima ahakiki ombi lako.')}</small>}</div>}
    </article>)}{requests.data && pager(requests.data.page, requests.data.lastPage, setRequestsPage)}</>}
  </Panel><Panel title={text('Staff invitations', 'Mialiko ya watumishi')}>{invitations.isPending ? <p role="status">{text('Loading…', 'Inapakia…')}</p> : invitations.error ? <p role="alert">{explain(invitations.error)}</p> : <>{invitations.data?.data.length === 0 && <p>{text('No staff invitations.', 'Hakuna mialiko ya watumishi.')}</p>}{invitations.data?.data.map(record => <article className="access-request" key={record.id}><div><strong>{record.email_masked}</strong><p>{record.status} · {time(record.expires_at)}</p></div><Button kind="danger" disabled={record.status !== 'pending' || !session?.permissions.includes('access.manage')} onClick={() => setConfirmation({ kind: 'invitation', record })}>{text('Revoke…', 'Batilisha…')}</Button></article>)}{invitations.data && pager(invitations.data.page, invitations.data.lastPage, setInvitationsPage)}</>}</Panel></>;
  const sessionsPanel = <Panel title={text('Staff sessions', 'Vipindi vya watumishi')}><label>{text('Find staff', 'Tafuta mtumishi')}<input type="search" value={search} onChange={event => setSearch(event.target.value)}/></label><label>{text('Staff member', 'Mtumishi')}<select value={selectedStaff} onChange={event => { setSelectedStaff(event.target.value); setSessionsPage(1); }}><option value={session?.staff_id}>{text('My sessions', 'Vipindi vyangu')}</option>{staff.data?.data.filter(row => row.id !== session?.staff_id && row.display_name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(row => <option key={row.id} value={row.id}>{row.display_name} · {row.email_masked}</option>)}</select></label>
    {sessions.isPending ? <p role="status">{text('Loading…', 'Inapakia…')}</p> : sessions.error ? <p role="alert">{explain(sessions.error)}</p> : <>{sessions.data?.data.length === 0 && <p>{text('No sessions.', 'Hakuna vipindi.')}</p>}{sessions.data?.data.map(record => <article className="access-request" key={record.id}><div><strong>{text('Session', 'Kipindi')} {record.id}</strong><p>{time(record.last_activity_at)} · {record.revoked ? text('Revoked', 'Kimebatilishwa') : text('Not revoked', 'Hakijabatilishwa')}</p>{record.current && <small>{text('Current session — use Sign out to end it.', 'Kipindi cha sasa — tumia Ondoka kukimaliza.')}</small>}</div><Button kind="danger" disabled={record.current || record.revoked || !session?.permissions.includes('access.manage')} onClick={() => setConfirmation({ kind: 'session', record })}>{text('Revoke…', 'Batilisha…')}</Button></article>)}{sessions.data && pager(sessions.data.page, sessions.data.lastPage, setSessionsPage)}</>}
  </Panel>;
  return <>{mutationError && <div className="access-notice" role="alert">{mutationError}<Button kind="secondary" onClick={reload}>{text('Reload current status', 'Pakia hali ya sasa')}</Button></div>}
    <StaffAccessPage isSuperAdmin={superAdmin} users={superAdmin ? <ManagedUsersPanel areas={areas.data ?? []} authorize={(context, run) => authorize('access.manage', context, run)}/> : undefined} staff={staff.data?.data ?? []} roles={roles.data ?? []} permissions={session?.permissions ?? []} capabilities={Array.from(new Set(roles.data?.flatMap(role => role.permissions) ?? [])).sort()} areas={areas.data ?? []} loading={enabled && (staff.isPending || roles.isPending || areas.isPending)} error={staff.error || roles.error || areas.error ? explain(staff.error ?? roles.error ?? areas.error) : undefined} onReload={reload} onRequestChange={submitForm} staffFilters={<label>{text('Access status', 'Hali ya ufikiaji')}<select value={status} onChange={event => { setStatus(event.target.value); setStaffPage(1); }}><option value="">{text('All staff', 'Watumishi wote')}</option><option value="active">{text('Active', 'Hai')}</option><option value="suspended">{text('Suspended', 'Amesimamishwa')}</option></select></label>} totalStaff={staff.data?.total} onSearch={setSearch} pagination={staff.data ? pager(staff.data.page, staff.data.lastPage, setStaffPage) : undefined} requests={requestsPanel} sessions={sessionsPanel}/>
    {confirmation && <ConfirmDialog title={text('Confirm administration request', 'Thibitisha ombi la usimamizi')} version={confirmation.record.version} currentVersion={currentVersion ?? -1} canConfirm onCancel={() => setConfirmation(null)} onConfirm={confirm}/>}
    {authorization && <CriticalActionDialog action={authorization.action} contextKey={authorization.context} actionLabel={authorization.label} onCancel={() => { authorization.reject(new Error('Cancelled')); setAuthorization(null); }} onVerified={() => { const pending = authorization; setAuthorization(null); void pending.run().then(() => { if (mounted.current) { pending.resolve(); reload(); } }).catch(error => { if (mounted.current) { setMutationError(explain(error)); if (error instanceof StaffAuthError && [401, 419].includes(error.status)) clear(); pending.reject(error instanceof Error ? error : new Error('Request failed')); } }); }}/>}</>;
}
