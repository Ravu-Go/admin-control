import { afterEach, expect, it, vi } from 'vitest';
import { sendPasswordCode, changeStaffPassword } from './staff-auth';
afterEach(() => vi.unstubAllGlobals());
function replies(data: unknown) { document.cookie = 'XSRF-TOKEN=fictional-proof; path=/'; const fetcher = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })).mockResolvedValueOnce(new Response(JSON.stringify({ data }), { status: 200, headers: { 'content-type': 'application/json' } })); vi.stubGlobal('fetch', fetcher); return fetcher; }
it('validates canonical delivery timing and sends current-password proof with CSRF', async () => {
  const fetcher = replies({ expires_in: 600, resend_after: 60 });
  expect(await sendPasswordCode({ current_password: 'Fictional-current123!' })).toEqual({ expires_in: 600, resend_after: 60 });
  expect(fetcher.mock.calls[1]?.[1]).toMatchObject({ credentials: 'include', cache: 'no-store', headers: { 'X-XSRF-TOKEN': 'fictional-proof' } });
});
it.each([null, { expires_in: -1, resend_after: 0 }, { expires_in: 600, resend_after: 60, code: '123456' }])('rejects malformed timing instead of claiming delivery', async value => { replies(value); await expect(sendPasswordCode({ current_password: 'Fictional-current123!' })).rejects.toThrow(); });
it('cancels before sending secrets if departure occurs during CSRF bootstrap', async () => {
  const controller = new AbortController(); const fetcher = replies({ expires_in: 600, resend_after: 60 });
  controller.abort(); await expect(sendPasswordCode({ current_password: 'Fictional-current123!' }, controller.signal)).rejects.toThrow(); expect(fetcher).toHaveBeenCalledTimes(1);
});
it('requires the logged-out response after password change', async () => {
  const fetcher = replies(null); fetcher.mockReset().mockResolvedValue(new Response(JSON.stringify({ data: { state: 'authenticated', staff_id: 'fictional', absolute_expires_at: null } }), { headers: { 'content-type': 'application/json' } }));
  await expect(changeStaffPassword({ code: '123456', password: 'Fictional-New123!', password_confirmation: 'Fictional-New123!' })).rejects.toThrow();
});
