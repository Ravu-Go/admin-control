import { afterEach, expect, it, vi } from 'vitest';
import { staffRequest } from './staff-auth';
afterEach(() => { vi.unstubAllGlobals(); document.cookie = 'XSRF-TOKEN=; max-age=0; path=/'; });
it('preserves the same command and idempotency key across a rejected CSRF attempt', async () => {
  document.cookie = 'XSRF-TOKEN=old-proof; path=/';
  const fetcher = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 419 }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));
  vi.stubGlobal('fetch', fetcher);
  await staffRequest('/api/v1/admin/console/access-requests', { confirmed: true }, undefined, false, 'fictional-unique-command');
  expect(fetcher).toHaveBeenCalledTimes(3);
  const first = fetcher.mock.calls[0]?.[1]; const retry = fetcher.mock.calls[2]?.[1];
  expect(first).toMatchObject({ headers: { 'Idempotency-Key': 'fictional-unique-command' }, body: '{"confirmed":true}' });
  expect(retry).toMatchObject({ headers: first.headers, body: first.body, method: first.method, credentials: first.credentials });
});
it.each([401, 403, 409, 503])('does not replay staff administration on HTTP %s', async status => {
  document.cookie = 'XSRF-TOKEN=proof; path=/';
  const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status })); vi.stubGlobal('fetch', fetcher);
  await expect(staffRequest('/api/v1/admin/console/access-requests', {}, undefined, false, 'same-key')).rejects.toMatchObject({ status });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
