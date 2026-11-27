import type { Page } from '@playwright/test';
import { mockStaffApi } from './staff-api';
export async function mockStaffManagement(page: Page, options: { forbidden?: boolean; ownRequest?: boolean; superAdmin?: boolean; invitations?: boolean; members?: boolean; closureRequest?: boolean } = {}) {
  await mockStaffApi(page, { authenticated: true, permissions: ['overview.read', 'access.read', 'access.manage', 'access.approve'] });
  const state = { proposals: 0, reviews: 0, proofs: 0, members: 0, resends: 0, statusUpdates: 0, statusConflict: false, command: null as unknown, headers: {} as Record<string, string>, proof: '', requests: [] as Record<string, unknown>[], invitations: [] as { id: string; version: number; status: string; [key: string]: unknown }[], users: [] as Record<string, unknown>[], staffQueries: [] as string[] };
  const now = '2026-11-26T10:00:00Z';
  const metadata = { version: 1, created_at: now, updated_at: now, created_by: null, updated_by: null };
  const role = { ...metadata, id: '2', name: 'Fictional reviewer', name_sw: 'Mhakiki wa mfano', key: 'fictional-reviewer', enabled: true, protected: false, defaults: false, permissions: ['accounts.read'] };
  const change = { ...metadata, id: '1', kind: 'invite', subject_id: null, subject_version: null, status: 'pending', requested_by: options.ownRequest ? 'STAFF-TEST-001' : 'ANOTHER-TEST-STAFF', approved_by: null, request_hash: 'a'.repeat(64), reason: 'Fictional independently reviewed staffing request', summary: { name: 'Fictional invited colleague', email_masked: 'c***@example.test', role_id: '2', scope: { kind: 'global', area_id: null }, status: null, enabled: null, permissions: null } };
  state.requests.push(change);
  const member = { id: '21', version: 3, display_name: 'Fictional rider member', kind: 'rider', status: 'active', email_masked: 'r***@example.test', phone_masked: '+255 *** *** 321', phone_verified: true, email_verified: true, created_at: now };
  if (options.members || options.closureRequest) state.users.push(member);
  if (options.closureRequest) state.requests.push({ ...change, id: '7', kind: 'account_closure', subject_id: '21', subject_version: 3, approval_mode: 'super_admin', requested_by: 'ANOTHER-TEST-STAFF', reason: 'Fictional member asked to delete the account', summary: { name: 'Fictional rider member', email_masked: 'r***@example.test', role_id: null, scope: null, status: 'closed', enabled: null, permissions: null } });
  state.invitations = [{ ...metadata, id: '5', email_masked: 'e***@example.test', role_id: '2', status: 'expired', expires_at: '2026-11-25T10:00:00Z' }];
  await page.route('https://staging-api.ravultd.com/api/v1/admin/console/**', async route => {
    const path = new URL(route.request().url()).pathname.split('/console/')[1] ?? '';
    const headers = { 'content-type': 'application/json', 'access-control-allow-origin': 'http://127.0.0.1:4173', 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,x-xsrf-token,idempotency-key' };
    const send = (data: unknown, status = 200) => route.fulfill({ status, headers, body: JSON.stringify({ data, meta: { server_time: now, request_id: 'fictional-management-request', pagination: { page: 1, per_page: 25, total: Array.isArray(data) ? data.length : 1, last_page: 1 } } }) });
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path === 'auth/step-up' && 'code' in route.request().postDataJSON()) return send(null, 422);
    if (path === 'auth/step-up') { state.proofs++; state.proof = route.request().postDataJSON().action; return send({ action: state.proof, expires_at: new Date(Date.now() + 300_000).toISOString() }); }
    if (path === 'bootstrap' && options.superAdmin) {
      const { bootstrapFixture } = await import('./staff-api');
      return send({ ...bootstrapFixture(), is_super_admin: true, permissions: ['overview.read', 'access.read', 'access.manage', 'access.approve'] });
    }
    if (path.startsWith('auth/') || path === 'bootstrap') return route.fallback();
    if (options.forbidden) return send(null, 403);
    if (path === 'roles') return send([role]);
    if (path === 'operating-areas') return send([{ id: '1', label: 'Fictional operating area' }]);
    if (path === 'staff') state.staffQueries.push(new URL(route.request().url()).searchParams.get('q') ?? '');
    if (path === 'staff') return send([{ ...metadata, id: '3', display_name: 'Fictional staff colleague', email_masked: 's***@example.test', role_ids: ['2'], status: 'active', mfa_enrolled: true }]);
    if (path === 'staff-invitations') return send(options.invitations ? state.invitations : []);
    if (path === 'staff-invitations/5/resend') {
      if (state.proof !== 'access.manage') return send(null, 403);
      const body = route.request().postDataJSON();
      const current = state.invitations[0];
      if (!current || body.version !== current.version || !body.confirmed) return send(null, 409);
      state.proof = ''; state.resends++; state.command = body; state.headers = await route.request().allHeaders();
      state.invitations = [{ ...current, version: current.version + 1, status: 'pending', expires_at: '2026-11-27T10:00:00Z' }];
      return send(state.invitations[0]);
    }
    if (path.endsWith('/sessions')) return send([
      { ...metadata, id: '41', staff_id: 'STAFF-TEST-001', last_activity_at: now, expires_at: '2099-01-01T00:00:00Z', revoked: false, current: true },
      { ...metadata, id: '42', staff_id: 'STAFF-TEST-001', last_activity_at: now, expires_at: '2099-01-01T00:00:00Z', revoked: false, current: false },
      { ...metadata, id: '43', staff_id: 'STAFF-TEST-001', last_activity_at: now, expires_at: '2099-01-01T00:00:00Z', revoked: true, current: false },
    ]);
    if (path.startsWith('managed-users') && route.request().method() === 'GET') return send(state.users);
    if (/^managed-users\/[^/]+\/status$/.test(path)) {
      if (!options.superAdmin || state.proof !== 'access.manage') return send(null, 403);
      state.proof = '';
      const body = route.request().postDataJSON();
      const current = state.users.find(user => user.id === path.split('/')[1]);
      if (state.statusConflict || !current || current.version !== body.version || !body.confirmed) return send(null, 409);
      state.statusUpdates++; state.command = body; state.headers = await route.request().allHeaders();
      current.status = body.status; current.version = Number(current.version) + 1;
      return send(current);
    }
    if (path === 'managed-users') {
      if (!options.superAdmin || state.proof !== 'access.manage') return send(null, 403);
      state.proof = ''; state.members++; state.command = route.request().postDataJSON(); state.headers = await route.request().allHeaders();
      const body = route.request().postDataJSON();
      const user = { id: String(10 + state.members), version: 1, display_name: body.display_name, kind: body.kind, status: 'active', email_masked: 'm***@example.test', phone_masked: '+255 *** *** 678', phone_verified: false, email_verified: false, created_at: now };
      state.users.push(user);
      return send(user, 201);
    }
    if (path === 'access-requests' && route.request().method() === 'GET') return send(state.requests);
    if (path === 'access-requests') {
      if (state.proof !== 'access.manage') return send(null, 403);
      state.proof = ''; state.proposals++; state.command = route.request().postDataJSON(); state.headers = await route.request().allHeaders();
      const body = route.request().postDataJSON();
      if (body.kind === 'account_closure') {
        const target = state.users.find(user => Number(user.id) === body.subject_id);
        if (!target || target.version !== body.subject_version || Object.keys(body.payload).length) return send(null, 422);
        const closure = { ...change, id: '8', kind: 'account_closure', subject_id: String(body.subject_id), subject_version: body.subject_version, approval_mode: 'super_admin', requested_by: 'STAFF-TEST-001', reason: body.reason, summary: { name: target.display_name, email_masked: target.email_masked, role_id: null, scope: null, status: 'closed', enabled: null, permissions: null } };
        state.requests.push(closure);
        return send(closure, 201);
      }
      const proposed = { ...change, id: '2', status: body.apply_immediately ? 'approved' : 'pending', approval_mode: body.apply_immediately ? 'super_admin' : 'independent', requested_by: 'STAFF-TEST-001', summary: { ...change.summary, name: typeof body.payload.name === 'string' ? body.payload.name : body.payload.name.en, email_masked: body.payload.email ? 'n***@example.test' : null, role_id: body.payload.role_id ? String(body.payload.role_id) : null, scope: body.payload.scope ?? null, enabled: body.payload.enabled ?? null, permissions: body.payload.permissions ?? null } };
      state.requests.push(proposed);
      return send(proposed, 201);
    }
    if (path === 'access-requests/7/review') {
      if (!options.superAdmin || state.proof !== 'access.approve') return send(null, 403);
      state.proof = ''; state.reviews++;
      state.users = state.users.map(user => user.id === '21' ? { ...user, status: 'closed', version: 4 } : user);
      const updated = { ...state.requests.find(record => record.id === '7'), status: 'approved', version: 2 };
      state.requests = state.requests.map(record => record.id === '7' ? updated : record);
      return send(updated);
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
