import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { sendPasswordCode, changeStaffPassword, StaffAuthError } from '../api/staff-auth';

/** Credentials stay in component memory and are cleared after every submission. */
export function PasswordChange({ onChanged }: { onChanged: () => void }) {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  const form = useForm({ resolver: zodResolver(z.object({ code: z.string().regex(/^\d{6}$/, t('codeError')),
    password: z.string().min(12, t('newPasswordPolicy')).max(128).regex(/[a-z]/, t('newPasswordPolicy')).regex(/[A-Z]/, t('newPasswordPolicy')).regex(/[0-9]/, t('newPasswordPolicy')),
    password_confirmation: z.string().min(1),
  }).refine(values => values.password === values.password_confirmation, { path: ['password_confirmation'], message: t('passwordMismatch') })), defaultValues: { code: '', password: '', password_confirmation: '' } });
  const report = (failure: unknown) => setError(failure instanceof StaffAuthError && failure.status === 429 ? 'loginRateLimited' : failure instanceof StaffAuthError && failure.status === 422 ? 'passwordVerificationFailed' : failure instanceof StaffAuthError && [401,419].includes(failure.status) ? 'loginExpired' : 'passwordChangeUnavailable');
  return <section className="password-change">
    <p>{t('passwordChangeDescription')}</p>
    <form onSubmit={event => { event.preventDefault(); const input = event.currentTarget.elements.namedItem('current_password') as HTMLInputElement; const password = input.value; input.value = ''; setBusy(true); setError(''); void sendPasswordCode({ current_password: password }).then(() => { setSent(true); setRetryAt(Date.now() + 60_000); form.resetField('code'); }).catch(report).finally(() => setBusy(false)); }}>
      <label htmlFor="change-current">{t('currentPassword')}</label><input id="change-current" name="current_password" type="password" autoComplete="current-password" required maxLength={512}/>
      <button type="submit" className="button secondary" disabled={busy} onClick={event => { if (retryAt > Date.now()) { event.preventDefault(); setError('codeCooldown'); } }}>{t(busy ? 'sendingCode' : sent ? 'resendCode' : 'sendCode')}</button>
    </form>
    {sent && <><p role="status">{t('emailCodeSent')}</p><form noValidate onSubmit={event => void form.handleSubmit(async values => { setError(''); try { await changeStaffPassword(values); form.reset(); onChanged(); } catch (failure) { report(failure); } finally { form.resetField('password'); form.resetField('password_confirmation'); form.resetField('code'); } })(event)}>
      <label htmlFor="password-email-code">{t('emailVerificationCode')}</label><input id="password-email-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} {...form.register('code')} aria-invalid={!!form.formState.errors.code}/>
      <label htmlFor="change-new">{t('newPassword')}</label><input id="change-new" type="password" autoComplete="new-password" maxLength={128} {...form.register('password')} aria-invalid={!!form.formState.errors.password} aria-describedby="password-policy"/><p id="password-policy">{t('newPasswordPolicy')}</p>
      <label htmlFor="change-confirm">{t('confirmPassword')}</label><input id="change-confirm" type="password" autoComplete="new-password" maxLength={128} {...form.register('password_confirmation')} aria-invalid={!!form.formState.errors.password_confirmation}/>
      {Object.values(form.formState.errors).map((issue, index) => <p className="field-error" role="alert" key={index}>{issue.message}</p>)}
      <button type="submit" className="button primary" disabled={form.formState.isSubmitting}>{t(form.formState.isSubmitting ? 'verifying' : 'confirmPasswordChange')}</button>
    </form></>}
    {error && <p role="alert" className="login-error">{t(error)}</p>}
  </section>;
}
