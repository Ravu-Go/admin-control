import type { ReactNode } from 'react';
import { Button } from '../../design/components';
import { Icon } from '../../design/Icon';
import { SegmentedFilter } from '../../design/SegmentedFilter';

type Search = { label: string; value: string; onChange: (value: string) => void; placeholder: string; clearLabel: string };
type Filter = { label: string; value: string; onChange: (id: string) => void; options: { id: string; label: string }[] };

/** One toolbar for every staff-administration list: search, then a segmented filter, then the count and any list action. */
export function ListToolbar({ search, filter, count, action }: { search?: Search; filter?: Filter; count?: ReactNode; action?: ReactNode }) {
  return <div className="list-toolbar">
    {search && <div className="search-field">
      <Icon name="search" size={18}/>
      <input type="search" aria-label={search.label} placeholder={search.placeholder} value={search.value} onChange={event => search.onChange(event.target.value)}
        onKeyDown={event => { if (event.key === 'Escape' && search.value) { event.preventDefault(); search.onChange(''); } }}/>
      {search.value && <button type="button" className="search-clear" aria-label={search.clearLabel} onClick={() => search.onChange('')}><Icon name="close" size={16}/></button>}
    </div>}
    {filter && <SegmentedFilter label={filter.label} value={filter.value} onChange={filter.onChange} options={filter.options}/>}
    {(count || action) && <div className="list-toolbar-end">{count && <p className="list-count" aria-live="polite">{count}</p>}{action}</div>}
  </div>;
}

/** Case-insensitive match across the given fields. */
export const matches = (query: string, ...fields: (string | null | undefined)[]) => {
  const needle = query.trim().toLocaleLowerCase();
  return !needle || fields.some(field => field?.toLocaleLowerCase().includes(needle));
};

/** Previous / next for server-paginated lists. Hidden when everything fits on one page. */
export function Pager({ page, last, onPage, labels }: { page: number; last: number; onPage: (page: number) => void; labels: { previous: string; next: string; page: string; of: string } }) {
  if (last <= 1) return null;
  return <nav className="list-pager" aria-label={labels.page}>
    <Button kind="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>{labels.previous}</Button>
    <span>{labels.page} {page} {labels.of} {last}</span>
    <Button kind="secondary" disabled={page >= last} onClick={() => onPage(page + 1)}>{labels.next}</Button>
  </nav>;
}
