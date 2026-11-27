import { useEffect, useId, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { changeManagedUserStatus, createManagedUser, loadManagedUsers, type ManagedUserStatusCommand, type Area, type ManagedUser, type ManagedUserCreate } from '../../api/staff-admin';
import { StaffAuthError } from '../../api/staff-auth';
import { useStaffSession } from '../../app/StaffSession';
import { DataTable } from '../../design/DataTable';
import { Button, ConfirmDialog, Panel } from '../../design/components';
import { DialogHeader } from '../../design/DialogHeader';
import { ListToolbar, Pager, matches } from './ListToolbar';

import './ManagedUsersPanel.css';

type Values = Omit<ManagedUserCreate, 'confirmed' | 'reason'>;
export function ManagedUsersPanel({ areas, authorize }: { areas: Area[]; authorize: (context: string, run: () => Promise<void>) => Promise<void> }) {
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
  const [notice, setNotice] = useState('');
  const [values, setValues] = useState<Values | null>(null);
  const users = useQuery({ queryKey: ['managed-users', page, kind], queryFn: ({ signal }) => loadManagedUsers(page, kind, signal), retry: false });
  const expired = users.error instanceof StaffAuthError && [401, 419].includes(users.error.status);
  useEffect(() => { if (expired) clear(); }, [expired, clear]);
  const label = (kind: string) => kind === 'rider' ? text('Rider', 'Abiria') : kind === 'driver' ? text('Driver', 'Dereva') : text('Partner', 'Mshirika');
  const rows = (users.data?.data ?? []).filter(user => matches(query, user.display_name, user.email_masked, user.phone_masked));
  const columns: ColumnDef<ManagedUser>[] = [
    { accessorKey: 'display_name', header: text('Name', 'Jina'), cell: ({ row }) => <div className="member-identity"><strong>{row.original.display_name}</strong><small>{row.original.email_masked}</small><small>{row.original.phone_masked}</small></div> },
    { accessorKey: 'kind', header: text('Account type', 'Aina ya akaunti'), cell: ({ row }) => label(row.original.kind) },
    { accessorKey: 'status', header: text('Status', 'Hali') },
    { accessorKey: 'email_verified', header: text('Email verified', 'Barua pepe imethibitishwa'), cell: ({ row }) => row.original.email_verified ? text('Yes', 'Ndiyo') : text('Pending', 'Inasubiri') },
    { accessorKey: 'phone_verified', header: text('Phone verified', 'Simu imethibitishwa'), cell: ({ row }) => row.original.phone_verified ? text('Yes', 'Ndiyo') : text('Pending', 'Inasubiri') },
    { id: 'actions', header: text('Actions', 'Vitendo'), cell: ({ row }) => row.original.status === 'closed'
      ? <span>{text('Closed · history retained', 'Imefungwa · historia imehifadhiwa')}</span>
      : <div className="member-row-actions"><Button kind="secondary" onClick={() => { setNotice(''); setStatusChange({ user: row.original, status: row.original.status === 'active' ? 'suspended' : 'active' }); }}>{row.original.status === 'active' ? text('Disable…', 'Sitisha…') : text('Enable…', 'Wezesha…')}</Button><Button kind="secondary" onClick={() => { setNotice(''); setStatusChange({ user: row.original, status: 'closed' }); }}>{text('Close account…', 'Funga akaunti…')}</Button></div> },
  ];
  return <><Panel title={text('Riders, drivers and partners', 'Abiria, madereva na washirika')}>
    <ListToolbar search={{ label: text('Search this page', 'Tafuta kwenye ukurasa huu'), placeholder: text('Search this page', 'Tafuta kwenye ukurasa huu'), value: query, onChange: setQuery, clearLabel: text('Clear search', 'Futa utafutaji') }}
      filter={{ label: text('Filter users', 'Chuja watumiaji'), value: kind, onChange: value => { setKind(value); setPage(1); }, options: [{ id: '', label: text('All', 'Wote') }, { id: 'rider', label: text('Riders', 'Abiria') }, { id: 'driver', label: text('Drivers', 'Madereva') }, { id: 'partner', label: text('Partners', 'Washirika') }] }}
      count={users.data ? `${rows.length} ${text('of', 'kati ya')} ${users.data.total}` : undefined}
      action={<Button kind="secondary" disabled={users.isPending || !!users.error} onClick={() => { setNotice(''); setEditing(true); }}>{text('Create user…', 'Unda mtumiaji…')}</Button>}/>
    <p className="list-hint">{text('Sends a password setup link. Phone and driver or partner verification still apply.', 'Hutuma kiungo cha kusanidi nenosiri. Uthibitishaji wa simu na wa dereva au mshirika bado unahitajika.')}</p>
    <p className="list-hint">{text('Disabling stops access. Closing preserves history and cannot be undone here.', 'Kusitisha huzuia ufikiaji. Kufunga huhifadhi historia na hakuwezi kutenguliwa hapa.')}</p>
    {notice && <p role="status" className="access-notice">{notice}</p>}
    {users.error ? <div role="alert"><p>{text('Users could not be loaded. Super administrator access is required.', 'Watumiaji hawakupakiwa. Ufikiaji wa msimamizi mkuu unahitajika.')}</p><Button kind="secondary" onClick={() => void users.refetch()}>{text('Try again', 'Jaribu tena')}</Button></div> : <>
      <DataTable rows={rows} columns={columns} externalPagination filterable={false} loading={users.isPending} previousTimestamp={null}/>
      {users.data && <Pager page={page} last={users.data.lastPage} onPage={setPage} labels={{ previous: text('Previous', 'Iliyotangulia'), next: text('Next', 'Inayofuata'), page: text('Page', 'Ukurasa'), of: text('of', 'kati ya') }}/>}
    </>}
  </Panel>
    {statusChange && <ConfirmDialog key={`${statusChange.user.id}-${statusChange.status}`} title={`${statusChange.status === 'closed' ? text('Close account · history retained', 'Funga akaunti · historia itahifadhiwa') : statusChange.status === 'suspended' ? text('Disable account', 'Sitisha akaunti') : text('Enable account', 'Wezesha akaunti')}: ${statusChange.user.display_name}`}
      version={statusChange.user.version} currentVersion={users.data?.data.find(user => user.id === statusChange.user.id)?.version ?? -1} canConfirm onCancel={() => setStatusChange(null)} onConfirm={async confirmation => {
        const command: ManagedUserStatusCommand = { status: statusChange.status, version: confirmation.version, reason: confirmation.reason, confirmed: true };
        try {
          await authorize(JSON.stringify([statusChange.user.id, command, confirmation.idempotencyKey]), () => changeManagedUserStatus(statusChange.user, command, confirmation.idempotencyKey));
          setStatusChange(null); setNotice(text('Account status updated.', 'Hali ya akaunti imesasishwa.'));
          void client.invalidateQueries({ queryKey: ['managed-users'] });
          void client.invalidateQueries({ queryKey: ['overview'] });
        } catch (error) {
          if (error instanceof StaffAuthError && error.status === 409) setStatusChange(null);
          void client.invalidateQueries({ queryKey: ['managed-users'] });
          throw error;
        }
      }}/> }
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
