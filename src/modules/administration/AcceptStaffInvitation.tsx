import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { acceptInvitation } from '../../api/staff-admin';
import { Button, Panel } from '../../design/components';
import { BrandLogo } from '../../app/BrandLogo';
export function AcceptStaffInvitation() {
  const { i18n } = useTranslation();
  const sw = i18n.language.startsWith('sw');
  const text = (en: string, translation: string) => sw ? translation : en;
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const running = useRef(false);
  useEffect(() => { window.history.replaceState(window.history.state, '', window.location.pathname); }, []);
  return <main className="login-page"><section className="login-card"><BrandLogo/><Panel title={text('Accept your staff invitation', 'Kubali mwaliko wa mtumishi')}>
    {done ? <><p role="status">{text('Your password is set. Sign in and enroll an authenticator before accessing the console.', 'Nenosiri limewekwa. Ingia na usanidi kithibitishaji kabla ya kufikia mfumo.')}</p><Link className="button primary" to="/login">{text('Sign in', 'Ingia')}</Link></> : <form onSubmit={event => { event.preventDefault(); if (running.current || !/^[a-zA-Z0-9]{64}$/.test(token)) return; running.current = true; setBusy(true); setError(''); void acceptInvitation({ token, password, password_confirmation: confirmation }).then(() => { setPassword(''); setConfirmation(''); setDone(true); }).catch(() => setError(text('The invitation could not be accepted. It may be expired, revoked or changed. Check your password requirements or request a new invitation.', 'Mwaliko haukukubaliwa. Huenda umeisha muda, umebatilishwa au umebadilika. Hakiki masharti ya nenosiri au omba mwaliko mpya.'))).finally(() => { running.current = false; setBusy(false); }); }}>
      <p>{text('Choose at least 12 characters with upper and lower case letters and a number. This link can be used once.', 'Tumia angalau herufi 12 zenye herufi kubwa, ndogo na namba. Kiungo hiki kinatumika mara moja.')}</p>
      {!token && <p role="alert">{text('Open the complete invitation link from your email.', 'Fungua kiungo kamili cha mwaliko kutoka barua pepe yako.')}</p>}
      <label>{text('New password', 'Nenosiri jipya')}<input type="password" minLength={12} maxLength={128} autoComplete="new-password" required value={password} onChange={event => setPassword(event.target.value)}/></label>
      <label>{text('Confirm password', 'Thibitisha nenosiri')}<input type="password" minLength={12} maxLength={128} autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)}/></label>
      {error && <p role="alert">{error}</p>}<Button type="submit" disabled={busy || !token || password !== confirmation}>{busy ? text('Accepting…', 'Inakubali…') : text('Accept invitation', 'Kubali mwaliko')}</Button>
    </form>}
  </Panel></section></main>;
}
