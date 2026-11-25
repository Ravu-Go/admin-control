import { afterEach, describe, expect, it, vi } from 'vitest';
import { reauthenticateStaff, type StaffStepUpRequest } from './staff-auth';

afterEach(() => vi.unstubAllGlobals());
const values: StaffStepUpRequest = { password: 'Fictional-password', code: '123456', action: 'refunds.approve' };
function replies(data: unknown) { document.cookie = 'XSRF-TOKEN=fictional-proof; path=/'; const fetcher = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })).mockResolvedValueOnce(new Response(JSON.stringify({ data }), { status: 200, headers: { 'content-type': 'application/json' } })); vi.stubGlobal('fetch', fetcher); return fetcher; }
describe('typed step-up transport', () => {
  it('uses CSRF and credentialed requests to the canonical endpoint', async () => {
    const proof = { action: values.action, expires_at: new Date(Date.now() + 60_000).toISOString() }; const fetcher = replies(proof);
    expect(await reauthenticateStaff(values, new AbortController().signal)).toEqual(proof);
    expect(String(fetcher.mock.calls[1]?.[0])).toBe('https://staging-api.ravultd.com/api/v1/admin/console/auth/step-up');
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({ method: 'POST', credentials: 'include', redirect: 'error', headers: { 'X-XSRF-TOKEN': 'fictional-proof' } });
  });
  it.each([{ action: 'access.approve', expires_at: new Date(Date.now() + 60_000).toISOString() }, { action: values.action, expires_at: '2020-01-01T00:00:00Z' }])('rejects an unrelated or expired proof', async proof => {
    replies(proof); await expect(reauthenticateStaff(values)).rejects.toMatchObject({ status: 401 });
  });
});
