import type { Page } from '@playwright/test';
import { mockStaffApi } from './staff-api';
import { accountFixture } from './accounts-fixture';

export async function mockAccounts(page: Page, options: { readOnly?: boolean } = {}) {
  await mockStaffApi(page, { authenticated: true, enabledFeatures: ['accounts'], permissions: options.readOnly ? ['accounts.read'] : ['accounts.read', 'accounts.manage'] });
  const state = { account: accountFixture(), status: 200, listStatus: 200, delay: 0, readDelay: 0, empty: false, calls: [] as { body: Record<string, unknown>; key: string }[], queries: [] as URL[] };
  await page.route('**/api/v1/admin/console/accounts**', async route => {
    const url = new URL(route.request().url());
    const headers = { 'content-type': 'application/json', 'access-control-allow-origin': 'http://127.0.0.1:4173', 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,x-xsrf-token,idempotency-key' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    const json = (status: number, data: unknown) => route.fulfill({ status, headers, body: JSON.stringify(status === 200 ? { data, meta: { server_time: '2026-11-27T08:00:00Z', pagination: { page: 1, per_page: 25, total: state.empty ? 0 : 6, last_page: 1 } } } : { error: status === 409 ? 'version_conflict' : 'unavailable' }) });
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      state.calls.push({ body, key: route.request().headers()['idempotency-key'] ?? '' });
      if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
      if (state.status !== 200) return json(state.status, null);
      state.account = { ...state.account, account_status: body.status, version: state.account.version + 1, history: [...state.account.history, { id: '2', action: 'account.status_changed', created_at: '2026-11-27T08:00:00Z' }] };
      return json(200, state.account);
    }
    if (state.readDelay) await new Promise(resolve => setTimeout(resolve, state.readDelay));
    if (url.pathname.endsWith('/accounts')) {
      state.queries.push(url);
      const names = ['Amina M.', 'Alex M.', 'Juma K.', 'Neema S.', 'Client B.', 'Driver C.'];
      const rows = names.map((name, index) => ({ ...accountFixture(String(14 + index)), display_name: name, kind: [1, 4].includes(index) ? 'client' : 'driver', account_status: index === 5 ? 'suspended' : 'active' }));
      const audience = url.searchParams.get('audience');
      return json(state.listStatus, (state.empty ? [] : rows).filter(row => audience === 'drivers' ? row.kind === 'driver' : audience === 'clients' ? row.kind === 'client' : true));
    }
    return json(state.listStatus, state.account);
  });
  return state;
}
