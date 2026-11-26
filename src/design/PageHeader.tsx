import type { ReactNode } from 'react';

/** Every admin page: title and subtitle, one primary action on the title row, optional meta chip and tabs. */
export function PageHeader({ title, subtitle, action, meta, tabs, above }: { title: string; subtitle?: string; action?: ReactNode; meta?: ReactNode; tabs?: ReactNode; above?: ReactNode }) {
  return <header className="page-header">
    {above}
    <div className="page-header-row">
      <div className="page-header-text"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      {(action || meta) && <div className="page-header-actions">{meta}{action}</div>}
    </div>
    {tabs && <div className="page-header-tabs">{tabs}</div>}
  </header>;
}
