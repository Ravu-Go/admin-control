import { Icon } from './Icon';

/** Honest placeholder for a feature whose API is not built yet: never fixture rows that could pass for live data. */
export function NotConnected({ title, children }: { title: string; children: string }) {
  return <div className="not-connected" role="status"><Icon name="doc" size={20}/><strong>{title}</strong><p>{children}</p></div>;
}
