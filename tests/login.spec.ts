import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockStaffApi } from './support/staff-api';

test('unauthenticated visitors land on the branded login page', async ({ page }) => {
  await mockStaffApi(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign in to Ravu' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Ravu' })).toBeVisible();
  await expect(page.locator('.sidebar')).toHaveCount(0);
  expect((await page.request.get('/brand/ravu-logo-white.png')).status()).toBe(200);
});
test('password and MFA must succeed before returning to the requested admin page', async ({ page }) => {
  const api = await mockStaffApi(page);
  await page.goto('/accounts');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email address').fill('staff@example.test');
  await page.getByLabel('Password', { exact: true }).fill('fictional-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Verify your sign-in' })).toBeVisible();
  await expect(page.locator('.sidebar')).toHaveCount(0);
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(page).toHaveURL(/\/accounts$/);
  await expect(page.locator('.sidebar .ravu-logo')).toBeVisible();
  await expect(page.getByText('Demo workspace', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Admin · Demo', { exact: true })).toHaveCount(0);
  expect(api.csrfHeader).toBe('fixture-csrf-proof');
  expect(api.loginCalls).toBe(1);
  expect(api.mfaCalls).toBe(1);
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(stored).not.toContain('fictional-test-password');
  await page.getByRole('button', { name: 'Security & sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(api.logoutCalls).toBe(1);
});
test('invalid credentials do not grant access and the password is cleared', async ({ page }) => {
  await mockStaffApi(page, { loginStatus: 401 });
  await page.goto('/login');
  await page.getByLabel('Email address').fill('staff@example.test');
  const password = page.getByLabel('Password', { exact: true });
  await password.fill('fictional-wrong-password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('could not be verified');
  await expect(password).toHaveValue('');
  await expect(password).toHaveAttribute('type', 'password');
  await expect(page.locator('.sidebar')).toHaveCount(0);
});
test('an HTML challenge or unavailable auth service never opens the admin area', async ({ page }) => {
  await mockStaffApi(page, { malformedLogin: true });
  await page.goto('/login');
  await page.getByLabel('Email address').fill('staff@example.test');
  await page.getByLabel('Password', { exact: true }).fill('fictional-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable');
  await expect(page.locator('.sidebar')).toHaveCount(0);
});
test('expired sessions cannot restore the admin page', async ({ page }) => {
  await mockStaffApi(page, { authenticated: true, expired: true });
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('.sidebar')).toHaveCount(0);
});
test('session expiry returns an open admin page to sign in', async ({ page }) => {
  await page.clock.install();
  await mockStaffApi(page, { authenticated: true });
  await page.goto('/');
  await expect(page.locator('.sidebar')).toBeVisible();
  await page.clock.fastForward(16 * 60_000);
  await expect(page).toHaveURL(/\/login$/);
});
test('login works with keyboard, mobile layout and Swahili copy without serious axe violations', async ({ page }) => {
  await mockStaffApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByRole('button', { name: 'SW', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ingia kwenye Ravu' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'sw');
  const result = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('failed sign-out does not falsely claim that the server session ended', async ({ page }) => {
  await mockStaffApi(page, { authenticated: true, logoutStatus: 503 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Security & sign out' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not sign out');
  await expect(page.locator('.sidebar')).toBeVisible();
});
