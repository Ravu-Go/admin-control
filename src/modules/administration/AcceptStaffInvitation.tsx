import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { acceptInvitation } from '../../api/staff-admin';
import { Button } from '../../design/components';
import { BrandLogo } from '../../app/BrandLogo';
import { PasswordInput } from '../../design/PasswordInput';
export function AcceptStaffInvitation() {
  const { i18n } = useTranslation();
  const sw = i18n.language.startsWith('sw');
  const text = (en: string, translation: string) => sw ? translation : en;
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '');
  const [memberMode] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('kind') === 'member');
  const [completedKind, setCompletedKind] = useState('staff');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const running = useRef(false);
  useEffect(() => { window.history.replaceState(window.history.state, '', window.location.pathname); }, []);
  return <div className="login-page"><aside className="login-brand" aria-label="Ravu"><BrandLogo/><div className="login-brand-copy"><p className="login-eyebrow">RAVU</p><h2>{memberMode ? 'Ravu' : text('Control Centre', 'Kituo cha Usimamizi')}</h2><p>{memberMode ? text('Set up your account and continue in the Ravu app.', 'Sanidi akaunti yako na uendelee kwenye programu ya Ravu.') : text('Named staff access with mandatory authenticator verification.', 'Ufikiaji wa watumishi wenye uthibitishaji wa lazima.')}</p></div></aside><main className="login-main"><div className="login-languages" aria-label={text('Language', 'Lugha')}><button aria-pressed={!sw} onClick={() => void i18n.changeLanguage('en')}>EN</button><button aria-pressed={sw} onClick={() => void i18n.changeLanguage('sw')}>SW</button></div><div className="login-form-container"><h1>{memberMode ? text('Set up your Ravu account', 'Sanidi akaunti yako ya Ravu') : text('Accept your staff invitation', 'Kubali mwaliko wa mtumishi')}</h1>
    {done ? <><p role="status">{completedKind === 'staff' ? text('Your password is set. Sign in and enroll an authenticator before accessing the console.', 'Nenosiri limewekwa. Ingia na usanidi kithibitishaji kabla ya kufikia mfumo.') : text('Your password is set. Continue in the Ravu app and verify your phone. Driver and partner verification requirements still apply.', 'Nenosiri limewekwa. Endelea kwenye programu ya Ravu na uthibitishe simu yako. Uhakiki wa madereva na washirika bado unahitajika.')}</p>{completedKind === 'staff' && <Link className="button primary" to="/login">{text('Sign in', 'Ingia')}</Link>}</> : <form onSubmit={event => { event.preventDefault(); if (running.current || !/^[a-zA-Z0-9]{64}$/.test(token)) return; running.current = true; setBusy(true); setError(''); void acceptInvitation({ token, password, password_confirmation: confirmation }).then(kind => { setCompletedKind(kind); setPassword(''); setConfirmation(''); setDone(true); }).catch(() => setError(text('The invitation could not be accepted. It may be expired, revoked or changed. Check your password requirements or request a new invitation.', 'Mwaliko haukukubaliwa. Huenda umeisha muda, umebatilishwa au umebadilika. Hakiki masharti ya nenosiri au omba mwaliko mpya.'))).finally(() => { running.current = false; setBusy(false); }); }}>
      <p>{text('Choose at least 12 characters with upper and lower case letters and a number. This link can be used once.', 'Tumia angalau herufi 12 zenye herufi kubwa, ndogo na namba. Kiungo hiki kinatumika mara moja.')}</p>
      {!token && <p role="alert">{text('Open the complete invitation link from your email.', 'Fungua kiungo kamili cha mwaliko kutoka barua pepe yako.')}</p>}
      <label htmlFor="invite-password">{text('New password', 'Nenosiri jipya')}</label><PasswordInput id="invite-password" minLength={12} maxLength={128} autoComplete="new-password" required value={password} onChange={event => setPassword(event.target.value)}/>
      <label htmlFor="invite-confirmation">{text('Confirm password', 'Thibitisha nenosiri')}</label><PasswordInput id="invite-confirmation" minLength={12} maxLength={128} autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)}/>
      {error && <p role="alert">{error}</p>}<Button type="submit" disabled={busy || !token || password !== confirmation}>{busy ? text('Accepting…', 'Inakubali…') : text('Accept invitation', 'Kubali mwaliko')}</Button>
    </form>}
  </div></main></div>;
}
