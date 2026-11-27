import { useEffect, useId, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { changeManagedUserStatus, createManagedUser, loadManagedUsers, requestAccountClosure, type ManagedUserStatusCommand, type Area, type ManagedUser, type ManagedUserCreate } from '../../api/staff-admin';
import { StaffAuthError } from '../../api/staff-auth';
import { useStaffSession } from '../../app/StaffSession';
import { DataTable } from '../../design/DataTable';
import { Button, ConfirmDialog, Panel } from '../../design/components';
import { DialogHeader } from '../../design/DialogHeader';
import { ListToolbar, Pager, matches } from './ListToolbar';

import './ManagedUsersPanel.css';

type Values = Omit<ManagedUserCreate, 'confirmed' | 'reason'>;
type Props = {
  areas: Area[]; authorize: (context: string, run: () => Promise<void>) => Promise<void>;
  /** Super administrators create users and change status directly; everyone else can only request deletion. */
  superAdmin: boolean; canRequest: boolean; pendingClosures: ReadonlySet<string>;
};
export function ManagedUsersPanel({ areas, authorize, superAdmin, canRequest, pendingClosures }: Props) {
  const { i18n } = useTranslation();
  const sw = i18n.language.startsWith('sw');
  const text = (en: string, translation: string) => sw ? translation : en;
  const { clear } = useStaffSession();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [statusChange, setStatusChange] = useState<{ user: ManagedUser; status: ManagedUserStatusCommand['status'] } | null>(null);
  const [deletion, setDeletion] = useState<ManagedUser | null>(null);
  const [notice, setNotice] = useState('');
  const [values, setValues] = useState<Values | null>(null);
  const users = useQuery({ queryKey: ['managed-users', page, kind], queryFn: ({ signal }) => loadManagedUsers(page, kind, signal), retry: false });
  const expired = users.error instanceof StaffAuthError && [401, 419].includes(users.error.status);
  useEffect(() => { if (expired) clear(); }, [expired, clear]);
  const label = (kind: string) => kind === 'rider' ? text('Rider', 'Abiria') : kind === 'driver' ? text('Driver', 'Dereva') : text('Partner', 'Mshirika');
  const statusLabel = (status: ManagedUser['status']) => ({ active: text('Active', 'Hai'), suspended: text('Disabled', 'Imesitishwa'), closed: text('Closed', 'Imefungwa'), archived: text('Deleted', 'Imefutwa') })[status];
  const rows = (users.data?.data ?? []).filter(user => matches(query, user.display_name, user.email_masked, user.phone_masked));
  const columns: ColumnDef<ManagedUser>[] = [
    { accessorKey: 'display_name', header: text('Name', 'Jina'), cell: ({ row }) => <div className="member-identity"><strong>{row.original.display_name}</strong><small>{row.original.email_masked}</small><small>{row.original.phone_masked}</small></div> },
    { accessorKey: 'kind', header: text('Account type', 'Aina ya akaunti'), cell: ({ row }) => label(row.original.kind) },
    { accessorKey: 'status', header: text('Status', 'Hali'), cell: ({ row }) => statusLabel(row.original.status) },
    { accessorKey: 'email_verified', header: text('Email verified', 'Barua pepe imethibitishwa'), cell: ({ row }) => row.original.email_verified ? text('Yes', 'Ndiyo') : text('Pending', 'Inasubiri') },
    { accessorKey: 'phone_verified', header: text('Phone verified', 'Simu imethibitishwa'), cell: ({ row }) => row.original.phone_verified ? text('Yes', 'Ndiyo') : text('Pending', 'Inasubiri') },
    { id: 'actions', header: text('Actions', 'Vitendo'), cell: ({ row }) => row.original.status === 'archived'
      ? <span>{text('Deleted · history kept', 'Imefutwa · historia imehifadhiwa')}</span>
      : row.original.status === 'closed' && !superAdmin
      ? <span>{text('Closed · history retained', 'Imefungwa · historia imehifadhiwa')}</span>
      : superAdmin && row.original.status === 'closed'
      ? <div className="member-row-actions"><Button kind="secondary" onClick={() => { setNotice(''); setStatusChange({ user: row.original, status: 'archived' }); }}>{text('Delete…', 'Futa…')}</Button></div>
      : !superAdmin ? (pendingClosures.has(row.original.id)
        ? <span className="member-pending">{text('Deletion awaiting super admin approval', 'Ufutaji unasubiri idhini ya msimamizi mkuu')}</span>
        : <Button kind="secondary" disabled={!canRequest} onClick={() => { setNotice(''); setDeletion(row.original); }}>{text('Request deletion…', 'Omba kufuta…')}</Button>)
      : <div className="member-row-actions"><Button kind="secondary" onClick={() => { setNotice(''); setStatusChange({ user: row.original, status: row.original.status === 'active' ? 'suspended' : 'active' }); }}>{row.original.status === 'active' ? text('Disable…', 'Sitisha…') : text('Enable…', 'Wezesha…')}</Button><Button kind="secondary" onClick={() => { setNotice(''); setStatusChange({ user: row.original, status: 'closed' }); }}>{text('Close account…', 'Funga akaunti…')}</Button><Button kind="secondary" onClick={() => { setNotice(''); setStatusChange({ user: row.original, status: 'archived' }); }}>{text('Delete…', 'Futa…')}</Button></div> },
  ];
  return <><Panel title={text('Riders, drivers and partners', 'Abiria, madereva na washirika')} info={superAdmin ? <>
      <p>{text('Creating a user sends a password setup link. Phone and driver or partner verification still apply.', 'Kuunda mtumiaji hutuma kiungo cha kusanidi nenosiri. Uthibitishaji wa simu na wa dereva au mshirika bado unahitajika.')}</p>
      <p>{text('Disabling stops access. Closing preserves history and cannot be undone here.', 'Kusitisha huzuia ufikiaji. Kufunga huhifadhi historia na hakuwezi kutenguliwa hapa.')}</p>
      <p>{text('Deleting archives the account: it can no longer sign in and leaves this list. Trips, payments and the audit log keep its history.', 'Kufuta huhifadhi akaunti kwenye kumbukumbu: haiwezi kuingia tena na huondoka kwenye orodha hii. Safari, malipo na kumbukumbu za ukaguzi huhifadhi historia yake.')}</p>
    </> : <p>{text('Deleting an account needs a super administrator’s approval. The account is archived and its trip and payment history is kept.', 'Kufuta akaunti kunahitaji idhini ya msimamizi mkuu. Akaunti huhifadhiwa kwenye kumbukumbu na historia ya safari na malipo huhifadhiwa.')}</p>}>
    <ListToolbar search={{ label: text('Search this page', 'Tafuta kwenye ukurasa huu'), placeholder: text('Search this page', 'Tafuta kwenye ukurasa huu'), value: query, onChange: setQuery, clearLabel: text('Clear search', 'Futa utafutaji') }}
      filter={{ label: text('Filter users', 'Chuja watumiaji'), value: kind, onChange: value => { setKind(value); setPage(1); }, options: [{ id: '', label: text('All', 'Wote') }, { id: 'rider', label: text('Riders', 'Abiria') }, { id: 'driver', label: text('Drivers', 'Madereva') }, { id: 'partner', label: text('Partners', 'Washirika') }] }}
      count={users.data ? `${rows.length} ${text('of', 'kati ya')} ${users.data.total}` : undefined}
      action={superAdmin ? <Button kind="secondary" disabled={users.isPending || !!users.error} onClick={() => { setNotice(''); setEditing(true); }}>{text('Create user…', 'Unda mtumiaji…')}</Button> : undefined}/>
    {notice && <p role="status" className="access-notice">{notice}</p>}
    {users.error ? <div role="alert"><p>{users.error instanceof StaffAuthError && users.error.status === 403 ? text('You do not have access to the user directory.', 'Huna ruhusa ya kuona orodha ya watumiaji.') : text('Users could not be loaded because the server returned an error. Try again; if it continues, the API may need its latest database migration.', 'Watumiaji hawakupakiwa kwa sababu seva ilirudisha hitilafu. Jaribu tena; ikiendelea, API inaweza kuhitaji uhamishaji wake wa hivi karibuni wa hifadhidata.')}</p><Button kind="secondary" onClick={() => void users.refetch()}>{text('Try again', 'Jaribu tena')}</Button></div> : <>
      <DataTable rows={rows} columns={columns} externalPagination filterable={false} loading={users.isPending} previousTimestamp={null}/>
      {users.data && <Pager page={page} last={users.data.lastPage} onPage={setPage} labels={{ previous: text('Previous', 'Iliyotangulia'), next: text('Next', 'Inayofuata'), page: text('Page', 'Ukurasa'), of: text('of', 'kati ya') }}/>}
    </>}
  </Panel>
    {statusChange && <ConfirmDialog key={`${statusChange.user.id}-${statusChange.status}`} title={`${statusChange.status === 'archived' ? text('Delete account · archived, history kept', 'Futa akaunti · itahifadhiwa, historia itabaki') : statusChange.status === 'closed' ? text('Close account · history retained', 'Funga akaunti · historia itahifadhiwa') : statusChange.status === 'suspended' ? text('Disable account', 'Sitisha akaunti') : text('Enable account', 'Wezesha akaunti')}: ${statusChange.user.display_name}`}
      version={statusChange.user.version} currentVersion={users.data?.data.find(user => user.id === statusChange.user.id)?.version ?? -1} canConfirm onCancel={() => setStatusChange(null)} onConfirm={async confirmation => {
        const command: ManagedUserStatusCommand = { status: statusChange.status, version: confirmation.version, reason: confirmation.reason, confirmed: true };
        try {
          await authorize(JSON.stringify([statusChange.user.id, command, confirmation.idempotencyKey]), () => changeManagedUserStatus(statusChange.user, command, confirmation.idempotencyKey));
          setStatusChange(null); setNotice(statusChange.status === 'archived' ? text('Account deleted. Its history is kept.', 'Akaunti imefutwa. Historia yake imehifadhiwa.') : text('Account status updated.', 'Hali ya akaunti imesasishwa.'));
          void client.invalidateQueries({ queryKey: ['managed-users'] });
          void client.invalidateQueries({ queryKey: ['overview'] });
        } catch (error) {
          if (error instanceof StaffAuthError && error.status === 409) setStatusChange(null);
          void client.invalidateQueries({ queryKey: ['managed-users'] });
          throw error;
        }
      }}/> }
    {deletion && <ConfirmDialog key={`delete-${deletion.id}`} title={`${text('Request account deletion', 'Omba kufuta akaunti')}: ${deletion.display_name}`}
      version={deletion.version} currentVersion={users.data?.data.find(user => user.id === deletion.id)?.version ?? -1} canConfirm onCancel={() => setDeletion(null)} onConfirm={async confirmation => {
        try {
          await authorize(JSON.stringify(['account_closure', deletion.id, confirmation.version, confirmation.idempotencyKey]), () => requestAccountClosure(deletion, confirmation.reason, confirmation.idempotencyKey));
          setDeletion(null); setNotice(text('Deletion requested. A super administrator must approve it.', 'Ombi la kufuta limetumwa. Msimamizi mkuu lazima aliidhinishe.'));
        } finally {
          void client.invalidateQueries({ queryKey: ['staff-management', 'requests'] });
          void client.invalidateQueries({ queryKey: ['managed-users'] });
        }
      }}/>}
    {editing && <MemberEditor areas={areas} locale={sw ? 'sw' : 'en'} onCancel={() => setEditing(false)} onReview={setValues}/>}
    {values && <ConfirmDialog title={text('Create Ravu user', 'Unda mtumiaji wa Ravu')} version={0} currentVersion={0} canConfirm onCancel={() => setValues(null)} onConfirm={async confirmation => {
      const payload: ManagedUserCreate = { ...values, reason: confirmation.reason, confirmed: true };
      await authorize(JSON.stringify([payload, confirmation.idempotencyKey]), () => createManagedUser(payload, confirmation.idempotencyKey));
      setValues(null); setEditing(false); setNotice(text('User created. Setup link sent.', 'Mtumiaji ameundwa. Kiungo cha kusanidi kimetumwa.'));
      void client.invalidateQueries({ queryKey: ['managed-users'] });
      void client.invalidateQueries({ queryKey: ['staff-management', 'invitations'] });
    }}/>}
  </>;
}

function MemberEditor({ areas, locale, onCancel, onReview }: { areas: Area[]; locale: 'en' | 'sw'; onCancel: () => void; onReview: (values: Values) => void }) {
  const { i18n } = useTranslation();
  const text = (en: string, sw: string) => i18n.language.startsWith('sw') ? sw : en;
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); element?.querySelector<HTMLElement>('form input:not([type=checkbox]), form select')?.focus(); return () => element?.close(); }, []);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [kind, setKind] = useState<Values['kind']>('rider');
  const [language, setLanguage] = useState(locale);
  const [area, setArea] = useState('');
  return <dialog ref={dialog} className="access-editor" aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); onCancel(); }}><form className="access-editor-card" onSubmit={event => { event.preventDefault(); onReview({ display_name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), kind, locale: language, area_id: area ? Number(area) : null }); }}>
    <DialogHeader id={`${id}-title`} title={text('Create user', 'Unda mtumiaji')} closeLabel={text('Close', 'Funga')} onClose={onCancel}/>
    <label>{text('Name', 'Jina')}<input autoFocus required maxLength={120} value={name} onChange={event => setName(event.target.value)}/></label>
    <label>{text('Email', 'Barua pepe')}<input type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)}/></label>
    <label>{text('Phone (+255)', 'Simu (+255)')}<input type="tel" required pattern="\+255[67][0-9]{8}" maxLength={13} value={phone} onChange={event => setPhone(event.target.value)}/></label>
    <label>{text('Account type', 'Aina ya akaunti')}<select value={kind} onChange={event => setKind(event.target.value as Values['kind'])}><option value="rider">{text('Rider', 'Abiria')}</option><option value="driver">{text('Driver', 'Dereva')}</option><option value="partner">{text('Partner', 'Mshirika')}</option></select></label>
    <label>{text('Language', 'Lugha')}<select value={language} onChange={event => setLanguage(event.target.value as 'en' | 'sw')}><option value="en">English</option><option value="sw">Kiswahili</option></select></label>
    <label>{text('Operating area (optional)', 'Eneo la shughuli (si lazima)')}<select value={area} onChange={event => setArea(event.target.value)}><option value="">{text('Not assigned', 'Halijapangwa')}</option>{areas.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <div className="dialog-actions"><Button kind="secondary" onClick={onCancel}>{text('Cancel', 'Ghairi')}</Button><Button type="submit">{text('Confirm creation', 'Thibitisha uundaji')}</Button></div>
  </form></dialog>;
}
