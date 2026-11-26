/** Title row for modal forms: the heading plus an always-available close button. */
export function DialogHeader({ id, title, closeLabel, onClose }: { id: string; title: string; closeLabel: string; onClose: () => void }) {
  return <div className="dialog-header">
    <h2 id={id}>{title}</h2>
    <button type="button" className="dialog-close" aria-label={closeLabel} onClick={onClose}>
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
    </button>
  </div>;
}
