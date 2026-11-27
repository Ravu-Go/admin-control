/** Narrows one list in place. Toggle buttons, not tabs: it never switches the page's view. */
export function SegmentedFilter({ options, value, onChange, label }: { options: { id: string; label: string }[]; value: string; onChange: (id: string) => void; label: string }) {
  return <div className="segmented" role="group" aria-label={label}>
    {options.map(option => <button key={option.id} type="button" aria-pressed={option.id === value} onClick={() => onChange(option.id)}>{option.label}</button>)}
  </div>;
}
