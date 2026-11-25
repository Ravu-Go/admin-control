import type { Page } from '@playwright/test';
import type { components } from '../../src/api/generated/admin';

export const bootstrapFixture = (): components['schemas']['Bootstrap'] => ({
  staff_id: 'STAFF-TEST-001', role: 'Administrator', permissions: ['overview.read','accounts.read'],
  environment: 'staging', demo_mode: true, demo_banner_required: true, timezone: 'Africa/Dar_es_Salaam', locale: 'en',
  enabled_features: [], open_sos_count: 2,
  session_expires_at: new Date(Date.now() + 30 * 60_000).toISOString(), idle_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
});
export async function mockStaffApi(page: Page, options: { authenticated?: boolean; loginStatus?: number; loginState?: 'authenticated' | 'mfa_required' | 'enrollment_required'; expired?: boolean; malformedLogin?: boolean; bootstrapStatus?: number; logoutStatus?: number } = {}) {
  const state = { authenticated: options.authenticated ?? false, loginCalls: 0, mfaCalls: 0, logoutCalls: 0, csrfHeader: '' };
  await page.context().addCookies([{ name: 'XSRF-TOKEN', value: 'fixture-csrf-proof', domain: '127.0.0.1', path: '/' }]);
  await page.route('https://staging-api.ravultd.com/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const headers = { 'access-control-allow-origin': 'http://127.0.0.1:4173', 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type, x-xsrf-token', 'content-type': 'application/json' };
    const json = (status: number, data: unknown) => route.fulfill({ status, headers, body: JSON.stringify({ data, meta: { request_id: 'fixture-request' } }) });
    if (route.request().method() === 'OPTIONS' || path === '/sanctum/csrf-cookie') return route.fulfill({ status: 204, headers });
    if (path.endsWith('/bootstrap')) {
      if (options.bootstrapStatus) return json(options.bootstrapStatus, null);
      const bootstrap = bootstrapFixture();
      if (options.expired) bootstrap.session_expires_at = '2020-01-01T00:00:00Z';
      return json(state.authenticated ? 200 : 401, state.authenticated ? bootstrap : null);
    }
    state.csrfHeader = (await route.request().allHeaders())['x-xsrf-token'] || '';
    if (path.endsWith('/auth/login')) {
      state.loginCalls++;
      if (options.malformedLogin) return route.fulfill({ status: 200, headers: { ...headers, 'content-type': 'text/html' }, body: '<html>Unavailable</html>' });
      if (options.loginStatus) return json(options.loginStatus, null);
      const next = options.loginState ?? 'mfa_required';
      state.authenticated = next === 'authenticated';
      return json(200, { state: next, staff_id: 'STAFF-TEST-001', absolute_expires_at: bootstrapFixture().session_expires_at });
    }
    if (path.endsWith('/auth/mfa/verify')) {
      state.mfaCalls++;
      if (route.request().postDataJSON().code !== '123456') return json(401, null);
      state.authenticated = true;
      return json(200, { state: 'authenticated', staff_id: 'STAFF-TEST-001', absolute_expires_at: bootstrapFixture().session_expires_at });
    }
    if (path.endsWith('/auth/logout')) {
      state.logoutCalls++;
      if (options.logoutStatus) return json(options.logoutStatus, null);
      state.authenticated = false;
      return json(200, { state: 'logged_out', staff_id: null, absolute_expires_at: null });
    }
    return route.abort();
  });
  return state;
}
