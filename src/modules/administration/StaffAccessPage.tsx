import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../../design/DataTable';
import { useAccessText } from './access-copy';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { components } from '../../api/generated/admin';
import { Button, ConfirmDialog, Panel, StatusBadge, type ConfirmedCommand } from '../../design/components';
import { Icon } from '../../design/Icon';
import { PageHeader } from '../../design/PageHeader';
import { Tabs, TabPanel, useQueryChoice } from '../../design/Tabs';
import { DialogHeader } from '../../design/DialogHeader';
import './StaffAccessPage.css';

type Staff = components['schemas']['Staff'];
type Role = components['schemas']['Role'];
type Permission = components['schemas']['Bootstrap']['permissions'][number];
/** Form state, not an API contract. The transport adapter must use generated types. */
export type AccessFormCommand =
  | { kind: 'invite'; email: string; name: string; roleId: string; scope: string; areaId: string }
  | { kind: 'staff'; id: string; version: number; name: string; roleId: string; status: Staff['status']; scope: string; areaId: string }
  | { kind: 'role'; id: string | null; version: number; name: string; nameSw: string; enabled: boolean; permissions: Permission[] };
type Props = {
  staff: Staff[]; roles: Role[]; permissions: readonly Permission[];
  capabilities: readonly Permission[]; areas: { id: string; label: string }[];
  loading?: boolean; error?: string | undefined; requests?: ReactNode; pendingRequests?: number | undefined; sessions?: ReactNode; users?: ReactNode; isSuperAdmin?: boolean;
  onReload: () => void;
  totalStaff?: number | undefined; onSearch?: (value: string) => void; pagination?: ReactNode; previousTimestamp?: string | null; staffFilters?: ReactNode;
  /** Adapter must reauthenticate and submit an audited command using the current authority mode. */
  onRequestChange?: (values: AccessFormCommand, confirmation: ConfirmedCommand) => Promise<void>;
};
type Editor = { kind: 'invite' | 'staff' | 'role'; staff?: Staff; role?: Role };
const accessTabs = ['roles', 'staff', 'users', 'requests', 'sessions'] as const;
type AccessTab = typeof accessTabs[number];
export function StaffAccessPage(props: Props) {
  const tr = useAccessText();
  const tabLabels: Record<AccessTab, string> = { roles: tr('Roles'), staff: tr('Staff'), users: tr('Users'), requests: tr('Access requests'), sessions: tr('Sessions') };
  const tabIds = accessTabs.filter(id => id !== 'users' || props.isSuperAdmin);
  const [tab, setTab] = useQueryChoice<AccessTab>('tab', tabIds, 'roles');
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [notice, setNotice] = useState('');
  const manage = props.permissions.includes('access.manage') && !!props.onRequestChange && !props.loading && !props.error;
  const allowed = props.permissions.includes('access.read');
  const showEditor = (value: Editor) => { setNotice(''); setEditor(value); };
  const lower = query.trim().toLocaleLowerCase();
  const staff = props.staff.filter(row => [row.display_name, row.email_masked].some(text => text.toLocaleLowerCase().includes(lower)));
  const columns: ColumnDef<Staff>[] = [
    { accessorKey: 'display_name', header: tr('Staff member'), cell: ({ row }) => <><strong>{row.original.display_name}</strong><small>{row.original.email_masked}</small></> },
    { id: 'role', header: tr('Role'), accessorFn: user => user.role_ids.map(id => props.roles.find(role => role.id === id)?.name ?? tr('Unavailable role')).join(', ') || tr('Unassigned') },
    { accessorKey: 'status', header: tr('Access'), cell: ({ row }) => <StatusBadge status={row.original.status === 'active' ? 'success' : 'danger'} label={tr(row.original.status === 'active' ? 'Active' : 'Suspended')}/> },
    { accessorKey: 'mfa_enrolled', header: tr('MFA'), cell: ({ row }) => tr(row.original.mfa_enrolled ? 'Enrolled' : 'Enrollment required') },
    { id: 'action', header: tr('Action'), cell: ({ row }) => <Button kind="secondary" disabled={!manage || row.original.role_ids.some(id => props.roles.find(role => role.id === id)?.protected)} onClick={() => showEditor({ kind: 'staff', staff: row.original })}>{tr('Manage user')}</Button> },
  ];
  return <div className="staff-access" data-testid="staff-access-page">
    <PageHeader title={tr("Staff roles and permissions")} subtitle={tr("Least privilege · Named staff only")}
      action={allowed ? <Button icon="user-plus" disabled={!manage} onClick={() => showEditor({ kind: 'invite' })}>{tr(props.isSuperAdmin ? 'Add admin or staff…' : 'Invite staff…')}</Button> : undefined}
      tabs={allowed ? <Tabs idPrefix="access" label={tr("Staff administration")} value={tab} onChange={id => setTab(id as AccessTab)} items={tabIds.map(id => ({ id, label: tabLabels[id], count: id === 'requests' ? props.pendingRequests : undefined }))}/> : undefined}/>
    {!allowed ? <Panel title={tr("Access unavailable")}><p>{tr("You need permission to view staff administration.")}</p><Button kind="secondary" onClick={props.onReload}>{tr("Reload permissions")}</Button></Panel> : <>
      {notice && <p role="status" className="access-notice">{notice}</p>}
      {props.error ? <Panel title={tr("Staff administration unavailable")}><p role="alert">{props.error}</p><Button kind="secondary" onClick={props.onReload}>{tr("Try again")}</Button></Panel> : props.loading ? <Panel title={tr("Loading staff administration")}><p role="status">{tr("Retrieving current permissions and records…")}</p></Panel> :
      <TabPanel idPrefix="access" id={tab}>
        {tab === 'roles' && <Panel title={tr("Role capability matrix")}><div className="access-panel-tools"><p>{tr(props.isSuperAdmin ? "Role changes apply immediately. Reassign affected staff." : "Role changes need independent approval. Reassign affected staff.")}</p><Button kind="secondary" disabled={!manage} onClick={() => showEditor({ kind: 'role' })}>{tr("Create role")}</Button></div>
          {props.roles.length === 0 ? <p>{tr("No roles are available.")}</p> : <div className="access-table-scroll"><table className="access-matrix"><thead><tr><th scope="col">{tr("Capability")}</th>{props.roles.map(role => <th key={role.id} scope="col"><strong>{role.name}</strong><small>{role.enabled ? tr('Enabled') : tr('Disabled')}</small><Button kind="secondary" disabled={!manage || role.protected} onClick={() => showEditor({ kind: 'role', role })}>{tr("Manage role")}</Button></th>)}</tr></thead><tbody>{props.capabilities.map(capability => <tr key={capability}><th scope="row">{capability}</th>{props.roles.map(role => <td key={role.id}>{role.permissions.includes(capability) ? tr('Granted') : tr('No access')}</td>)}</tr>)}</tbody></table></div>}
        </Panel>}
        {tab === 'staff' && <Panel title={tr("Staff directory")}><div className="access-panel-tools"><label>{tr("Find staff")}<input type="search" value={query} onChange={event => { setQuery(event.target.value); props.onSearch?.(event.target.value); }} placeholder={tr("Name")}/></label><span>{staff.length} / {props.totalStaff ?? props.staff.length} displayed</span></div>
          {staff.length === 0 ? <p>{tr('No staff match these filters.')}</p> : <DataTable rows={staff} columns={columns} externalPagination previousTimestamp={props.previousTimestamp ?? null}/>}
          {props.staffFilters}{props.pagination}
        </Panel>}
        {tab === 'users' && props.users}
        {tab === 'requests' && (props.requests ?? <Panel title={tr("Access requests")}><p>{tr("Approval data is not connected yet. No access changes have been made.")}</p></Panel>)}
        {tab === 'sessions' && (props.sessions ?? <Panel title={tr("Staff sessions")}><p>{tr("Session management is not connected yet.")}</p></Panel>)}
      </TabPanel>}
      <div className="access-security-note"><Icon name="shield"/><div><strong>{tr("No shared super-admin credentials")}</strong><p>{tr(props.isSuperAdmin ? 'MFA, confirmation and an audit reason are required.' : 'MFA and a second administrator’s approval are required.')}</p></div></div>
    </>}
    {editor && manage && <AccessEditor key={editor.staff?.id ?? editor.role?.id ?? editor.kind} editor={editor} direct={!!props.isSuperAdmin} roles={props.roles} capabilities={props.capabilities} areas={props.areas} onClose={() => setEditor(null)} onSubmit={async (values, confirmation) => { if (!props.onRequestChange) return; await props.onRequestChange(values, confirmation); setEditor(null); setNotice(tr(props.isSuperAdmin ? 'Change applied.' : 'Request submitted for independent review.')); }}/>} 
  </div>;
}
function AccessEditor({ editor, roles, capabilities, areas, onClose, onSubmit, direct }: {
  editor: Editor; direct: boolean; roles: Role[]; capabilities: readonly Permission[]; areas: Props['areas'];
  onClose: () => void; onSubmit: (values: AccessFormCommand, confirmation: ConfirmedCommand) => Promise<void>;
}) {
  const tr = useAccessText();
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); element?.querySelector<HTMLElement>('form input:not([type=checkbox]), form select')?.focus(); return () => element?.close(); }, []);
  const [name, setName] = useState(editor.staff?.display_name ?? editor.role?.name ?? '');
  const [nameSw, setNameSw] = useState(editor.role?.name_sw ?? '');
  const [enabled, setEnabled] = useState(editor.role?.enabled ?? false);
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(editor.staff?.role_ids[0] ?? '');
  const [status, setStatus] = useState<Staff['status']>(editor.staff?.status ?? 'active');
  // Do not infer or silently default a person's access scope.
  const [scope, setScope] = useState('');
  const [areaId, setAreaId] = useState('');
  const [selected, setSelected] = useState<Permission[]>(editor.role?.permissions ?? []);
  const [confirmation, setConfirmation] = useState<AccessFormCommand | null>(null);
  const title = editor.kind === 'invite' ? tr('Invite a staff member') : editor.kind === 'staff' ? tr('Manage staff access') : editor.role ? tr('Manage role permissions') : tr('Create a role');
  const valid = name.trim().length > 0 && (editor.kind === 'role' ? nameSw.trim().length > 0 && selected.length > 0 : !!roleId && !!scope && (scope !== 'area' || !!areaId));
  const submit = () => {
    if (!valid) return;
    const values: AccessFormCommand = editor.kind === 'role'
      ? { kind: 'role', id: editor.role?.id ?? null, version: editor.role?.version ?? 0, name: name.trim(), nameSw: nameSw.trim(), enabled, permissions: selected }
      : editor.kind === 'staff' && editor.staff
        ? { kind: 'staff', id: editor.staff.id, version: editor.staff.version, name: name.trim(), roleId, status, scope, areaId: scope === 'area' ? areaId : '' }
        : { kind: 'invite', email: email.trim(), name: name.trim(), roleId, scope, areaId: scope === 'area' ? areaId : '' };
    setConfirmation(values);
  };
  return <dialog ref={dialog} className="access-editor" aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); if (!confirmation) onClose(); }}>
    <form className="access-editor-card" onSubmit={event => { event.preventDefault(); submit(); }}><DialogHeader id={`${id}-title`} title={title} closeLabel={tr('Close')} onClose={onClose}/>{!direct && <p>{tr('Needs independent approval.')}</p>}
      <label>{tr("Name")}<input autoFocus value={name} maxLength={120} required disabled={editor.role?.defaults} onChange={event => setName(event.target.value)}/></label>
      {editor.kind === 'role' && <><label>{tr("Name (Swahili)")}<input value={nameSw} maxLength={120} required disabled={editor.role?.defaults} onChange={event => setNameSw(event.target.value)}/></label><label className="checkbox"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)}/>{tr(direct ? 'Enable role' : 'Enable after independent approval')}</label>{editor.role?.defaults && <p>{tr("Approved default names and grants are fixed. Create a custom role to request different permissions.")}</p>}</>}
      {editor.kind === 'invite' && <label>{tr("Email")}<input type="email" value={email} maxLength={254} autoComplete="off" required onChange={event => setEmail(event.target.value)}/></label>}
      {editor.kind !== 'role' ? <>
        <label>{tr("Role")}<select required value={roleId} onChange={event => setRoleId(event.target.value)}><option value="">{tr("Choose a role")}</option>{roles.filter(role => role.enabled && !role.protected).map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
        {editor.kind === 'staff' && <label>{tr("Access status")}<select value={status} onChange={event => setStatus(event.target.value as Staff['status'])}><option value="active">{tr("Active")}</option><option value="suspended">{tr("Suspended")}</option></select></label>}
        <label>{tr("Access scope")}<select required value={scope} onChange={event => { setScope(event.target.value); setAreaId(''); }}><option value="">{tr("Choose access scope")}</option><option value="global">{tr("All operations")}</option><option value="area">{tr("Specific operating area")}</option></select></label>
        {scope === 'area' && <label>{tr("Operating area")}<select required value={areaId} onChange={event => setAreaId(event.target.value)}><option value="">{tr("Choose an operating area")}</option>{areas.map(area => <option key={area.id} value={area.id}>{area.label}</option>)}</select></label>}
      </> : <fieldset className="access-capabilities" disabled={editor.role?.defaults}><legend>{tr("Explicit capabilities")}</legend>{capabilities.map(capability => <label key={capability}><input type="checkbox" checked={selected.includes(capability)} onChange={event => setSelected(previous => event.target.checked ? [...previous, capability] : previous.filter(value => value !== capability))}/>{capability}</label>)}</fieldset>}
      <div className="dialog-actions"><Button kind="secondary" onClick={onClose}>{tr("Cancel")}</Button><Button type="submit" disabled={!valid}>{tr(direct ? 'Apply change' : 'Review request')}</Button></div>
    </form>
    {confirmation && <ConfirmDialog title={title} version={'version' in confirmation ? confirmation.version : 0} currentVersion={'version' in confirmation ? confirmation.version : 0} canConfirm onCancel={() => setConfirmation(null)} onConfirm={async command => { await onSubmit(confirmation, command); }}/>}
  </dialog>;
}

