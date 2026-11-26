import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { components } from '../../api/generated/admin';
import { Button, ConfirmDialog, Panel, StatusBadge, type ConfirmedCommand } from '../../design/components';
import { Icon } from '../../design/Icon';
import './StaffAccessPage.css';

type Staff = components['schemas']['Staff'];
type Role = components['schemas']['Role'];
type Permission = components['schemas']['Bootstrap']['permissions'][number];
/** Form state, not an API contract. The transport adapter must use generated types. */
export type AccessFormCommand =
  | { kind: 'invite'; email: string; name: string; roleId: string; scope: string; areaId: string }
  | { kind: 'staff'; id: string; version: number; name: string; roleId: string; status: Staff['status']; scope: string; areaId: string }
  | { kind: 'role'; id: string | null; version: number; name: string; permissions: Permission[] };
type Props = {
  staff: Staff[]; roles: Role[]; permissions: readonly Permission[];
  capabilities: readonly Permission[]; areas: { id: string; label: string }[];
  loading?: boolean; error?: string; requests?: ReactNode; sessions?: ReactNode;
  onReload: () => void;
  /** Adapter must reauthenticate, submit an audited request, and await independent approval. */
  onRequestChange?: (values: AccessFormCommand, confirmation: ConfirmedCommand) => Promise<void>;
};
type Editor = { kind: 'invite' | 'staff' | 'role'; staff?: Staff; role?: Role };
export function StaffAccessPage(props: Props) {
  const [tab, setTab] = useState('roles');
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [notice, setNotice] = useState('');
  const manage = props.permissions.includes('access.manage') && !!props.onRequestChange && !props.loading && !props.error;
  const allowed = props.permissions.includes('access.read');
  const showEditor = (value: Editor) => { setNotice(''); setEditor(value); };
  const lower = query.trim().toLocaleLowerCase();
  const staff = props.staff.filter(row => [row.display_name, row.email_masked].some(text => text.toLocaleLowerCase().includes(lower)));
  return <div className="staff-access" data-testid="staff-access-page">
    <div className="access-intro"><h1>Staff roles &amp; permissions</h1><p>Least privilege · Named staff only · Critical changes need re-authentication and an audit reason</p></div>
    {!allowed ? <Panel title="Access unavailable"><p>You need permission to view staff administration.</p><Button kind="secondary" onClick={props.onReload}>Reload permissions</Button></Panel> : <>
      <div className="access-toolbar"><div className="access-tabs" role="tablist" aria-label="Staff administration">
        {(['roles', 'staff', 'requests', 'sessions'] as const).map(key => <button key={key} id={`access-tab-${key}`} role="tab" type="button" aria-selected={tab === key} aria-controls={`access-panel-${key}`} onClick={() => setTab(key)}>{({ roles: 'Roles', staff: 'Staff', requests: 'Access requests', sessions: 'Sessions' })[key]}</button>)}
      </div><Button kind="secondary" disabled={!manage} onClick={() => showEditor({ kind: 'invite' })}>Invite staff…</Button></div>
      {notice && <p role="status" className="access-notice">{notice}</p>}
      {props.error ? <Panel title="Staff administration unavailable"><p role="alert">{props.error}</p><Button kind="secondary" onClick={props.onReload}>Try again</Button></Panel> : props.loading ? <Panel title="Loading staff administration"><p role="status">Retrieving current permissions and records…</p></Panel> :
      <section role="tabpanel" id={`access-panel-${tab}`} aria-labelledby={`access-tab-${tab}`}>
        {tab === 'roles' && <Panel title="Role capability matrix"><div className="access-panel-tools"><p>Review permissions before requesting a change.</p><Button kind="secondary" disabled={!manage} onClick={() => showEditor({ kind: 'role' })}>Create role</Button></div>
          {props.roles.length === 0 ? <p>No roles are available.</p> : <div className="access-table-scroll"><table className="access-matrix"><thead><tr><th scope="col">Capability</th>{props.roles.map(role => <th key={role.id} scope="col"><strong>{role.name}</strong><Button kind="secondary" disabled={!manage} onClick={() => showEditor({ kind: 'role', role })}>Manage role</Button></th>)}</tr></thead><tbody>{props.capabilities.map(capability => <tr key={capability}><th scope="row">{capability}</th>{props.roles.map(role => <td key={role.id}>{role.permissions.includes(capability) ? 'Granted' : 'No access'}</td>)}</tr>)}</tbody></table></div>}
        </Panel>}
        {tab === 'staff' && <Panel title="Staff directory"><div className="access-panel-tools"><label>Find staff<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name or masked email"/></label><span>{staff.length} / {props.staff.length} displayed</span></div>
          {staff.length === 0 ? <p>No staff match these filters.</p> : <div className="access-table-scroll"><table className="access-matrix"><thead><tr><th scope="col">Staff member</th><th scope="col">Role</th><th scope="col">Access</th><th scope="col">MFA</th><th scope="col">Action</th></tr></thead><tbody>{staff.map(user => <tr key={user.id}><th scope="row">{user.display_name}<small>{user.email_masked}</small></th><td>{user.role_ids.map(id => props.roles.find(role => role.id === id)?.name ?? 'Unavailable role').join(', ') || 'Unassigned'}</td><td><StatusBadge status={user.status === 'active' ? 'success' : 'danger'} label={user.status === 'active' ? 'Active' : 'Suspended'}/></td><td>{user.mfa_enrolled ? 'Enrolled' : 'Enrollment required'}</td><td><Button kind="secondary" disabled={!manage} onClick={() => showEditor({ kind: 'staff', staff: user })}>Manage user</Button></td></tr>)}</tbody></table></div>}
        </Panel>}
        {tab === 'requests' && (props.requests ?? <Panel title="Access requests"><p>Approval data is not connected yet. No access changes have been made.</p></Panel>)}
        {tab === 'sessions' && (props.sessions ?? <Panel title="Staff sessions"><p>Session management is not connected yet.</p></Panel>)}
      </section>}
      <div className="access-security-note"><Icon name="shield"/><div><strong>No shared super-admin credentials</strong><p>Require staff MFA, session expiry and review of new access. Role changes require a second administrator. Submitting a request does not activate access.</p></div></div>
    </>}
    {editor && manage && <AccessEditor key={editor.staff?.id ?? editor.role?.id ?? editor.kind} editor={editor} roles={props.roles} capabilities={props.capabilities} areas={props.areas} onClose={() => setEditor(null)} onSubmit={async (values, confirmation) => { if (!props.onRequestChange) return; await props.onRequestChange(values, confirmation); setEditor(null); setNotice('Request submitted for independent review. Access has not been activated.'); }}/>}
  </div>;
}
function AccessEditor({ editor, roles, capabilities, areas, onClose, onSubmit }: {
  editor: Editor; roles: Role[]; capabilities: readonly Permission[]; areas: Props['areas'];
  onClose: () => void; onSubmit: (values: AccessFormCommand, confirmation: ConfirmedCommand) => Promise<void>;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  const [name, setName] = useState(editor.staff?.display_name ?? editor.role?.name ?? '');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(editor.staff?.role_ids[0] ?? '');
  const [status, setStatus] = useState<Staff['status']>(editor.staff?.status ?? 'active');
  // Do not infer or silently default a person's access scope.
  const [scope, setScope] = useState('');
  const [areaId, setAreaId] = useState('');
  const [selected, setSelected] = useState<Permission[]>(editor.role?.permissions ?? []);
  const [confirmation, setConfirmation] = useState<AccessFormCommand | null>(null);
  const title = editor.kind === 'invite' ? 'Invite a staff member' : editor.kind === 'staff' ? 'Manage staff access' : editor.role ? 'Manage role permissions' : 'Create a role';
  const valid = name.trim().length > 0 && (editor.kind === 'role' ? selected.length > 0 : !!roleId && !!scope && (scope !== 'area' || !!areaId));
  const submit = () => {
    if (!valid) return;
    const values: AccessFormCommand = editor.kind === 'role'
      ? { kind: 'role', id: editor.role?.id ?? null, version: editor.role?.version ?? 0, name: name.trim(), permissions: selected }
      : editor.kind === 'staff' && editor.staff
        ? { kind: 'staff', id: editor.staff.id, version: editor.staff.version, name: name.trim(), roleId, status, scope, areaId: scope === 'area' ? areaId : '' }
        : { kind: 'invite', email: email.trim(), name: name.trim(), roleId, scope, areaId: scope === 'area' ? areaId : '' };
    setConfirmation(values);
  };
  return <dialog ref={dialog} className="access-editor" aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); if (!confirmation) onClose(); }}>
    <form className="access-editor-card" onSubmit={event => { event.preventDefault(); submit(); }}><h2 id={`${id}-title`}>{title}</h2><p>A reason, confirmation, fresh authentication and independent approval are required.</p>
      <label>Name<input autoFocus value={name} maxLength={120} required onChange={event => setName(event.target.value)}/></label>
      {editor.kind === 'invite' && <label>Email<input type="email" value={email} maxLength={254} autoComplete="off" required onChange={event => setEmail(event.target.value)}/></label>}
      {editor.kind !== 'role' ? <>
        <label>Role<select required value={roleId} onChange={event => setRoleId(event.target.value)}><option value="">Choose a role</option>{roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
        {editor.kind === 'staff' && <label>Access status<select value={status} onChange={event => setStatus(event.target.value as Staff['status'])}><option value="active">Active</option><option value="suspended">Suspended</option></select></label>}
        <label>Access scope<select required value={scope} onChange={event => { setScope(event.target.value); setAreaId(''); }}><option value="">Choose access scope</option><option value="global">All operations</option><option value="area">Specific operating area</option></select></label>
        {scope === 'area' && <label>Operating area<select required value={areaId} onChange={event => setAreaId(event.target.value)}><option value="">Choose an operating area</option>{areas.map(area => <option key={area.id} value={area.id}>{area.label}</option>)}</select></label>}
      </> : <fieldset className="access-capabilities"><legend>Explicit capabilities</legend>{capabilities.map(capability => <label key={capability}><input type="checkbox" checked={selected.includes(capability)} onChange={event => setSelected(previous => event.target.checked ? [...previous, capability] : previous.filter(value => value !== capability))}/>{capability}</label>)}</fieldset>}
      <div className="dialog-actions"><Button kind="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!valid}>Review request</Button></div>
    </form>
    {confirmation && <ConfirmDialog title={title} version={'version' in confirmation ? confirmation.version : 0} currentVersion={'version' in confirmation ? confirmation.version : 0} canConfirm onCancel={() => setConfirmation(null)} onConfirm={async command => { await onSubmit(confirmation, command); }}/>}
  </dialog>;
}
