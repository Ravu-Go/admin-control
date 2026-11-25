import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';
import { DemoBanner } from './Shell';
import { useStaffSession } from './StaffSession';
import { signInStaff, verifyStaffMfa, StaffAuthError, type StaffAuthState } from '../api/staff-auth';
import { navigation } from './navigation';

export function safeReturnPath(value: unknown): string {
  const paths: string[] = navigation.flatMap(group => group.items.map(item => item[1]));
  return typeof value === 'string' && [...paths, '/playground/states'].includes(value) ? value : '/';
}
function message(error: unknown) {
  if (error instanceof StaffAuthError) {
    if (error.status === 401 || error.status === 422) return 'loginInvalid';
    if (error.status === 429) return 'loginRateLimited';
    if (error.status === 419) return 'loginExpired';
  }
  return 'loginUnavailable';
}
export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { session, checking, unavailable, refresh } = useStaffSession();
  const location = useLocation();
  const [step, setStep] = useState<'password' | 'mfa' | 'enrollment'>('password');
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const login = useForm({ resolver: zodResolver(z.object({ email: z.email(t('emailError')), password: z.string().min(1, t('passwordError')) })), defaultValues: { email: '', password: '' } });
  const mfa = useForm({ resolver: zodResolver(z.object({ code: z.string().regex(/^\d{6}$/, t('codeError')) })), defaultValues: { code: '' } });
  const complete = async (result: StaffAuthState) => {
    if (result.state === 'mfa_required') { setStep('mfa'); return; }
    if (result.state === 'enrollment_required') { setStep('enrollment'); return; }
    if (result.state !== 'authenticated' || !await refresh()) throw new StaffAuthError(0, 'unavailable');
  };
  if (session) return <Navigate to={safeReturnPath((location.state as { returnTo?: unknown } | null)?.returnTo)} replace/>;
  return <div className="login-page">
    <aside className="login-brand" aria-label="Ravu"><BrandLogo/><div className="login-brand-copy"><p className="login-eyebrow">RAVU</p><h2>{t('controlCentre')}</h2><p>{t('loginBrandCopy')}</p></div><div className="login-brand-footer">{t('loginLocation')}<span>{t('loginStaffOnly')}</span></div></aside>
    <main className="login-main" id="main"><div className="login-languages" aria-label={t('languageLabel')}><button aria-pressed={i18n.language === 'en'} onClick={() => void i18n.changeLanguage('en')}>EN</button><button aria-pressed={i18n.language === 'sw'} onClick={() => void i18n.changeLanguage('sw')}>SW</button></div>
      <div className="login-form-container"><p className="login-eyebrow">{t('staffPortal')}</p><h1>{t(step === 'mfa' ? 'mfaTitle' : step === 'enrollment' ? 'enrollmentTitle' : 'loginTitle')}</h1><p className="login-description">{t(step === 'mfa' ? 'mfaDescription' : step === 'enrollment' ? 'enrollmentDescription' : 'loginDescription')}</p>
        {step === 'password' && <form noValidate onSubmit={event => void login.handleSubmit(async values => { setError(''); try { await complete(await signInStaff(values)); } catch (failure) { setError(message(failure)); } finally { login.resetField('password'); setVisible(false); } })(event)}>
          <label htmlFor="staff-email">{t('emailAddress')}</label><input id="staff-email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} {...login.register('email')} aria-invalid={!!login.formState.errors.email} aria-describedby={login.formState.errors.email ? 'email-error' : undefined}/>
          {login.formState.errors.email && <p id="email-error" className="field-error" role="alert">{login.formState.errors.email.message}</p>}
          <label htmlFor="staff-password">{t('password')}</label><div className="password-field"><input id="staff-password" type={visible ? 'text' : 'password'} autoComplete="current-password" {...login.register('password')} aria-invalid={!!login.formState.errors.password} aria-describedby={login.formState.errors.password ? 'password-error' : undefined}/><button type="button" aria-label={t(visible ? 'hidePassword' : 'showPassword')} aria-pressed={visible} onClick={() => setVisible(!visible)}>{t(visible ? 'hide' : 'show')}</button></div>
          {login.formState.errors.password && <p id="password-error" className="field-error" role="alert">{login.formState.errors.password.message}</p>}
          <button className="button primary login-submit" type="submit" disabled={checking || login.formState.isSubmitting}>{t(login.formState.isSubmitting ? 'signingIn' : 'signIn')}</button>
        </form>}
        {step === 'mfa' && <form noValidate onSubmit={event => void mfa.handleSubmit(async values => { setError(''); try { await complete(await verifyStaffMfa(values)); } catch (failure) { setError(message(failure)); } finally { mfa.resetField('code'); } })(event)}><label htmlFor="staff-code">{t('verificationCode')}</label><input id="staff-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} {...mfa.register('code')} aria-invalid={!!mfa.formState.errors.code} aria-describedby={mfa.formState.errors.code ? 'code-error' : undefined}/>{mfa.formState.errors.code && <p id="code-error" role="alert">{mfa.formState.errors.code.message}</p>}<button className="button primary login-submit" type="submit" disabled={mfa.formState.isSubmitting}>{t(mfa.formState.isSubmitting ? 'verifying' : 'verifyAndContinue')}</button></form>}
        {(error || unavailable && step === 'password') && <p className="login-error" role="alert">{t(error || 'loginUnavailable')}</p>}
        {step !== 'password' && <button className="login-back" type="button" onClick={() => { setStep('password'); setError(''); mfa.reset(); }}>{t('backToSignIn')}</button>}
        <p className="login-help">{t('loginHelp')}</p>
      </div>
    </main><DemoBanner appEnv={import.meta.env.VITE_APP_ENV || 'staging'} demoMode={import.meta.env.VITE_DEMO_MODE !== 'false'}/>
  </div>;
}
