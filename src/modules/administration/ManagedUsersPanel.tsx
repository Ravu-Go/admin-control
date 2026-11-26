import { useEffect, useId, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { createManagedUser, loadManagedUsers, type Area, type ManagedUser, type ManagedUserCreate } from '../../api/staff-admin';
import { StaffAuthError } from '../../api/staff-auth';
import { useStaffSession } from '../../app/StaffSession';
import { DataTable } from '../../design/DataTable';
import { Button, ConfirmDialog, Panel } from '../../design/components';

type Values = Omit<ManagedUserCreate, 'confirmed' | 'reason'>;
export function ManagedUsersPanel({ areas, authorize }: { areas: Area[]; authorize: (context: string, run: () => Promise<void>) => Promise<void> }) {
  const { i18n } = useTranslation();
  const sw = i18n.language.startsWith('sw');
  const text = (en: string, translation: string) => sw ? translation : en;
  const { clear } = useStaffSession();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState('');
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');
  const [values, setValues] = useState<Values | null>(null);
  const users = useQuery({ queryKey: ['managed-users', page, kind], queryFn: ({ signal }) => loadManagedUsers(page, kind, signal), retry: false });
  const expired = users.error instanceof StaffAuthError && [401, 419].includes(users.error.status);
  useEffect(() => { if (expired) clear(); }, [expired, clear]);
  const label = (kind: string) => kind === 'rider' ? text('Rider', 'Abiria') : kind === 'driver' ? text('Driver', 'Dereva') : text('Partner', 'Mshirika');
  const columns: ColumnDef<ManagedUser>[] = [
    { accessorKey: 'display_name', header: text('Name', 'Jina'), cell: ({ row }) => <><strong>{row.original.display_name}</strong><small>{row.original.email_masked}</small><small>{row.original.phone_masked}</small></> },
    { accessorKey: 'kind', header: text('Account type', 'Aina ya akaunti'), cell: ({ row }) => label(row.original.kind) },
    { accessorKey: 'status', header: text('Status', 'Hali') },
    { accessorKey: 'email_verified', header: text('Email verified', 'Barua pepe imethibitishwa'), cell: ({ row }) => row.original.email_verified ? text('Yes', 'Ndiyo') : text('Pending', 'Inasubiri') },
    { accessorKey: 'phone_verified', header: text('Phone verified', 'Simu imethibitishwa'), cell: ({ row }) => row.original.phone_verified ? text('Yes', 'Ndiyo') : text('Pending', 'Inasubiri') },
  ];
  return <><Panel title={text('Riders, drivers and partners', 'Abiria, madereva na washirika')}>
    <div className="access-panel-tools"><label>{text('Account type', 'Aina ya akaunti')}<select value={kind} onChange={event => { setKind(event.target.value); setPage(1); }}><option value="">{text('All users', 'Watumiaji wote')}</option>{['rider', 'driver', 'partner'].map(item => <option key={item} value={item}>{label(item)}</option>)}</select></label><Button disabled={users.isPending || !!users.error} onClick={() => { setNotice(''); setEditing(true); }}>{text('Create user', 'Unda mtumiaji')}</Button></div>
    <p>{text('Account creation sends a password setup link. Phone, driver and partner verification remain required; no business or offer is published.', 'Kuunda akaunti hutuma kiungo cha kusanidi nenosiri. Uthibitishaji wa simu na uhakiki wa madereva na washirika bado vinahitajika; hakuna biashara au ofa inayochapishwa.')}</p>
    {notice && <p role="status" className="access-notice">{notice}</p>}
    {users.error ? <div role="alert"><p>{text('Users could not be loaded. Super administrator access is required.', 'Watumiaji hawakupakiwa. Ufikiaji wa msimamizi mkuu unahitajika.')}</p><Button kind="secondary" onClick={() => void users.refetch()}>{text('Try again', 'Jaribu tena')}</Button></div> : <>
      <DataTable rows={users.data?.data ?? []} columns={columns} externalPagination loading={users.isPending} previousTimestamp={null}/>
      {users.data && <div className="dialog-actions"><Button kind="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>{text('Previous', 'Iliyotangulia')}</Button><span>{page} / {users.data.lastPage} · {users.data.total}</span><Button kind="secondary" disabled={page >= users.data.lastPage} onClick={() => setPage(page + 1)}>{text('Next', 'Inayofuata')}</Button></div>}
    </>}
  </Panel>
    {editing && <MemberEditor areas={areas} locale={sw ? 'sw' : 'en'} onCancel={() => setEditing(false)} onReview={setValues}/>}
    {values && <ConfirmDialog title={text('Create Ravu user', 'Unda mtumiaji wa Ravu')} version={0} currentVersion={0} canConfirm onCancel={() => setValues(null)} onConfirm={async confirmation => {
      const payload: ManagedUserCreate = { ...values, reason: confirmation.reason, confirmed: true };
      await authorize(JSON.stringify([payload, confirmation.idempotencyKey]), () => createManagedUser(payload, confirmation.idempotencyKey));
      setValues(null); setEditing(false); setNotice(text('User created. A one-use password setup invitation was sent.', 'Mtumiaji ameundwa. Mwaliko wa kusanidi nenosiri wa matumizi moja umetumwa.'));
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
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [kind, setKind] = useState<Values['kind']>('rider');
  const [language, setLanguage] = useState(locale);
  const [area, setArea] = useState('');
  return <dialog ref={dialog} className="access-editor" aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); onCancel(); }}><form className="access-editor-card" onSubmit={event => { event.preventDefault(); onReview({ display_name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), kind, locale: language, area_id: area ? Number(area) : null }); }}>
    <h2 id={`${id}-title`}>{text('Create user', 'Unda mtumiaji')}</h2><p>{text('The recipient chooses their password. Creation does not verify their phone or approve driver or partner eligibility.', 'Mpokeaji huchagua nenosiri lake. Kuunda akaunti hakuthibitishi simu wala kuidhinisha ustahiki wa dereva au mshirika.')}</p>
    <label>{text('Name', 'Jina')}<input autoFocus required maxLength={120} value={name} onChange={event => setName(event.target.value)}/></label>
    <label>{text('Email', 'Barua pepe')}<input type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)}/></label>
    <label>{text('Phone (+255)', 'Simu (+255)')}<input type="tel" required pattern="\+255[67][0-9]{8}" maxLength={13} value={phone} onChange={event => setPhone(event.target.value)}/></label>
    <label>{text('Account type', 'Aina ya akaunti')}<select value={kind} onChange={event => setKind(event.target.value as Values['kind'])}><option value="rider">{text('Rider', 'Abiria')}</option><option value="driver">{text('Driver', 'Dereva')}</option><option value="partner">{text('Partner', 'Mshirika')}</option></select></label>
    <label>{text('Language', 'Lugha')}<select value={language} onChange={event => setLanguage(event.target.value as 'en' | 'sw')}><option value="en">English</option><option value="sw">Kiswahili</option></select></label>
    <label>{text('Operating area (optional)', 'Eneo la shughuli (si lazima)')}<select value={area} onChange={event => setArea(event.target.value)}><option value="">{text('Not assigned', 'Halijapangwa')}</option>{areas.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <div className="dialog-actions"><Button kind="secondary" onClick={onCancel}>{text('Cancel', 'Ghairi')}</Button><Button type="submit">{text('Confirm creation', 'Thibitisha uundaji')}</Button></div>
  </form></dialog>;
}
