import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import type { StaffStepUpRequest } from '../api/staff-auth';
import { StaffAuthError } from '../api/staff-auth';
import { Button } from './components';

export type VerificationCredentials = Pick<StaffStepUpRequest, 'password' | 'code'>;

/** Transport-free form: production and explicitly fictional previews supply separate handlers. */
export function IdentityVerificationDialog<T>({ contextKey, canVerify, deadline, actionLabel, preview = false, verify, onVerified, onCancel, onExpired }: {
  contextKey: string; canVerify: boolean; deadline: number; actionLabel: string; preview?: boolean;
  verify: (credentials: VerificationCredentials, signal: AbortSignal) => Promise<T>;
  onVerified: (result: T) => void; onCancel: () => void; onExpired?: () => void;
}) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [openedKey] = useState(contextKey);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(() => deadline <= Date.now());
  const controller = useRef<AbortController | null>(null);
  const alive = useRef(false);
  const cancelled = useRef(false);
  const latest = useRef({ contextKey, canVerify, deadline });
  useLayoutEffect(() => { latest.current = { contextKey, canVerify, deadline }; }, [contextKey, canVerify, deadline]);
  const form = useForm<VerificationCredentials>({ resolver: zodResolver(z.object({ password: z.string().min(1, t('passwordError')).max(512), code: z.string().regex(/^\d{6}$/, t('codeError')) })), defaultValues: { password: '', code: '' } });
  useEffect(() => {
    alive.current = true;
    const previous = document.activeElement;
    const element = dialog.current;
    element?.showModal();
    return () => { alive.current = false; controller.current?.abort(); element?.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  useEffect(() => {
    if (!Number.isFinite(deadline)) return;
    const timer = window.setTimeout(() => setExpired(true), Math.max(0, Math.min(deadline - Date.now(), 2_147_483_647)));
    return () => window.clearTimeout(timer);
  }, [deadline]);
  const blocked = !canVerify || expired || contextKey !== openedKey;
  const cancel = () => { cancelled.current = true; controller.current?.abort(); form.reset(); onCancel(); };
  const submit = async (values: VerificationCredentials) => {
    form.reset();
    if (controller.current || cancelled.current || blocked) return;
    if (latest.current.contextKey !== openedKey || !latest.current.canVerify) { setError(latest.current.canVerify ? 'stale' : 'permissionDenied'); return; }
    if (latest.current.deadline <= Date.now()) { setExpired(true); onExpired?.(); return; }
    const pending = new AbortController(); controller.current = pending; setError(''); setBusy(true);
    try {
      const result = await verify(values, pending.signal);
      if (!alive.current || cancelled.current) return;
      if (latest.current.contextKey !== openedKey) { setError('stale'); return; }
      if (!latest.current.canVerify) { setError('permissionDenied'); return; }
      if (latest.current.deadline <= Date.now()) { setExpired(true); onExpired?.(); return; }
      onVerified(result);
    } catch (failure) {
      if (!alive.current || cancelled.current) return;
      const status = failure instanceof StaffAuthError ? failure.status : 0;
      setError(status === 429 ? 'loginRateLimited' : status === 422 ? 'reauthInvalid' : status === 403 ? 'permissionDenied' : [401,419].includes(status) ? 'loginExpired' : 'reauthUnavailable');
      if ([401,419].includes(status)) onExpired?.();
    } finally { if (controller.current === pending) controller.current = null; if (alive.current && !cancelled.current) setBusy(false); }
  };
  return <dialog ref={dialog} className="confirm-dialog identity-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onCancel={event => { event.preventDefault(); cancel(); }}>
    <form noValidate onSubmit={event => void form.handleSubmit(submit, () => { form.resetField('password', { keepError: true }); form.resetField('code', { keepError: true }); })(event)}>
      <h2 id={`${id}-title`}>{t(preview ? 'reauthPreview' : 'reauthTitle')}</h2>
      <p id={`${id}-description`}>{t(preview ? 'reauthPreviewCopy' : 'reauthDescription', { action: actionLabel })}</p>
      {blocked && <p role="alert">{t(!canVerify ? 'permissionDenied' : expired ? 'loginExpired' : 'stale')}</p>}
      <label htmlFor={`${id}-password`}>{t(preview ? 'examplePassword' : 'currentPassword')}</label><input id={`${id}-password`} type="password" autoComplete={preview ? 'off' : 'current-password'} maxLength={512} {...form.register('password')} aria-invalid={!!form.formState.errors.password} aria-describedby={form.formState.errors.password ? `${id}-password-error` : undefined}/>
      {form.formState.errors.password && <p id={`${id}-password-error`} role="alert">{form.formState.errors.password.message}</p>}
      <label htmlFor={`${id}-code`}>{t(preview ? 'exampleCode' : 'verificationCode')}</label><input id={`${id}-code`} inputMode="numeric" autoComplete={preview ? 'off' : 'one-time-code'} maxLength={6} {...form.register('code')} aria-invalid={!!form.formState.errors.code} aria-describedby={form.formState.errors.code ? `${id}-code-error` : undefined}/>
      {form.formState.errors.code && <p id={`${id}-code-error`} role="alert">{form.formState.errors.code.message}</p>}
      {error && !blocked && <p role="alert">{t(error)}</p>}
      <div className="dialog-actions"><Button kind="secondary" onClick={cancel}>{t('cancel')}</Button><Button type="submit" disabled={blocked || busy || form.formState.isSubmitting}>{t(busy || form.formState.isSubmitting ? 'verifying' : 'verifyAndContinue')}</Button></div>
    </form>
  </dialog>;
}
