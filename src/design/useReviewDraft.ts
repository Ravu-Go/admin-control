import { useState } from 'react';

// The caller supplies a staff/session/record-scoped key and non-sensitive draft copy.
// Phase 4 must clear session storage on expiry/sign-out. Never persist unmasked PII.
export function useReviewDraft(scope: string, openedVersion: number, storage: Storage = sessionStorage) {
  const key = `ravu-review:${scope}`;
  const [draft, setDraft] = useState(() => {
    try { return storage.getItem(key) ?? ''; } catch { return ''; }
  });
  const [saved, setSaved] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(openedVersion);
  const [versionChecked, setVersionChecked] = useState(false);
  const [offline, setOffline] = useState(false);
  const updateDraft = (value: string) => {
    setDraft(value);
    try { storage.setItem(key, value); setSaved(true); } catch { setSaved(false); }
  };
  const disconnect = () => { setOffline(true); setVersionChecked(false); };
  const reconnect = async (loadVersion: () => Promise<number>) => {
    setVersionChecked(false);
    const latestVersion = await loadVersion(); // rejection leaves submission blocked
    setCurrentVersion(latestVersion);
    setOffline(false);
    setVersionChecked(true);
  };
  return { draft, saved, offline, currentVersion, updateDraft, disconnect, reconnect,
    canSubmit: !offline && versionChecked && currentVersion === openedVersion };
}
