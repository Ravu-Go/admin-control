import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Icon } from './Icon';

export function Button({ children, kind = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: 'primary' | 'secondary' | 'danger' }) {
  return <button type="button" className={`button ${kind}`} {...props}>{children}</button>;
}
export function Panel({ title, description, children, className = '' }: { title: string; description?: string; children: ReactNode; className?: string }) {
  const id = useId();
  return <section className={`panel ${className}`} aria-labelledby={id}><h2 id={id}>{title}</h2>{description && <p className="panel-description">{description}</p>}{children}</section>;
}
export function KpiCard({ label, value, detail, context }: { label: string; value: string | null; detail: string; context: string }) {
  return <section className="kpi-card" aria-label={label}><span>{label}</span><small>{context}</small><strong>{value ?? '—'}</strong><p>{detail}</p></section>;
}
export function StatusBadge({ status, label }: { status: 'success' | 'pending' | 'danger' | 'neutral'; label: string }) {
  return <span className={`status-badge ${status}`}><Icon name={status === 'success' ? 'check' : status === 'danger' ? 'alert' : status === 'pending' ? 'clock' : 'doc'} size={16}/>{label}</span>;
}
export function Timeline({ items }: { items: { id: string; title: string; detail: string; dateTime: string }[] }) {
  return <ol className="timeline">{items.map(item => <li key={item.id}><Icon name="check" size={18}/><div><strong>{item.title}</strong><p>{item.detail}</p><time dateTime={item.dateTime}>{new Intl.DateTimeFormat('en-TZ', { timeZone: 'Africa/Dar_es_Salaam', hour: '2-digit', minute: '2-digit' }).format(new Date(item.dateTime))} EAT</time></div></li>)}</ol>;
}
export function BilingualPreview({ copy, reviews }: { copy: { en: string; sw: string }; reviews: { en: boolean; sw: boolean } }) {
  const { t } = useTranslation();
  return <section className="bilingual" aria-label={t('bilingual')}>{(['en','sw'] as const).map(language => <div key={language} lang={language}><strong>{language.toUpperCase()}</strong><p>{copy[language]}</p><StatusBadge status={reviews[language] ? 'success' : 'pending'} label={t(reviews[language] ? 'reviewed' : 'unreviewed')}/></div>)}</section>;
}
export function EvidencePanel({ label, onOpen }: { label: string; onOpen?: () => void }) {
  const { t } = useTranslation();
  return <Panel title={t('details')}><div className="evidence-placeholder"><Icon name="doc" size={40}/><strong>{label}</strong></div><Button kind="secondary" disabled={!onOpen} onClick={onOpen}>{t('evidenceOpen')}</Button>{!onOpen && <p>{t('evidenceUnavailable')}</p>}</Panel>;
}
export function KeyboardHints({ hints }: { hints: { keys: string; action: string }[] }) {
  const { t } = useTranslation();
  return <ul className="keyboard-hints" aria-label={t('keyboard')}>{hints.map(({ keys, action }) => <li key={keys}><kbd>{keys}</kbd> {action}</li>)}</ul>;
}

export interface ConfirmedCommand { version: number; reason: string; confirmed: true; idempotencyKey: string }
export function ConfirmDialog({ title, version, currentVersion, canConfirm = false, onCancel, onConfirm }: {
  title: string; version: number; currentVersion: number; canConfirm?: boolean; onCancel: () => void; onConfirm: (command: ConfirmedCommand) => Promise<void>;
}) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const [openedVersion] = useState(version);
  const [failure, setFailure] = useState(false);
  const submission = useRef<{ fingerprint: string; id: string } | null>(null);
  const inFlight = useRef(false);
  const id = useId();
  const schema = z.object({ reason: z.string().trim().min(10, t('reasonError')).max(2000), confirmed: z.boolean().refine(value => value, t('confirmedError')) });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { reason: '', confirmed: false } });
  const stale = currentVersion !== openedVersion;
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  const confirmValues = async (values: { reason: string; confirmed: boolean }) => {
    if (!canConfirm || stale || inFlight.current) return;
    inFlight.current = true;
    setFailure(false);
    const fingerprint = JSON.stringify([openedVersion, values.reason]);
    if (submission.current?.fingerprint !== fingerprint) submission.current = { fingerprint, id: crypto.randomUUID() };
    try { await onConfirm({ version: openedVersion, reason: values.reason, confirmed: true, idempotencyKey: submission.current.id }); } catch { setFailure(true); } finally { inFlight.current = false; }
  };
  return <dialog ref={dialog} aria-labelledby={`${id}-title`} onCancel={onCancel} className="confirm-dialog">
    <form onSubmit={event => void form.handleSubmit(confirmValues)(event)} onKeyDown={event => { if (event.ctrlKey && event.key === 'Enter') { event.preventDefault(); event.currentTarget.requestSubmit(); } }}>
      <h2 id={`${id}-title`}>{title}</h2>
      {!canConfirm && <p role="alert">{t('permissionDenied')}</p>}{stale && <p role="alert">{t('stale')}</p>}
      <label htmlFor={`${id}-reason`}>{t('reason')}</label><textarea id={`${id}-reason`} maxLength={2000} {...form.register('reason')} aria-invalid={!!form.formState.errors.reason} aria-describedby={form.formState.errors.reason ? `${id}-reason-error` : undefined}/>
      {form.formState.errors.reason && <p id={`${id}-reason-error`} role="alert">{form.formState.errors.reason.message}</p>}
      <label className="checkbox"><input type="checkbox" {...form.register('confirmed')}/>{t('confirmCheck')}</label>
      {form.formState.errors.confirmed && <p role="alert">{form.formState.errors.confirmed.message}</p>}
      {failure && <p role="alert">{t('confirmFailed')}</p>}
      <div className="dialog-actions"><Button kind="secondary" onClick={onCancel}>{t('cancel')}</Button><Button type="submit" disabled={!canConfirm || stale || form.formState.isSubmitting}>{t(form.formState.isSubmitting ? 'submitted' : 'confirm')}</Button></div>
    </form>
  </dialog>;
}

export function MaskedField({ label, maskedValue, version, currentVersion, canRequest = false, onRequest }: { label: string; maskedValue: string; version: number; currentVersion: number; canRequest?: boolean; onRequest?: (command: ConfirmedCommand) => Promise<void> }) {
  const { t } = useTranslation();
  const [requesting, setRequesting] = useState(false);
  return <div className="masked-field"><span>{label}</span><strong>{maskedValue}</strong><Button kind="secondary" disabled={!canRequest || !onRequest} onClick={() => setRequesting(true)}>{t('reveal')}</Button><p>{t('privacyNotice')}</p>
    {requesting && <ConfirmDialog title={t('purpose')} version={version} currentVersion={currentVersion} canConfirm={canRequest} onCancel={() => setRequesting(false)} onConfirm={async command => { await onRequest?.(command); setRequesting(false); }}/>}</div>;
}
