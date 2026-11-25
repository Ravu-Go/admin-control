import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { loadStaffSession, StaffAuthError, type StaffBootstrap } from '../api/staff-auth';

type SessionValue = { session: StaffBootstrap | null; checking: boolean; unavailable: boolean; refresh: () => Promise<boolean>; clear: () => void };
const Context = createContext<SessionValue | null>(null);
export function StaffSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StaffBootstrap | null>(null);
  const [checking, setChecking] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const queryClient = useQueryClient();
  const generation = useRef(0);
  const clear = useCallback(() => { generation.current++; setSession(null); queryClient.clear();
    try { Object.keys(sessionStorage).filter(key => key.startsWith('ravu-review:')).forEach(key => sessionStorage.removeItem(key)); } catch { /* Storage can be unavailable. */ }
  }, [queryClient]);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    try { const result = await loadStaffSession(); if (request !== generation.current) return false; setSession(result); setUnavailable(false); setChecking(false); return true; }
    catch (error) { if (request === generation.current) { clear(); setUnavailable(!(error instanceof StaffAuthError && error.status === 401)); setChecking(false); } return false; }
  }, [clear]);
  useEffect(() => {
    const request = ++generation.current;
    let cancelled = false;
    void loadStaffSession().then(result => {
      if (!cancelled && request === generation.current) { setSession(result); setUnavailable(false); setChecking(false); }
    }).catch(error => {
      if (!cancelled && request === generation.current) { clear(); setUnavailable(!(error instanceof StaffAuthError && error.status === 401)); setChecking(false); }
    });
    return () => { cancelled = true; };
  }, [clear]);
  useEffect(() => {
    if (!session) return;
    const delay = Math.min(Date.parse(session.session_expires_at), Date.parse(session.idle_expires_at)) - Date.now();
    const timer = window.setTimeout(clear, Math.max(0, Math.min(delay, 2_147_483_647)));
    const checkOnFocus = () => { void refresh(); };
    window.addEventListener('focus', checkOnFocus);
    return () => { window.clearTimeout(timer); window.removeEventListener('focus', checkOnFocus); };
  }, [session, clear, refresh]);
  return <Context.Provider value={{ session, checking, unavailable, refresh, clear }}>{children}</Context.Provider>;
}
export function useStaffSession() { const value = useContext(Context); if (!value) throw new Error('StaffSessionProvider is required'); return value; }
