import { useEffect, useId, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStaffSession } from '../../app/StaffSession';
import { Button, Panel } from '../../design/components';
import { NotConnected } from '../../design/NotConnected';
import { PageHeader } from '../../design/PageHeader';
import { SegmentedFilter } from '../../design/SegmentedFilter';
import { useQueryChoice } from '../../design/Tabs';
import './AuditLogScreen.css';

const filters = ['all', 'accounts', 'financial', 'configuration'] as const;
type AuditFilter = typeof filters[number];

/** A23: one evidence table narrowed by a filter kept in ?filter=, so exports and shared links honour it. */
export function AuditLogScreen() {
  const { i18n } = useTranslation();
  const sw = i18n.language.startsWith('sw');
  const text = (en: string, translation: string) => sw ? translation : en;
  const { session } = useStaffSession();
  const [filter, setFilter] = useQueryChoice<AuditFilter>('filter', filters, 'all');
  const [params, setParams] = useSearchParams();
  const exporting = params.get('export') === '1';
  const labels: Record<AuditFilter, string> = {
    all: text('All events', 'Matukio yote'), accounts: text('Account decisions', 'Maamuzi ya akaunti'),
    financial: text('Financial changes', 'Mabadiliko ya kifedha'), configuration: text('Configuration', 'Usanidi'),
  };
  const canExport = !!session?.permissions.includes('exports.create');
  const openExport = (open: boolean) => setParams(previous => { const copy = new URLSearchParams(previous); if (open) copy.set('export', '1'); else copy.delete('export'); return copy; }, { replace: true });
  return <div className="audit-log">
    <PageHeader title={text('Audit log', 'Kumbukumbu za ukaguzi')}
      subtitle={text('Append-only record of sensitive access, decisions and configuration changes', 'Kumbukumbu isiyobadilika ya ufikiaji nyeti, maamuzi na mabadiliko ya usanidi')}
      action={<Button icon="download" disabled={!canExport} onClick={() => openExport(true)}>{text('Export authorised scope…', 'Hamisha wigo ulioidhinishwa…')}</Button>}/>
    <Panel title={text('Activity evidence', 'Ushahidi wa shughuli')}>
      <div className="audit-toolbar">
        <SegmentedFilter label={text('Filter events', 'Chuja matukio')} value={filter} onChange={id => setFilter(id as AuditFilter)} options={filters.map(id => ({ id, label: labels[id] }))}/>
        <span className="audit-toolbar-hint">{text('Export includes the current filter', 'Uhamishaji unajumuisha kichujio cha sasa')}</span>
      </div>
      <NotConnected title={text('Not connected yet', 'Bado haijaunganishwa')}>{text(`Audit events (${labels[filter].toLowerCase()}) will appear here once the audit API is connected. No events are shown until then, and nothing here is sample data.`, `Matukio ya ukaguzi (${labels[filter].toLowerCase()}) yataonekana hapa API ya ukaguzi ikiunganishwa. Hakuna matukio yanayoonyeshwa hadi wakati huo.`)}</NotConnected>
      <p className="audit-footnote">{text('Actor, timestamp, object, old and new values, reason, evidence and request ID are retained. There are no edit or delete controls.', 'Mtendaji, muda, kitu, thamani za zamani na mpya, sababu, ushahidi na kitambulisho cha ombi vinahifadhiwa. Hakuna vidhibiti vya kuhariri au kufuta.')}</p>
    </Panel>
    {exporting && canExport && <ExportDialog scope={labels[filter]} text={text} onClose={() => openExport(false)}/>}
  </div>;
}

function ExportDialog({ scope, text, onClose }: { scope: string; text: (en: string, sw: string) => string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} className="confirm-dialog" aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2 id={`${id}-title`}>{text('Export authorised scope', 'Hamisha wigo ulioidhinishwa')}</h2>
    <dl className="export-scope"><dt>{text('Filter', 'Kichujio')}</dt><dd>{scope}</dd></dl>
    <p>{text('Exports need a purpose and permission, and every export is logged. Export is not connected yet, so no file will be produced.', 'Uhamishaji unahitaji madhumuni na ruhusa, na kila uhamishaji unarekodiwa. Uhamishaji bado haujaunganishwa, kwa hiyo hakuna faili litakalotolewa.')}</p>
    <div className="dialog-actions"><Button kind="secondary" autoFocus onClick={onClose}>{text('Close', 'Funga')}</Button></div>
  </dialog>;
}
