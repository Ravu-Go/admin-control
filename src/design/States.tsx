import { useTranslation } from 'react-i18next';
import { Button, Panel } from './components';
import { Icon } from './Icon';

export function EmptyState({ onClear }: { onClear: () => void }) {
  const { t } = useTranslation();
  return <Panel title={t('empty')} description={t('emptySubtitle')} className="state-panel"><div className="state-message"><Icon name="doc" size={40}/><strong>{t('noMatches')}</strong></div><p>{t('noFakeTotals')}</p><Button kind="secondary" onClick={onClear}>{t('clear')}</Button></Panel>;
}
export function LoadingState({ previousTimestamp }: { previousTimestamp: string | null }) {
  const { t } = useTranslation();
  return <Panel title={t('loading')} description={t('loadingSubtitle')} className="state-panel"><div className="skeletons" aria-hidden="true"><span/><span/><span/></div><p role="status">{t('loadingCopy')}{previousTimestamp && <span className="last-updated">{t('lastUpdated', { time: previousTimestamp })}</span>}</p></Panel>;
}
export function ConnectionLostState({ draftRetained, onReconnect }: { draftRetained: boolean; onReconnect: () => void }) {
  const { t } = useTranslation();
  return <Panel title={t('offline')} description={t('offlineSubtitle')} className="state-panel tall"><div className="state-message danger-text"><Icon name="alert" size={36}/><div><strong>{t('offline')}</strong><p>{draftRetained ? t('offlineCopy') : t('recheck')}</p></div></div><p>{t('recheck')}</p><Button onClick={onReconnect}>{t('reconnect')}</Button></Panel>;
}
export function PermissionState({ onRequest, onReload }: { onRequest: () => void; onReload: () => void }) {
  const { t } = useTranslation();
  return <Panel title={t('denied')} description={t('deniedSubtitle')} className="state-panel tall"><div className="conflict-copy"><p>{t('ownRequest')}</p><p>{t('anotherReviewer')}</p><p>{t('changed')}</p><p>{t('reviewLatest')}</p></div><div className="two-buttons"><Button kind="secondary" onClick={onReload}>{t('reload')}</Button><Button kind="secondary" onClick={onRequest}>{t('requestAccess')}</Button></div></Panel>;
}
export function VersionConflictState({ onReload }: { onReload: () => void }) {
  const { t } = useTranslation();
  return <Panel title={t('changed')} description={t('reviewLatest')}><p role="alert">{t('stale')}</p><Button onClick={onReload}>{t('reload')}</Button></Panel>;
}
