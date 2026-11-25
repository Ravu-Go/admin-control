import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { sendPasswordCode, changeStaffPassword, StaffAuthError } from '../api/staff-auth';
import { VerificationCodeInput } from '../design/VerificationCodeInput';

/** Credentials live only in this form; requests are cancelled on departure. */
export function PasswordChange({ onChanged }: { onChanged: () => void }) {
  const { t } = useTranslation();
  const [challenge, setChallenge] = useState<{ expiresAt: number; retryAt: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [visible, setVisible] = useState(false);
  const currentPassword = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement | null>(null);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const form = useForm({ resolver: zodResolver(z.object({
    code: z.string().regex(/^\d{6}$/, t('codeError')),
    password: z.string().min(12, t('newPasswordPolicy')).max(128, t('newPasswordPolicy')).regex(/[a-z]/, t('newPasswordPolicy')).regex(/[A-Z]/, t('newPasswordPolicy')).regex(/[0-9]/, t('newPasswordPolicy')),
    password_confirmation: z.string().min(1, t('passwordMismatch')),
  }).refine(values => values.password === values.password_confirmation, { path: ['password_confirmation'], message: t('passwordMismatch') })), defaultValues: { code: '', password: '', password_confirmation: '' } });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; request.current?.abort(); }; }, []);
  useEffect(() => {
    if (!challenge) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challenge]);
  useEffect(() => { if (challenge && !resending) codeInput.current?.focus(); else currentPassword.current?.focus(); }, [challenge, resending]);
  const remaining = challenge ? Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000)) : 0;
  const cooldown = challenge ? Math.max(0, Math.ceil((challenge.retryAt - now) / 1000)) : 0;
  const expired = !!challenge && remaining === 0;
  const report = (failure: unknown, sending: boolean) => setError(failure instanceof StaffAuthError && failure.status === 429 ? 'loginRateLimited' : failure instanceof StaffAuthError && failure.status === 422 ? sending ? 'currentPasswordInvalid' : 'passwordVerificationFailed' : failure instanceof StaffAuthError && [401,419].includes(failure.status) ? 'loginExpired' : 'passwordChangeUnavailable');
  const send = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (request.current || cooldown || !currentPassword.current) return;
    const password = currentPassword.current.value;
    currentPassword.current.value = '';
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError('');
    try {
      const timing = await sendPasswordCode({ current_password: password }, controller.signal);
      if (!mounted.current || controller.signal.aborted) return;
      const receivedAt = Date.now();
      setNow(receivedAt); setChallenge({ expiresAt: receivedAt + timing.expires_in * 1000, retryAt: receivedAt + timing.resend_after * 1000 });
      setResending(false); setVisible(false); form.reset();
    } catch (failure) { if (mounted.current && !controller.signal.aborted) report(failure, true); }
    finally { if (request.current === controller) request.current = null; if (mounted.current) setBusy(false); }
  };
  const submit = async (values: { code: string; password: string; password_confirmation: string }) => {
    if (request.current || !challenge || Date.now() >= challenge.expiresAt) return;
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(''); setVisible(false); form.reset();
    try { await changeStaffPassword(values, controller.signal); if (mounted.current && !controller.signal.aborted) onChanged(); }
    catch (failure) { if (mounted.current && !controller.signal.aborted) { report(failure, false); codeInput.current?.focus(); } }
    finally { if (request.current === controller) request.current = null; if (mounted.current) setBusy(false); }
  };
  return <section className="password-change" aria-label={t('changePassword')}>
    <ol className="password-steps" aria-label={t('verificationSteps')}>
      <li className={challenge ? 'is-complete' : 'is-active'} aria-current={!challenge ? 'step' : undefined}><span aria-hidden="true">{challenge ? '✓' : '1'}</span>{t('confirmIdentity')}</li>
      <li className={challenge ? 'is-active' : ''} aria-current={challenge ? 'step' : undefined}><span aria-hidden="true">2</span>{t('verifyEmail')}</li>
    </ol>
    <div className="password-verification-card">
      <div className="verification-heading"><span className="verification-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg></span><div><h2>{t(challenge ? 'checkYourEmail' : 'securePasswordTitle')}</h2><p>{t(challenge ? 'emailCodeHelp' : 'passwordCodeHelp')}</p></div></div>
      {!challenge && <form onSubmit={event => void send(event)} aria-busy={busy}>
        <label htmlFor="change-current">{t('currentPassword')}</label><input ref={currentPassword} id="change-current" name="current_password" type="password" autoComplete="current-password" required maxLength={512} disabled={busy}/>
        <button type="submit" className="button primary verification-submit" disabled={busy}>{t(busy ? 'sendingCode' : 'sendCode')}</button>
      </form>}
      {challenge && <>
        <p role="status" className="verification-sent">{t('emailCodeSent')}</p>
        <form noValidate onSubmit={event => void form.handleSubmit(submit)(event)} aria-busy={busy}>
          <Controller control={form.control} name="code" render={({ field, fieldState }) => <VerificationCodeInput {...field} ref={element => { field.ref(element); codeInput.current = element; }} id="password-email-code" label={t('emailVerificationCode')} error={fieldState.error?.message} disabled={busy || expired} aria-describedby="email-code-expiry"/>}/>
          <p id="email-code-expiry" className={expired ? 'field-error' : 'verification-expiry'} role="timer" aria-live="off">{expired ? t('emailCodeExpired') : t('emailCodeExpires', { time: String(Math.floor(remaining / 60)).padStart(2, '0') + ':' + String(remaining % 60).padStart(2, '0') })}</p>
          <label htmlFor="change-new">{t('newPassword')}</label><div className="password-field"><input id="change-new" type={visible ? 'text' : 'password'} autoComplete="new-password" maxLength={128} {...form.register('password')} disabled={busy || expired} aria-invalid={!!form.formState.errors.password} aria-describedby="password-policy"/><button type="button" aria-label={t(visible ? 'hidePassword' : 'showPassword')} aria-pressed={visible} disabled={busy} onClick={() => setVisible(!visible)}>{t(visible ? 'hide' : 'show')}</button></div>
          <p id="password-policy" className="password-policy">{t('newPasswordPolicy')}</p>
          {form.formState.errors.password && <p className="field-error" role="alert">{form.formState.errors.password.message}</p>}
          <label htmlFor="change-confirm">{t('confirmPassword')}</label><input id="change-confirm" type="password" autoComplete="new-password" maxLength={128} {...form.register('password_confirmation')} disabled={busy || expired} aria-invalid={!!form.formState.errors.password_confirmation} aria-describedby={form.formState.errors.password_confirmation ? 'confirm-password-error' : undefined}/>
          {form.formState.errors.password_confirmation && <p id="confirm-password-error" className="field-error" role="alert">{form.formState.errors.password_confirmation.message}</p>}
          <button type="submit" className="button primary verification-submit" disabled={busy || expired}>{t(busy ? 'verifying' : 'confirmPasswordChange')}</button>
        </form>
        <div className="verification-resend">
          <p>{t('noEmailCode')}</p>
          {!resending && <button type="button" className="verification-resend-button" disabled={busy || cooldown > 0} onClick={() => { setResending(true); setError(''); }}>{cooldown > 0 ? t('resendCountdown', { count: cooldown }) : t('resendCode')}</button>}
          {resending && <form onSubmit={event => void send(event)} aria-busy={busy}>
            <label htmlFor="resend-current">{t('currentPassword')}</label><input ref={currentPassword} id="resend-current" name="current_password" type="password" autoComplete="current-password" required maxLength={512} disabled={busy}/>
            <div className="verification-resend-actions"><button type="submit" className="button secondary" disabled={busy || cooldown > 0}>{t(busy ? 'sendingCode' : 'resendCode')}</button><button type="button" className="button secondary" disabled={busy} onClick={() => { if (currentPassword.current) currentPassword.current.value = ''; setResending(false); setError(''); }}>{t('cancel')}</button></div>
          </form>}
        </div>
      </>}
      {error && <p role="alert" className="login-error">{t(error)}</p>}
    </div>
    <p className="verification-security-note"><svg aria-hidden="true" width="16" height="18" viewBox="0 0 16 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 1 14 4v5c0 4-6 7-6 7S2 13 2 9V4Z"/><path d="m5 8 2 2 4-4"/></svg>{t('passwordSessionNotice')}</p>
  </section>;
}
