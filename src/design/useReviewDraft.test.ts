import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useReviewDraft } from './useReviewDraft';
it('retains a draft, rechecks versions on reconnect and never submits an action', async () => {
  const { result } = renderHook(() => useReviewDraft('fixture-session/DEMO-014', 2));
  act(() => { result.current.updateDraft('Fictional review note'); result.current.disconnect(); });
  expect(result.current.saved).toBe(true);
  expect(result.current.canSubmit).toBe(false);
  const loader = vi.fn().mockResolvedValue(3);
  await act(async () => { await result.current.reconnect(loader); });
  expect(loader).toHaveBeenCalledTimes(1);
  expect(result.current.currentVersion).toBe(3);
  expect(result.current.canSubmit).toBe(false);
  expect(result.current.draft).toBe('Fictional review note');
});
it('does not claim that a draft was saved when local storage fails', () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); } } as unknown as Storage;
  const { result } = renderHook(() => useReviewDraft('fixture-quota', 1, storage));
  act(() => result.current.updateDraft('Example'));
  expect(result.current.saved).toBe(false);
});
