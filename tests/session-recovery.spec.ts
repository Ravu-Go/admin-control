import { test, expect, type Page } from '@playwright/test';
import { mockStaffApi } from './support/staff-api';

async function credentials(page: Page) {
  await page.getByLabel('Email address').fill('staff@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Fictional-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Verify your sign-in' })).toBeVisible();
}
async function mfa(page: Page) {
  await page.getByLabel('Verification code', { exact: true }).fill('123456');
}

test('signs in after idle expiry with a missing cookie and a rotated CSRF rejection, without reloading', async ({ page }) => {
  await page.clock.install();
  const api = await mockStaffApi(page, { authenticated: true });
  await page.goto('/accounts');await expect(page.locator('.sidebar')).toBeVisible();
  await page.evaluate(() => { document.documentElement.dataset.recoveryDocument = 'original-document'; });
  api.authenticated = false;
  await page.context().clearCookies({ name: 'XSRF-TOKEN' });
  await page.clock.fastForward(16 * 60_000);
  await expect(page).toHaveURL(/\/login$/);
  api.csrfRejections = 1;
  await credentials(page);await mfa(page);
  await expect(page).toHaveURL(/\/accounts$/);await expect(page.locator('.sidebar')).toBeVisible();
  expect(api.loginCalls).toBe(1);expect(api.mfaCalls).toBe(1);expect(api.csrfCalls).toBe(2);
  await expect(page.locator('html')).toHaveAttribute('data-recovery-document', 'original-document');
});

test('expired MFA challenge returns to password sign-in and can complete a fresh attempt in the same document', async ({ page }) => {
  await page.clock.install();const api = await mockStaffApi(page);
  await page.goto('/accounts');await credentials(page);
  await page.evaluate(() => { document.documentElement.dataset.recoveryDocument = 'original-document'; });
  await page.clock.fastForward(11 * 60_000);api.pendingExpired = true;
  await mfa(page);
  await expect(page.getByRole('heading', { name: 'Sign in to Ravu' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('session expired');
  await expect(page.getByLabel('Email address')).toHaveValue('staff@example.test');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await credentials(page);await mfa(page);await expect(page.locator('.sidebar')).toBeVisible();
  expect(api.loginCalls).toBe(2);await expect(page.locator('html')).toHaveAttribute('data-recovery-document', 'original-document');
});

test('persistent CSRF rejection stops after one retry and permits a new sign-in attempt', async ({ page }) => {
  const api = await mockStaffApi(page);await page.goto('/login');
  api.csrfRejections = 2;
  await page.getByLabel('Email address').fill('staff@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Fictional-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('session expired');
  expect(api.csrfCalls).toBe(2);expect(api.loginCalls).toBe(0);
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await credentials(page);await mfa(page);await expect(page.locator('.sidebar')).toBeVisible();
  expect(api.loginCalls).toBe(1);
});
