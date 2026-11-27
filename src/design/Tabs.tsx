import { useEffect, useRef, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

export type TabItem = { id: string; label: string; count?: number | undefined };

/** Read a choice from the URL query so reloads and shared links keep it; unknown values fall back. */
export function useQueryChoice<T extends string>(name: string, allowed: readonly T[], fallback: T): [T, (value: T) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get(name);
  const value = (allowed as readonly string[]).includes(raw ?? '') ? raw as T : fallback;
  const set = (next: T) => setParams(previous => { const copy = new URLSearchParams(previous); copy.set(name, next); return copy; }, { replace: true });
  return [value, set];
}

/** Page-level view switch: underline tabs that size to their label and move with arrow keys. */
export function Tabs({ items, value, onChange, label, idPrefix = 'tab' }: { items: TabItem[]; value: string; onChange: (id: string) => void; label: string; idPrefix?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, items.findIndex(item => item.id === value));
  // Keep the selected tab visible when the row scrolls sideways on narrow screens.
  useEffect(() => { refs.current[index]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); }, [index]);
  const move = (next: number) => { const target = (next + items.length) % items.length; const item = items[target]; if (!item) return; onChange(item.id); refs.current[target]?.focus(); };
  return <div className="tabs" role="tablist" aria-label={label} onKeyDown={event => {
    const keys: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: items.length - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault(); move(keys[event.key] ?? index);
  }}>
    {items.map((item, position) => {
      const selected = item.id === value;
      return <button key={item.id} ref={element => { refs.current[position] = element; }} type="button" role="tab" id={`${idPrefix}-${item.id}`}
        aria-selected={selected} aria-controls={`${idPrefix}-panel-${item.id}`} tabIndex={selected ? 0 : -1} onClick={() => onChange(item.id)}>
        {item.label}{item.count ? <span className="tab-count" aria-label={`, ${item.count}`}>{item.count}</span> : null}
      </button>;
    })}
  </div>;
}

export function TabPanel({ id, idPrefix = 'tab', children }: { id: string; idPrefix?: string; children: ReactNode }) {
  return <section role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-${id}`} tabIndex={0} className="tab-panel">{children}</section>;
}
