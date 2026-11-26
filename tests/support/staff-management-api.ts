import type { Page } from '@playwright/test';
import { mockStaffApi } from './staff-api';
export async function mockStaffManagement(page: Page, options: { forbidden?: boolean; ownRequest?: boolean } = {}) {
  await mockStaffApi(page, { authenticated: true, permissions: ['overview.read', 'access.read', 'access.manage', 'access.approve'] });
  const state = { proposals: 0, reviews: 0, proofs: 0, command: null as unknown, headers: {} as Record<string, string>, proof: '', requests: [] as Record<string, unknown>[] };
  const now = '2026-11-26T10:00:00Z';
  const metadata = { version: 1, created_at: now, updated_at: now, created_by: null, updated_by: null };
  const role = { ...metadata, id: '2', name: 'Fictional reviewer', name_sw: 'Mhakiki wa mfano', key: 'fictional-reviewer', enabled: true, protected: false, defaults: false, permissions: ['accounts.read'] };
  const change = { ...metadata, id: '1', kind: 'invite', subject_id: null, subject_version: null, status: 'pending', requested_by: options.ownRequest ? 'STAFF-TEST-001' : 'ANOTHER-TEST-STAFF', approved_by: null, request_hash: 'a'.repeat(64), reason: 'Fictional independently reviewed staffing request', summary: { name: 'Fictional invited colleague', email_masked: 'c***@example.test', role_id: '2', scope: { kind: 'global', area_id: null }, status: null, enabled: null, permissions: null } };
  state.requests.push(change);
  await page.route('https://staging-api.ravultd.com/api/v1/admin/console/**', async route => {
    const path = new URL(route.request().url()).pathname.split('/console/')[1] ?? '';
    const headers = { 'content-type': 'application/json', 'access-control-allow-origin': 'http://127.0.0.1:4173', 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,x-xsrf-token,idempotency-key' };
    const send = (data: unknown, status = 200) => route.fulfill({ status, headers, body: JSON.stringify({ data, meta: { server_time: now, request_id: 'fictional-management-request', pagination: { page: 1, per_page: 25, total: Array.isArray(data) ? data.length : 1, last_page: 1 } } }) });
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path === 'auth/step-up') { state.proofs++; state.proof = route.request().postDataJSON().action; return send({ action: state.proof, expires_at: new Date(Date.now() + 300_000).toISOString() }); }
    if (path.startsWith('auth/') || path === 'bootstrap') return route.fallback();
    if (options.forbidden) return send(null, 403);
    if (path === 'roles') return send([role]);
    if (path === 'operating-areas') return send([{ id: '1', label: 'Fictional operating area' }]);
    if (path === 'staff') return send([{ ...metadata, id: '3', display_name: 'Fictional staff colleague', email_masked: 's***@example.test', role_ids: ['2'], status: 'active', mfa_enrolled: true }]);
    if (path === 'staff-invitations' || path.endsWith('/sessions')) return send([]);
    if (path === 'access-requests' && route.request().method() === 'GET') return send(state.requests);
    if (path === 'access-requests') {
      if (state.proof !== 'access.manage') return send(null, 403);
      state.proof = ''; state.proposals++; state.command = route.request().postDataJSON(); state.headers = await route.request().allHeaders();
      const body = route.request().postDataJSON();
      const proposed = { ...change, id: '2', requested_by: 'STAFF-TEST-001', summary: { ...change.summary, name: typeof body.payload.name === 'string' ? body.payload.name : body.payload.name.en, email_masked: body.payload.email ? 'n***@example.test' : null, role_id: body.payload.role_id ? String(body.payload.role_id) : null, scope: body.payload.scope ?? null, enabled: body.payload.enabled ?? null, permissions: body.payload.permissions ?? null } };
      state.requests.push(proposed);
      return send(proposed, 201);
    }
    if (path === 'access-requests/1/review') {
      if (state.proof !== 'access.approve') return send(null, 403);
      state.proof = ''; state.reviews++;
      const updated = { ...change, status: route.request().postDataJSON().decision === 'approve' ? 'approved' : 'rejected', version: 2 };
      state.requests = [updated];
      return send(updated);
    }
    return route.fallback();
  });
  return state;
}
