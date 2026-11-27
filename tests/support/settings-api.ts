import type { Page } from '@playwright/test';
import { mockStaffApi } from './staff-api';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6ioAAAAASUVORK5CYII=', 'base64');

/** Fictional company-profile API: console reads and audited writes plus the public branding read. */
export async function mockSettings(page: Page, options: { manage?: boolean } = {}) {
  await mockStaffApi(page, { authenticated: true, permissions: ['overview.read', 'access.read', 'settings.read', ...(options.manage === false ? [] : ['settings.manage' as const])] });
  const state = {
    profile: { name: 'Ravu', logo_url: null as string | null, office_location: null as null | { address: string; latitude: number | null; longitude: number | null },
      support_email: null as string | null, support_phone: null as string | null, version: 0, updated_at: null as string | null },
    proof: '', writes: 0, last: null as unknown, contentType: '', headers: {} as Record<string, string>,
  };
  const headers = { 'content-type': 'application/json', 'access-control-allow-origin': 'http://127.0.0.1:4173', 'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'content-type,x-xsrf-token,idempotency-key' };
  await page.route('https://staging-api.ravultd.com/api/v1/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const send = (data: unknown, status = 200) => route.fulfill({ status, headers, body: JSON.stringify({ data, meta: { request_id: 'fixture-settings', server_time: '2026-11-27T10:00:00Z' } }) });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path === '/api/v1/company-profile') return send(state.profile);
    if (path === '/api/v1/company-profile/logo') return route.fulfill({ status: 200, headers: { ...headers, 'content-type': 'image/png' }, body: PNG });
    if (path === '/api/v1/admin/console/auth/step-up' && 'code' in request.postDataJSON()) return send(null, 422);
    if (path === '/api/v1/admin/console/auth/step-up') { state.proof = request.postDataJSON().action; return send({ action: state.proof, expires_at: new Date(Date.now() + 300_000).toISOString() }); }
    if (!path.startsWith('/api/v1/admin/console/company-profile')) return route.fallback();
    if (request.method() === 'GET') return send(state.profile);
    if (options.manage === false || state.proof !== 'settings.manage') return send(null, 403);
    state.proof = ''; state.writes++; state.headers = await request.allHeaders(); state.contentType = state.headers['content-type'] ?? '';
    const next = { ...state.profile, version: state.profile.version + 1, updated_at: '2026-11-27T10:00:00Z' };
    if (path.endsWith('/logo/removal')) { state.last = request.postDataJSON(); state.profile = { ...next, logo_url: null }; return send(state.profile); }
    if (path.endsWith('/logo')) { state.last = request.postData(); state.profile = { ...next, logo_url: `https://staging-api.ravultd.com/api/v1/company-profile/logo?v=${next.version}` }; return send(state.profile); }
    const body = request.postDataJSON();
    if (body.version !== state.profile.version) return send(null, 409);
    state.last = body;
    state.profile = { ...next, name: body.name, support_email: body.support_email, support_phone: body.support_phone,
      office_location: body.address ? { address: body.address, latitude: null, longitude: null } : null };
    return send(state.profile);
  });
  return state;
}
