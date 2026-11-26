import { afterEach, expect, it, vi } from 'vitest';
import { signInStaff, verifyStaffMfa } from './staff-auth';

afterEach(() => { vi.unstubAllGlobals(); document.cookie = 'XSRF-TOKEN=; max-age=0; path=/'; });
const state = { data: { state: 'mfa_required', staff_id: null, absolute_expires_at: null } };
const json = (status: number, body: unknown = state) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const csrf = () => new Response(null, { status: 204 });

it('refreshes a rejected CSRF cookie once and retries only the rejected POST', async () => {
  document.cookie = 'XSRF-TOKEN=expired-proof; path=/';
  const fetcher = vi.fn().mockResolvedValueOnce(csrf()).mockResolvedValueOnce(json(419))
    .mockImplementationOnce(async () => { document.cookie = 'XSRF-TOKEN=fresh-proof; path=/'; return csrf(); }).mockResolvedValueOnce(json(200));
  vi.stubGlobal('fetch', fetcher);
  await expect(signInStaff({ email: 'staff@example.test', password: 'Fictional-password' })).resolves.toMatchObject({ state: 'mfa_required' });
  expect(fetcher).toHaveBeenCalledTimes(4);
  expect(fetcher.mock.calls.map(call => new URL(String(call[0])).pathname)).toEqual(['/sanctum/csrf-cookie', '/api/v1/admin/console/auth/login', '/sanctum/csrf-cookie', '/api/v1/admin/console/auth/login']);
  expect(fetcher.mock.calls[3]?.[1]).toMatchObject({ headers: { 'X-XSRF-TOKEN': 'fresh-proof' }, credentials: 'include' });
});

it('recovers a missing cookie on an already-open MFA screen', async () => {
  document.cookie = 'XSRF-TOKEN=; max-age=0; path=/';
  const fetcher = vi.fn().mockImplementationOnce(async () => { document.cookie = 'XSRF-TOKEN=fresh-proof; path=/'; return csrf(); }).mockResolvedValueOnce(json(200, { data: { state: 'authenticated', staff_id: 'FIXTURE', absolute_expires_at: null } }));
  vi.stubGlobal('fetch', fetcher);
  await expect(verifyStaffMfa({ code: '123456' })).resolves.toMatchObject({ state: 'authenticated' });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(String(fetcher.mock.calls[0]?.[0])).toContain('/sanctum/csrf-cookie');
});

it('stops after one refresh when CSRF continues to fail', async () => {
  document.cookie = 'XSRF-TOKEN=old-proof; path=/';
  const fetcher = vi.fn().mockResolvedValueOnce(json(419)).mockResolvedValueOnce(csrf()).mockResolvedValueOnce(json(419));
  vi.stubGlobal('fetch', fetcher);
  await expect(verifyStaffMfa({ code: '123456' })).rejects.toMatchObject({ status: 419 });
  expect(fetcher).toHaveBeenCalledTimes(3);
});

it.each([401, 403, 422, 429, 500, 503])('never replays a credential request on HTTP %s', async status => {
  document.cookie = 'XSRF-TOKEN=valid-proof; path=/';
  const fetcher = vi.fn().mockResolvedValue(json(status)); vi.stubGlobal('fetch', fetcher);
  await expect(verifyStaffMfa({ code: '123456' })).rejects.toMatchObject({ status });
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('does not replay a timed-out or failed request', async () => {
  document.cookie = 'XSRF-TOKEN=valid-proof; path=/';
  const fetcher = vi.fn().mockRejectedValue(new TypeError('Fictional network failure')); vi.stubGlobal('fetch', fetcher);
  await expect(verifyStaffMfa({ code: '123456' })).rejects.toMatchObject({ status: 0 });
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('does not send credentials if departure occurs while refreshing CSRF', async () => {
  document.cookie = 'XSRF-TOKEN=old-proof; path=/';const controller = new AbortController();
  const fetcher = vi.fn().mockResolvedValueOnce(json(419)).mockImplementationOnce(async () => { controller.abort(); return csrf(); }); vi.stubGlobal('fetch', fetcher);
  const { reauthenticateStaff } = await import('./staff-auth');
  // Explicit step-up bootstrap completes first; the rejected POST must never be replayed after abort.
  fetcher.mockReset().mockResolvedValueOnce(csrf()).mockResolvedValueOnce(json(419)).mockImplementationOnce(async () => { controller.abort(); return csrf(); });
  await expect(reauthenticateStaff({ password: 'Fictional-password', code: '123456', action: 'refunds.approve' }, controller.signal)).rejects.toMatchObject({ status: 0 });
  expect(fetcher).toHaveBeenCalledTimes(3);
});
