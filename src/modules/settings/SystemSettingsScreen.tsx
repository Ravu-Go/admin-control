import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LOGO_MAX_BYTES, LOGO_TYPES, loadCompanyProfile, removeCompanyLogo, updateCompanyProfile, uploadCompanyLogo, type CompanyProfile } from '../../api/company-profile';
import { StaffAuthError } from '../../api/staff-auth';
import { CriticalActionDialog } from '../../app/CriticalActionDialog';
import { refreshBranding } from '../../app/BrandLogo';
import { useStaffSession } from '../../app/StaffSession';
import { Button, ConfirmDialog, Panel, type ConfirmedCommand } from '../../design/components';
import './SystemSettingsScreen.css';

type Details = { name: string; address: string; support_email: string; support_phone: string };
type Pending = { kind: 'details'; values: Details } | { kind: 'logo'; file: File } | { kind: 'remove' };
type Authorization = { pending: Pending; command: ConfirmedCommand };

const phonePattern = /^\+[1-9][0-9]{7,14}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fromProfile = (profile: CompanyProfile): Details => ({ name: profile.name, address: profile.office_location?.address ?? '', support_email: profile.support_email ?? '', support_phone: profile.support_phone ?? '' });

export function SystemSettingsScreen() {
  const { i18n } = useTranslation();
  const sw = i18n.language.startsWith('sw');
  const text = (en: string, translation: string) => sw ? translation : en;
  const { session, clear } = useStaffSession();
  const client = useQueryClient();
  const id = useId();
  const canRead = !!session?.permissions.includes('settings.read');
  const canManage = !!session?.permissions.includes('settings.manage');
  const profile = useQuery({ queryKey: ['company-profile'], queryFn: ({ signal }) => loadCompanyProfile(signal), enabled: canRead, retry: false });
  const [draft, setDraft] = useState<Details | null>(null);
  const [touched, setTouched] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [authorization, setAuthorization] = useState<Authorization | null>(null);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const expired = profile.error instanceof StaffAuthError && [401, 419].includes(profile.error.status);
  useEffect(() => { if (expired) clear(); }, [expired, clear]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const current = profile.data;
  const values = draft ?? (current ? fromProfile(current) : null);
  const errors = values ? {
    name: values.name.trim() ? '' : text('Enter the app name.', 'Weka jina la programu.'),
    support_email: !values.support_email.trim() || emailPattern.test(values.support_email.trim()) ? '' : text('Enter a valid email address, or leave it empty.', 'Weka barua pepe sahihi, au iache tupu.'),
    support_phone: !values.support_phone.trim() || phonePattern.test(values.support_phone.trim()) ? '' : text('Use international format, for example +255700000000.', 'Tumia muundo wa kimataifa, kwa mfano +255700000000.'),
  } : null;
  const changed = !!(current && values && JSON.stringify(fromProfile(current)) !== JSON.stringify({ ...values, name: values.name.trim(), address: values.address.trim(), support_email: values.support_email.trim().toLowerCase(), support_phone: values.support_phone.trim() }));
  const valid = !!errors && !errors.name && !errors.support_email && !errors.support_phone;
  const edit = (key: keyof Details) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setNotice(''); setDraft({ ...(values as Details), [key]: event.target.value }); };
  const explain = (error: unknown) => error instanceof StaffAuthError && error.status === 409
    ? text('Someone else changed the settings first. Nothing was saved. Reload to see the latest version.', 'Mtu mwingine amebadilisha mipangilio kwanza. Hakuna kilichohifadhiwa. Pakia upya kuona toleo jipya.')
    : error instanceof StaffAuthError && error.status === 422
      ? text('The server rejected a value. Check the fields and try again.', 'Seva imekataa thamani. Hakiki sehemu na ujaribu tena.')
      : error instanceof StaffAuthError && error.status === 403
        ? text('You do not have permission to change system settings.', 'Huna ruhusa ya kubadilisha mipangilio ya mfumo.')
        : text('The change could not be confirmed. No automatic retry was made. Reload before trying again.', 'Mabadiliko hayakuthibitishwa. Hayajarudiwa kiotomatiki. Pakia upya kabla ya kujaribu tena.');

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = '';
    setNotice(''); setFileError('');
    if (!selected) return;
    if (!(LOGO_TYPES as readonly string[]).includes(selected.type)) { setFileError(text('Choose a PNG, JPEG or WebP image. SVG is not accepted.', 'Chagua picha ya PNG, JPEG au WebP. SVG haikubaliwi.')); return; }
    if (selected.size > LOGO_MAX_BYTES) { setFileError(text('Choose an image of 2 MB or less.', 'Chagua picha ya MB 2 au chini.')); return; }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };
  const clearFile = () => { setFile(null); setPreview(null); setFileError(''); };
  const run = async ({ pending: selected, command }: Authorization) => {
    if (!current) return;
    const change = { version: current.version, reason: command.reason };
    const saved = selected.kind === 'details'
      ? await updateCompanyProfile({ ...change, name: selected.values.name.trim(), address: selected.values.address.trim() || null,
        support_email: selected.values.support_email.trim().toLowerCase() || null, support_phone: selected.values.support_phone.trim() || null }, command.idempotencyKey)
      : selected.kind === 'logo' ? await uploadCompanyLogo(selected.file, change, command.idempotencyKey) : await removeCompanyLogo(change, command.idempotencyKey);
    client.setQueryData(['company-profile'], saved);
    refreshBranding();
    setDraft(null); setTouched(false); clearFile();
    setNotice(selected.kind === 'details' ? text('Settings saved. Apps and the website show them now.', 'Mipangilio imehifadhiwa. Programu na tovuti zinaionyesha sasa.')
      : selected.kind === 'logo' ? text('Logo updated.', 'Nembo imesasishwa.') : text('Logo removed. The Ravu logo is shown instead.', 'Nembo imeondolewa. Nembo ya Ravu inaonyeshwa badala yake.'));
  };
  const submitDetails = (event: FormEvent) => {
    event.preventDefault(); setTouched(true);
    if (!values || !valid || !changed) return;
    setFailure(''); setPending({ kind: 'details', values });
  };

  if (!canRead) return <Panel title={text('App configuration unavailable', 'Usanidi wa programu haupatikani')}><p>{text('You need permission to view system settings.', 'Unahitaji ruhusa kuona mipangilio ya mfumo.')}</p></Panel>;
  const logoUrl = preview ?? current?.logo_url ?? null;
  const updated = current?.updated_at ? new Intl.DateTimeFormat(sw ? 'sw-TZ' : 'en-TZ', { timeZone: 'Africa/Dar_es_Salaam', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(current.updated_at)) + ' EAT' : null;
  return <div className="system-settings">
    <p className="settings-lead">{text('Shown in the apps, the website and this console.', 'Huonyeshwa kwenye programu, tovuti na mfumo huu.')}</p>
    {notice && <p role="status" className="access-notice">{notice}</p>}
    {failure && <div role="alert" className="access-notice settings-failure">{failure}<Button kind="secondary" onClick={() => { setFailure(''); setDraft(null); void profile.refetch(); }}>{text('Reload', 'Pakia upya')}</Button></div>}
    {profile.isPending ? <Panel title={text('Loading settings', 'Inapakia mipangilio')}><p role="status">{text('Retrieving the current configuration…', 'Inapata usanidi wa sasa…')}</p></Panel>
      : profile.error || !current || !values ? <Panel title={text('Settings unavailable', 'Mipangilio haipatikani')}><p role="alert">{explain(profile.error)}</p><Button kind="secondary" onClick={() => void profile.refetch()}>{text('Try again', 'Jaribu tena')}</Button></Panel>
      : <div className="settings-grid">
        <Panel title={text('Logo', 'Nembo')}>
          <div className="logo-stage">
            <div className="logo-preview logo-preview-dark">{logoUrl ? <span className="logo-tile"><img src={logoUrl} alt={text('Logo preview on the navy sidebar', 'Hakiki ya nembo kwenye upau wa pembeni')}/></span> : <img className="logo-default" src="/brand/ravu-logo-white.png" alt={text('Default Ravu logo', 'Nembo ya Ravu ya kawaida')}/>}</div>
            <div className="logo-preview logo-preview-light">{logoUrl ? <img src={logoUrl} alt={text('Logo preview on a light background', 'Hakiki ya nembo kwenye mandhari angavu')}/> : <span className="logo-placeholder">{text('No custom logo', 'Hakuna nembo maalum')}</span>}</div>
          </div>
          <p className="settings-hint" id={`${id}-logo-hint`}>{text('PNG, JPEG or WebP, up to 2 MB and 4096 × 4096 px. A square image works best.', 'PNG, JPEG au WebP, hadi MB 2 na pikseli 4096 × 4096. Picha ya mraba inafaa zaidi.')}</p>
          {file && <p className="settings-selected">{text('Selected', 'Imechaguliwa')}: <strong>{file.name}</strong> · {Math.ceil(file.size / 1024)} KB</p>}
          {fileError && <p className="field-error" role="alert">{fileError}</p>}
          <input ref={fileInput} id={`${id}-logo`} className="visually-hidden" type="file" tabIndex={-1} aria-label={text('Logo image file', 'Faili ya picha ya nembo')} accept={LOGO_TYPES.join(',')} aria-describedby={`${id}-logo-hint`} disabled={!canManage} onChange={chooseFile}/>
          <div className="dialog-actions settings-actions">
            {file ? <><Button kind="secondary" onClick={() => { setFailure(''); setPending({ kind: 'logo', file }); }}>{text('Upload logo…', 'Pakia nembo…')}</Button><Button kind="secondary" onClick={clearFile}>{text('Cancel', 'Ghairi')}</Button></>
              : <><Button kind="secondary" disabled={!canManage} onClick={() => fileInput.current?.click()}>{text(current.logo_url ? 'Replace logo' : 'Choose logo', current.logo_url ? 'Badilisha nembo' : 'Chagua nembo')}</Button>
                {current.logo_url && <Button kind="secondary" disabled={!canManage} onClick={() => { setFailure(''); setPending({ kind: 'remove' }); }}>{text('Remove…', 'Ondoa…')}</Button>}</>}
          </div>
        </Panel>
        <Panel title={text('App details', 'Maelezo ya programu')} info={!canManage ? <p>{text('View only. Changing settings needs the settings.manage permission.', 'Kusoma tu. Kubadilisha mipangilio kunahitaji ruhusa ya settings.manage.')}</p> : undefined}>
          <form className="settings-form" noValidate onSubmit={submitDetails}>
            <label htmlFor={`${id}-name`}>{text('App name', 'Jina la programu')}</label>
            <input id={`${id}-name`} value={values.name} maxLength={120} required disabled={!canManage} onChange={edit('name')} aria-invalid={touched && !!errors?.name} aria-describedby={touched && errors?.name ? `${id}-name-error` : undefined}/>
            {touched && errors?.name && <p id={`${id}-name-error`} className="field-error" role="alert">{errors.name}</p>}
            <label htmlFor={`${id}-email`}>{text('Support email', 'Barua pepe ya msaada')}</label>
            <input id={`${id}-email`} type="email" inputMode="email" autoComplete="off" value={values.support_email} maxLength={254} disabled={!canManage} onChange={edit('support_email')} aria-invalid={touched && !!errors?.support_email} aria-describedby={touched && errors?.support_email ? `${id}-email-error` : undefined}/>
            {touched && errors?.support_email && <p id={`${id}-email-error`} className="field-error" role="alert">{errors.support_email}</p>}
            <label htmlFor={`${id}-phone`}>{text('Support phone', 'Simu ya msaada')}</label>
            <input id={`${id}-phone`} type="tel" inputMode="tel" autoComplete="off" placeholder="+255700000000" value={values.support_phone} maxLength={16} disabled={!canManage} onChange={edit('support_phone')} aria-invalid={touched && !!errors?.support_phone} aria-describedby={touched && errors?.support_phone ? `${id}-phone-error` : undefined}/>
            {touched && errors?.support_phone && <p id={`${id}-phone-error`} className="field-error" role="alert">{errors.support_phone}</p>}
            <label htmlFor={`${id}-address`}>{text('Office address', 'Anwani ya ofisi')}</label>
            <textarea id={`${id}-address`} rows={3} value={values.address} maxLength={500} disabled={!canManage} onChange={edit('address')}/>
            <div className="dialog-actions settings-actions">
              <Button kind="secondary" type="submit" disabled={!canManage || !changed}>{text('Save changes…', 'Hifadhi mabadiliko…')}</Button>
              {draft && changed && <Button kind="secondary" onClick={() => { setDraft(null); setTouched(false); }}>{text('Discard', 'Tupa')}</Button>}
            </div>
          </form>
        </Panel>
        <p className="settings-meta">{text('Version', 'Toleo')} {current.version}{updated ? ` · ${text('Last changed', 'Ilibadilishwa')} ${updated}` : ` · ${text('Using defaults', 'Inatumia chaguo-msingi')}`}</p>
      </div>}
    {pending && current && <ConfirmDialog title={pending.kind === 'details' ? text('Save app details', 'Hifadhi maelezo ya programu') : pending.kind === 'logo' ? text('Upload logo', 'Pakia nembo') : text('Remove logo', 'Ondoa nembo')}
      version={current.version} currentVersion={current.version} canConfirm={canManage} onCancel={() => setPending(null)}
      onConfirm={command => new Promise<void>(resolve => { setAuthorization({ pending, command }); setPending(null); resolve(); })}/>}
    {authorization && <CriticalActionDialog action="settings.manage" contextKey={JSON.stringify([authorization.pending.kind, current?.version, authorization.command.idempotencyKey])}
      actionLabel={text('Change system settings', 'Badilisha mipangilio ya mfumo')}
      onCancel={() => setAuthorization(null)}
      onVerified={() => { const selected = authorization; setAuthorization(null); void run(selected).catch(error => { setFailure(explain(error)); if (error instanceof StaffAuthError && [401, 419].includes(error.status)) clear(); }); }}/>}
  </div>;
}
