import { useState } from 'react';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { Button } from './components';

export function DataTable<T>({ rows, columns, loading = false, previousTimestamp, error = null, onRetry, externalPagination = false, filterable = true }: { rows: T[]; columns: ColumnDef<T>[]; loading?: boolean; previousTimestamp: string | null; error?: string | null; onRetry?: () => void; externalPagination?: boolean; /** Off when the page supplies its own search toolbar. */ filterable?: boolean }) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const table = useReactTable({ data: rows, columns, state: { sorting, globalFilter }, onSortingChange: setSorting, onGlobalFilterChange: setGlobalFilter, manualPagination: externalPagination,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageSize: 5 } } });
  return <div className="data-table" aria-busy={loading}>
    {filterable && <label className="table-filter">{t('filter')}<input value={globalFilter} onChange={event => setGlobalFilter(event.target.value)}/></label>}
    {previousTimestamp && <p className="last-updated">{t('lastUpdated', { time: previousTimestamp })}</p>}
    {loading && <p role="status">{t('loadingCopy')}</p>}
    {error && <div role="alert"><p>{error}</p>{onRetry && <Button kind="secondary" onClick={onRetry}>{t('reload')}</Button>}</div>}
    <div className="table-scroll"><table><thead>{table.getHeaderGroups().map(group => <tr key={group.id}>{group.headers.map(header => <th key={header.id} scope="col" aria-sort={header.column.getIsSorted() === 'asc' ? 'ascending' : header.column.getIsSorted() === 'desc' ? 'descending' : 'none'}>{header.column.getCanSort() ? <button type="button" onClick={header.column.getToggleSortingHandler()}>{flexRender(header.column.columnDef.header, header.getContext())}<span aria-hidden="true">{header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ' ↕'}</span></button> : flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead>
      <tbody>{table.getRowModel().rows.map(row => <tr key={row.id}>{row.getVisibleCells().map(cell => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div>
    {!loading && !error && !table.getRowModel().rows.length && <p role="status">{t('noMatches')}</p>}
    {!externalPagination && <div className="table-pagination"><Button kind="secondary" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>{t('previous')}</Button><span>{t('page', { page: table.getState().pagination.pageIndex + 1, total: Math.max(1, table.getPageCount()) })}</span><Button kind="secondary" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>{t('next')}</Button></div>}
  </div>;
}
