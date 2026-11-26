import { useEffect, useSyncExternalStore } from 'react';
import { loadPublicBranding } from '../api/company-profile';

type Branding = { name: string; logoUrl: string | null };
const fallback: Branding = { name: 'Ravu', logoUrl: null };
let current = fallback;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** Fetch the public company name and logo once per page; any failure keeps the built-in Ravu brand. */
function load() {
  // Unit tests render without a network; their fetch mocks belong to the code under test.
  if (loading || import.meta.env.MODE === 'test') return;
  loading = loadPublicBranding().then(data => { current = { name: data.name, logoUrl: data.logo_url }; }, () => { current = fallback; })
    .finally(() => listeners.forEach(listener => listener()));
}
/** Re-read branding after an administrator changes it. */
export function refreshBranding() { loading = null; load(); }
export function useBranding(): Branding {
  useEffect(load, []);
  return useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => current, () => fallback);
}

export function BrandLogo({ className = '' }: { className?: string }) {
  const { name, logoUrl } = useBranding();
  useEffect(() => { document.title = `${name} · Control Centre`; }, [name]);
  if (logoUrl) return <span className={`brand-tile ${className}`}><img src={logoUrl} alt={name} decoding="async"/></span>;
  return <svg className={`ravu-logo ${className}`} viewBox="554 235 1168 1685" role="img" aria-label={name}><title>{name}</title><image href="/brand/ravu-logo-white.png" width="2250" height="2251"/></svg>;
}
