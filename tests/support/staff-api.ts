import type { Page } from '@playwright/test';
import type { components } from '../../src/api/generated/admin';

export const bootstrapFixture = (now = Date.now()): components['schemas']['Bootstrap'] => ({
  staff_id: 'STAFF-TEST-001', role: 'Administrator', permissions: ['overview.read','accounts.read','verification.read','sos.read','trips.read','memberships.read','payments.read','referrals.read','marketplace.read','services.read','support.read','communications.read','reports.read','access.read'],
  environment: 'staging', demo_mode: true, demo_banner_required: true, timezone: 'Africa/Dar_es_Salaam', locale: 'en',
  enabled_features: [], open_sos_count: 2,
  session_expires_at: new Date(now + 30 * 60_000).toISOString(), idle_expires_at: new Date(now + 15 * 60_000).toISOString(),
});
export async function mockStaffApi(page: Page, options: { authenticated?: boolean; permissions?: components['schemas']['Bootstrap']['permissions']; loginStatus?: number; loginState?: 'authenticated' | 'mfa_required' | 'enrollment_required' | 'password_change_required'; expired?: boolean; malformedLogin?: boolean; bootstrapStatus?: number; logoutStatus?: number; passwordChangeStatus?: number } = {}) {
  const state = { authenticated: options.authenticated ?? false, loginCalls: 0, mfaCalls: 0, logoutCalls: 0, csrfCalls: 0, csrfRejections: 0, pendingExpired: false, csrfHeader: '' };
  await page.context().addCookies([{ name: 'XSRF-TOKEN', value: 'fixture-csrf-proof', domain: '127.0.0.1', path: '/' }]);
  await page.route('https://staging-api.ravultd.com/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const headers = { 'access-control-allow-origin': 'http://127.0.0.1:4173', 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type, x-xsrf-token', 'content-type': 'application/json' };
    const json = (status: number, data: unknown) => route.fulfill({ status, headers, body: JSON.stringify({ data, meta: { request_id: 'fixture-request' } }) });
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path === '/sanctum/csrf-cookie') {
      state.csrfCalls++;
      await page.context().addCookies([{ name: 'XSRF-TOKEN', value: 'fixture-csrf-proof', domain: '127.0.0.1', path: '/' }]);
      return route.fulfill({ status: 204, headers });
    }
    if (path.endsWith('/bootstrap')) {
      if (options.bootstrapStatus) return json(options.bootstrapStatus, null);
      // A new session must have future deadlines after the test advances the browser clock.
      const bootstrap = bootstrapFixture(await page.evaluate(() => Date.now()));
      if (options.permissions) bootstrap.permissions = options.permissions;
      if (options.expired) bootstrap.session_expires_at = '2020-01-01T00:00:00Z';
      return json(state.authenticated ? 200 : 401, state.authenticated ? bootstrap : null);
    }
    state.csrfHeader = (await route.request().allHeaders())['x-xsrf-token'] || '';
    if (route.request().method() === 'POST' && state.csrfRejections > 0) {
      state.csrfRejections--;
      return json(419, null);
    }
    if (path.endsWith('/auth/login')) {
      state.loginCalls++;
      if (options.malformedLogin) return route.fulfill({ status: 200, headers: { ...headers, 'content-type': 'text/html' }, body: '<html>Unavailable</html>' });
      if (options.loginStatus) return json(options.loginStatus, null);
      const next = options.loginState ?? 'mfa_required';
      state.pendingExpired = false;
      state.authenticated = next === 'authenticated';
      return json(200, { state: next, staff_id: 'STAFF-TEST-001', absolute_expires_at: bootstrapFixture().session_expires_at });
    }
    if (path.endsWith('/auth/mfa/setup')) return json(200, { secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', otpauth_uri: 'otpauth://totp/Ravu:test?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=Ravu' });
    if (path.endsWith('/auth/password/code')) return json(200, { expires_in: 600, resend_after: 60 });
    if (path.endsWith('/auth/password/change')) {
      if (options.passwordChangeStatus) return json(options.passwordChangeStatus, null);
      state.authenticated = false;
      return json(200, { state: 'logged_out', staff_id: null, absolute_expires_at: null });
    }
    if (path.endsWith('/auth/mfa/verify') || path.endsWith('/auth/mfa/confirm')) {
      state.mfaCalls++;
      if (state.pendingExpired) return json(401, null);
      if (route.request().postDataJSON().code !== '123456') return json(422, null);
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
