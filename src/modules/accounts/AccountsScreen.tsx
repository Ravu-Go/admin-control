import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { changeAccountStatus, loadAccount, loadAccounts, type Account, type AccountDetail } from '../../api/accounts';
import { StaffAuthError } from '../../api/staff-auth';
import { useStaffSession } from '../../app/StaffSession';
import { Button, Panel, StatusBadge, Timeline } from '../../design/components';
import { DataTable } from '../../design/DataTable';
import { PageHeader } from '../../design/PageHeader';
import { LoadingState } from '../../design/States';
import { Tabs, TabPanel, useQueryChoice } from '../../design/Tabs';
import { SegmentedFilter } from '../../design/SegmentedFilter';
import { Pager } from '../administration/ListToolbar';
import './AccountsScreen.css';

const views = ['all', 'drivers', 'clients', 'needs_review'] as const;
const sections = ['overview', 'documents', 'trips', 'membership'] as const;
function useCopy() {
  const { i18n } = useTranslation();
  const sw = i18n.language.startsWith('sw');
  return { sw, text: (en: string, translation: string) => sw ? translation : en };
}
function useExpiry(error: unknown) {
  const { clear } = useStaffSession();
  useEffect(() => { if (error instanceof StaffAuthError && [401, 419].includes(error.status)) clear(); }, [error, clear]);
}
function Failure({ error, retry }: { error: unknown; retry: () => void }) {
  const { text } = useCopy();
  const denied = error instanceof StaffAuthError && error.status === 403;
  return <Panel title={denied ? text('Access unavailable', 'Ufikiaji haupatikani') : text('Accounts unavailable', 'Akaunti hazipatikani')}>
    <p role="alert">{denied ? text('Your permissions or account scope do not allow this view.', 'Ruhusa au wigo wako hauruhusu mwonekano huu.') : text('The current record could not be loaded. Reconnect and try again.', 'Rekodi ya sasa haikuweza kupakiwa. Unganisha tena na ujaribu.')}</p>
    <Button kind="secondary" onClick={retry}>{text('Reload', 'Pakia tena')}</Button>
  </Panel>;
}
export function AccountState({ value }: { value: string }) {
  const { text } = useCopy();
  const labels: Record<string, string> = { active: text('Active', 'Hai'), suspended: text('Suspended', 'Imesimamishwa'), closed: text('Closed', 'Imefungwa'), verified: text('Verified', 'Imethibitishwa'), expired: text('Expired', 'Imeisha muda'), under_review: text('Under review', 'Inakaguliwa'), rejected: text('Rejected', 'Imekataliwa'), pending: text('Pending', 'Inasubiri'), not_started: text('Not started', 'Haijaanza'), inactive: text('Inactive', 'Si hai') };
  return <StatusBadge status={['active', 'verified'].includes(value) ? 'success' : ['suspended', 'closed', 'expired', 'rejected'].includes(value) ? 'danger' : 'neutral'} label={labels[value] ?? text('Unavailable', 'Haipatikani')}/>;
}
export function AccountsScreen() {
  const { text, sw } = useCopy();
  const [view, setView] = useQueryChoice('view', views, 'all');
  const [page, setPage] = useState(1);
  const result = useQuery({ queryKey: ['accounts', view, page], queryFn: ({ signal }) => loadAccounts({ page, view }, signal), retry: false });
  useExpiry(result.error);
  const columns: ColumnDef<Account>[] = [
    { id: 'account', header: text('Account / ID', 'Akaunti / ID'), cell: ({ row: { original: a } }) => <strong>{a.display_name} · {a.id}</strong> },
    { id: 'kind', header: text('Surface', 'Aina'), cell: ({ row }) => row.original.kind === 'driver' ? text('Driver', 'Dereva') : text('Client', 'Mteja') },
    { id: 'area', header: text('Area', 'Eneo'), cell: ({ row }) => row.original.area_name?.[sw ? 'sw' : 'en'] ?? '—' },
    { id: 'status', header: text('Account', 'Akaunti'), cell: ({ row }) => <AccountState value={row.original.account_status}/> },
    { id: 'documents', header: text('Documents', 'Nyaraka'), cell: ({ row }) => row.original.kind === 'driver' ? <AccountState value={row.original.verification_status}/> : text('Not applicable', 'Haihusiki') },
    { id: 'action', header: text('Action', 'Hatua'), cell: ({ row }) => <Link to={`/accounts/${encodeURIComponent(row.original.id)}`} aria-label={`${text('Open account', 'Fungua akaunti')} ${row.original.id}`}>{text('Open account', 'Fungua akaunti')}</Link> },
  ];
  return <div className="accounts-screen">
    <PageHeader title={text('Accounts', 'Akaunti')} subtitle={text('One directory for clients and drivers · Sensitive contact fields are masked by default', 'Orodha moja ya wateja na madereva · Mawasiliano nyeti yamefichwa kwa chaguomsingi')}
      action={<Button kind="secondary" disabled aria-describedby="account-export-help">{text('Export masked list', 'Hamisha orodha iliyofichwa')}</Button>}/>
    <div className="accounts-filters"><SegmentedFilter label={text('Account directory filter', 'Chujio cha akaunti')} value={view} onChange={value => { setView(value as typeof view); setPage(1); }} options={views.map(id => ({ id, label: ({ all: text('All accounts', 'Akaunti zote'), drivers: text('Drivers', 'Madereva'), clients: text('Clients', 'Wateja'), needs_review: text('Needs review', 'Zinahitaji ukaguzi') })[id] }))}/></div>
    {result.isPending ? <LoadingState previousTimestamp={null}/> : result.isError ? <Failure error={result.error} retry={() => void result.refetch()}/> : <Panel className="account-directory" title={text('Account directory', 'Orodha ya akaunti')}>
      <DataTable rows={result.data.data} columns={columns} filterable={false} externalPagination loading={result.isFetching} previousTimestamp={null}/>
      <p className="muted">{result.data.meta.pagination.total} {text('accounts · No bulk approval or suspension', 'akaunti · Hakuna kuidhinisha au kusimamisha kwa pamoja')}</p>
      <Pager page={page} last={result.data.meta.pagination.last_page} onPage={setPage} labels={{ previous: text('Previous', 'Iliyotangulia'), next: text('Next', 'Inayofuata'), page: text('Page', 'Ukurasa'), of: text('of', 'kati ya') }}/>
    </Panel>}
    <Panel title={text('Review without guessing', 'Kagua bila kubahatisha')} description={text('Open the full account record, evidence and previous decisions before changing account access.', 'Fungua rekodi kamili, ushahidi na maamuzi yaliyotangulia kabla ya kubadili ufikiaji.')}><span/></Panel>
    <p id="account-export-help" className="muted">{text('Controlled exports are not connected yet. Contacts remain masked; no personal data is exported.', 'Uhamishaji unaodhibitiwa haujaunganishwa bado. Mawasiliano yamefichwa; hakuna taarifa binafsi zinazohamishwa.')}</p>
  </div>;
}

export function AccountReviewScreen() {
  const { accountId = '' } = useParams();
  const { session } = useStaffSession();
  const { text } = useCopy();
  const [section, setSection] = useQueryChoice('section', sections, 'overview');
  const [editing, setEditing] = useState<AccountDetail | null>(null);
  const [notice, setNotice] = useState('');
  const client = useQueryClient();
  const result = useQuery({ queryKey: ['account', accountId], queryFn: ({ signal }) => loadAccount(accountId, signal), retry: false });
  useExpiry(result.error);
  if (result.isPending) return <LoadingState previousTimestamp={null}/>;
  if (result.isError) return <Failure error={result.error} retry={() => void result.refetch()}/>;
  const account = result.data;
  const canManage = !!session?.permissions.includes('accounts.manage') && account.account_status !== 'closed';
  return <div className="accounts-screen">
    <PageHeader title={`${text('Account review', 'Ukaguzi wa akaunti')} · ${account.display_name}`} subtitle={`${account.kind === 'driver' ? text('Driver', 'Dereva') : text('Client', 'Mteja')} ${account.id} · ${account.phone_masked}`}
      above={<Link to="/accounts">← {text('Account directory', 'Orodha ya akaunti')}</Link>}
      action={canManage && !editing ? <Button kind={account.account_status === 'suspended' ? 'primary' : 'danger'} onClick={() => { setNotice(''); setEditing(account); setSection('overview'); }}>{account.account_status === 'suspended' ? text('Reinstate account…', 'Rejesha akaunti…') : text('Suspend account…', 'Simamisha akaunti…')}</Button> : undefined}
      tabs={<Tabs label={text('Account review sections', 'Sehemu za ukaguzi')} idPrefix="account-review" value={section} onChange={value => setSection(value as typeof section)} items={sections.map(id => ({ id, label: ({ overview: text('Overview', 'Muhtasari'), documents: text('Documents', 'Nyaraka'), trips: text('Trips', 'Safari'), membership: text('Membership', 'Uanachama') })[id] }))}/>}/>
    {notice && <p role="status">{notice}</p>}
    <TabPanel id={section} idPrefix="account-review">
      {section === 'overview' ? <div className="account-review-grid"><div className="account-review-summary">
        <Panel title={text('Account and dispatch eligibility', 'Akaunti na ustahiki wa safari')} description={text('Keep account status, document status and membership distinct', 'Hali ya akaunti, nyaraka na uanachama ni tofauti')}>
          <dl className="account-facts"><dt>{text('Account', 'Akaunti')}</dt><dd><AccountState value={account.account_status}/></dd>
            <dt>{text('Required documents', 'Nyaraka zinazohitajika')}</dt><dd>{account.kind === 'driver' ? <AccountState value={account.verification_status}/> : text('Not applicable', 'Haihusiki')}</dd>
            <dt>{text('Membership', 'Uanachama')}</dt><dd>{account.membership_status ? <AccountState value={account.membership_status}/> : text('Not applicable', 'Haihusiki')}</dd>
            <dt>{text('Dispatch', 'Ugawaji wa safari')}</dt><dd>{account.kind !== 'driver' ? text('Not applicable', 'Haihusiki') : account.dispatch_eligibility.eligible ? text('Eligible now', 'Anastahiki sasa') : <><strong>{text('Paused', 'Imesitishwa')}</strong><ul>{account.dispatch_eligibility.blockers.map(reason => <li key={reason}>{blockerLabel(reason, text)}</li>)}</ul></>}</dd>
          </dl>
          <p className="muted">{text('Eligibility is calculated by the server. LATRA is required for bodas and bajajis, valid for one year and bound to the registered vehicle. Insurance is optional.', 'Ustahiki unakokotolewa na seva. LATRA ni lazima kwa boda na bajaji, hudumu mwaka mmoja na inahusishwa na gari lililosajiliwa. Bima ni ya hiari.')}</p>
        </Panel>
        <Panel title={text('Review history', 'Historia ya ukaguzi')}>
          {account.history.length ? <Timeline items={account.history.map(event => ({ id: event.id, dateTime: event.created_at, title: new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Dar_es_Salaam', dateStyle: 'medium' }).format(new Date(event.created_at)) + ' · ' + text('Account access decision recorded', 'Uamuzi wa ufikiaji umerekodiwa'), detail: event.action === 'account.closed' ? text('Account closed; history retained.', 'Akaunti imefungwa; historia imehifadhiwa.') : text('Audited decision retained in the system.', 'Uamuzi uliokaguliwa umehifadhiwa kwenye mfumo.') }))}/> : <p>{text('No account access decisions recorded.', 'Hakuna maamuzi ya ufikiaji yaliyorekodiwa.')}</p>}
        </Panel>
      </div>{editing && <StatusEditor key={editing.id} account={editing} canManage={canManage} onCancel={() => setEditing(null)} onSaved={async () => {
        setEditing(null); setNotice(text('Account access updated. Eligibility requirements still apply. Member-facing reasons are retained; message delivery is not connected yet.', 'Ufikiaji umesasishwa. Masharti ya ustahiki bado yanatumika. Sababu zimehifadhiwa; utumaji ujumbe haujaunganishwa bado.'));
        await client.invalidateQueries({ queryKey: ['account', accountId] }); await client.invalidateQueries({ queryKey: ['accounts'] });
      }}/>}</div> : <Panel title={text('Module not connected yet', 'Sehemu haijaunganishwa bado')} description={text('The dedicated review workflow will be connected in its Phase 5 module. No document, trip or membership decision can be made here.', 'Mtitiriko wa ukaguzi utaunganishwa katika sehemu yake ya Awamu ya 5. Hakuna uamuzi wa nyaraka, safari au uanachama hapa.')}><span/></Panel>}
    </TabPanel>
  </div>;
}

function blockerLabel(reason: string, text: (en: string, sw: string) => string): string {
  const known: Record<string, string> = {
    account_unavailable: text('Account unavailable', 'Akaunti haipatikani'), phone_unverified: text('Verify phone number', 'Thibitisha namba ya simu'), vehicle_incomplete: text('Complete vehicle details', 'Kamilisha taarifa za gari'),
    membership_inactive: text('Activate annual membership', 'Wezesha uanachama wa mwaka'), driver_offline: text('Driver is offline', 'Dereva hayupo mtandaoni'), position_stale_or_inaccurate: text('Update accurate location', 'Sasisha eneo sahihi'), driver_busy: text('Driver has an active trip', 'Dereva ana safari inayoendelea'),
    document_latra_licence_vehicle_mismatch: text('LATRA licence belongs to another vehicle', 'Leseni ya LATRA ni ya gari jingine'),
  };
  if (known[reason]) return known[reason];
  const match = /^document_(.+)_(not_approved|expired)$/.exec(reason);
  if (match) {
    const names: Record<string, string> = { nida: 'NIDA', licence: text('Driving licence', 'Leseni ya udereva'), police_report: text('Police report', 'Taarifa ya polisi'), photo: text('Profile photograph', 'Picha ya wasifu'), profile_photo: text('Profile photograph', 'Picha ya wasifu'), latra_licence: text('LATRA licence', 'Leseni ya LATRA') };
    return `${names[match[1] ?? ''] ?? text('Required document', 'Hati inayohitajika')} · ${match[2] === 'expired' ? text('expired', 'imeisha muda') : text('verification incomplete', 'uthibitishaji haujakamilika')}`;
  }
  return text('Eligibility check unavailable; reload before acting.', 'Ukaguzi wa ustahiki haupatikani; pakia tena kabla ya hatua.');
}

function StatusEditor({ account, canManage, onCancel, onSaved }: { account: AccountDetail; canManage: boolean; onCancel: () => void; onSaved: () => Promise<void> }) {
  const { text } = useCopy();
  const { clear } = useStaffSession();
  const client = useQueryClient();
  const suspended = account.account_status === 'suspended';
  const schema = z.object({ en: z.string().trim().min(10, text('Enter at least 10 characters.', 'Weka angalau herufi 10.')).max(2000), sw: z.string().trim().min(10, text('Enter at least 10 characters.', 'Weka angalau herufi 10.')).max(2000), evidence: z.string().max(100).regex(/^[A-Za-z0-9_.:-]*$/, text('Use an internal case ID, not personal data or a URL.', 'Tumia ID ya kesi ya ndani, si taarifa binafsi au URL.')) });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { en: '', sw: '', evidence: '' } });
  const command = useRef<{ json: string; key: string } | null>(null);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [baseline, setBaseline] = useState(account);
  const [checked, setChecked] = useState(true);
  useEffect(() => { document.getElementById('member-reason-en')?.focus(); }, []);
  const inFlight = useRef(false);
  const submit = async (values: z.infer<typeof schema>) => {
    if (!canManage || blocked || !checked || inFlight.current) return;
    inFlight.current = true;
    const payload = { version: baseline.version, status: suspended ? 'active' as const : 'suspended' as const, confirmed: true as const,
      reason: values.en, member_reason: { en: values.en, sw: values.sw }, evidence_reference: values.evidence || null };
    const json = JSON.stringify(payload);
    if (command.current?.json !== json) command.current = { json, key: crypto.randomUUID() };
    setError('');
    try { await changeAccountStatus(account.id, payload, command.current.key); await onSaved(); }
    catch (failure) {
      if (failure instanceof StaffAuthError && [401, 419].includes(failure.status)) { clear(); return; }
      setChecked(false);
      setError(failure instanceof StaffAuthError && failure.status === 403 ? text('Permission changed. This action is blocked.', 'Ruhusa imebadilika. Hatua imezuiwa.')
        : text('The outcome could not be confirmed or the record changed. Your draft is retained. Reload the account before reviewing again.', 'Matokeo hayajathibitishwa au rekodi imebadilika. Rasimu yako imehifadhiwa. Pakia akaunti tena kabla ya kukagua.'));
      if (failure instanceof StaffAuthError && failure.status === 403) setBlocked(true);
    } finally { inFlight.current = false; }
  };
  return <Panel title={suspended ? text('Reinstate account · confirmation', 'Rejesha akaunti · uthibitisho') : text('Suspend account · confirmation', 'Simamisha akaunti · uthibitisho')} description={text('Visible state for authorised administrators only', 'Kwa wasimamizi wenye ruhusa pekee')}>
    <div className="account-warning"><strong>{suspended ? text('Eligibility checks still apply', 'Ukaguzi wa ustahiki bado unatumika') : text('Dispatch will pause', 'Ugawaji wa safari utasitishwa')}</strong><p>{text('History and documents are retained. Reinstatement is a separate action.', 'Historia na nyaraka zinahifadhiwa. Kurejesha ni hatua tofauti.')}</p></div>
    <form noValidate className="account-status-form" onSubmit={event => void handleSubmit(submit)(event)}>
      {(['en', 'sw'] as const).map(locale => <label key={locale} htmlFor={`member-reason-${locale}`}>{text('Member-facing reason', 'Sababu kwa mwanachama')} · {locale.toUpperCase()} · {text('required', 'lazima')}<textarea className="resize-none" id={`member-reason-${locale}`} {...register(locale)} aria-invalid={!!errors[locale]} aria-describedby={errors[locale] ? `error-${locale}` : undefined} disabled={isSubmitting}/>{errors[locale] && <span role="alert" id={`error-${locale}`}>{errors[locale]?.message}</span>}</label>)}
      <label htmlFor="account-evidence">{text('Internal evidence reference · optional', 'Rejea ya ushahidi wa ndani · hiari')}<input id="account-evidence" {...register('evidence')} aria-invalid={!!errors.evidence} aria-describedby={errors.evidence ? 'error-evidence' : undefined} disabled={isSubmitting}/>{errors.evidence && <span id="error-evidence" role="alert">{errors.evidence.message}</span>}</label>
      <p className="muted">{text('The member can contact support and appeal. Reasons are retained in the audit record. Message delivery is not connected yet.', 'Mwanachama anaweza kuwasiliana na msaada na kukata rufaa. Sababu zinahifadhiwa kwenye rekodi ya ukaguzi. Utumaji ujumbe haujaunganishwa bado.')}</p>
      {error && <p role="alert">{error}</p>}
      {!checked && !blocked && <Button kind="secondary" type="button" disabled={isSubmitting} onClick={async () => {
        try {
          const latest = await loadAccount(account.id);
          client.setQueryData(['account', account.id], latest);
          if (latest.account_status !== baseline.account_status) { setBlocked(true); setError(text('Account status has changed. Return to the record to review the recorded result.', 'Hali ya akaunti imebadilika. Rudi kwenye rekodi kukagua matokeo.')); }
          else { setBaseline(latest); setChecked(true); setError(text('Latest account loaded. Review the updated record and confirm again.', 'Akaunti ya sasa imepakiwa. Kagua rekodi iliyosasishwa na uthibitishe tena.')); }
        } catch { setError(text('Account could not be reloaded. Your draft remains here.', 'Akaunti haikuweza kupakiwa tena. Rasimu yako bado ipo hapa.')); }
      }}>{text('Reload account', 'Pakia akaunti tena')}</Button>}
      <div className="two-buttons"><Button type="button" kind="secondary" disabled={isSubmitting} onClick={onCancel}>{text('Cancel', 'Ghairi')}</Button><Button type="submit" kind={suspended ? 'primary' : 'danger'} disabled={isSubmitting || !canManage || blocked || !checked}>{isSubmitting ? text('Saving…', 'Inahifadhi…') : suspended ? text('Confirm reinstatement', 'Thibitisha urejeshaji') : text('Confirm suspension', 'Thibitisha kusimamisha')}</Button></div>
    </form>
  </Panel>;
}
