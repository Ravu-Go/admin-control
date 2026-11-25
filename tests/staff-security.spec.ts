import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockStaffApi } from './support/staff-api';

test('authenticator enrollment verifies a code before opening the admin page', async ({ page }) => {
  await mockStaffApi(page, { loginState: 'enrollment_required' });
  await page.goto('/login');
  await page.getByLabel('Email address').fill('staff@example.test');
  await page.getByLabel('Password', { exact: true }).fill('fictional-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.sidebar')).toHaveCount(0);
  await page.getByRole('button', { name: 'Set up authenticator', exact: true }).click();
  await expect(page.locator('.enrollment-key')).toBeVisible();
  await page.getByLabel('Verification code', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(page.locator('.sidebar')).toBeVisible();
});

test('temporary password requires email verification and returns to sign-in', async ({ page }) => {
  await mockStaffApi(page, { loginState: 'password_change_required' });
  await page.goto('/login');
  await page.getByLabel('Email address').fill('staff@example.test');
  await page.getByLabel('Password', { exact: true }).fill('fictional-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Replace your temporary password' })).toBeVisible();
  await page.getByLabel('Current password', { exact: true }).fill('fictional-test-password');
  await page.getByRole('button', { name: 'Send email code', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Code sent');
  await expect(page.getByLabel('Current password', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Resend in 60s' })).toBeDisabled();
  await expect(page.getByRole('timer')).toContainText('Code expires');
  await page.getByLabel('Email verification code').fill('123456');
  await page.getByLabel('New password', { exact: true }).fill('Fictional-New123!');
  await page.getByLabel('Confirm new password', { exact: true }).fill('Fictional-New123!');
  await page.getByRole('button', { name: 'Confirm password change and sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to Ravu' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Password changed');
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('Fictional-New123!');
});

test('invalid email verification keeps the staff security form open', async ({ page }) => {
  await mockStaffApi(page, { authenticated: true, passwordChangeStatus: 422 });
  await page.goto('/');
  await page.getByRole('link', { name: 'Change password', exact: true }).click();
  await expect(page).toHaveURL(/\/account\/security$/);
  await page.getByLabel('Current password', { exact: true }).fill('fictional-test-password');
  await page.getByRole('button', { name: 'Send email code', exact: true }).click();
  await page.getByLabel('Email verification code').fill('000000');
  await page.getByLabel('New password', { exact: true }).fill('Fictional-New123!');
  await page.getByLabel('Confirm new password', { exact: true }).fill('Fictional-New123!');
  await page.getByRole('button', { name: 'Confirm password change and sign out' }).click();
  await expect(page.getByRole('alert')).toContainText('could not be verified');
  await expect(page.getByLabel('New password', { exact: true })).toHaveValue('');
  await expect(page.locator('.sidebar')).toBeVisible();
});

test('email code form is accessible and responsive in EN and SW', async ({ page }, testInfo) => {
  await mockStaffApi(page, { authenticated: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/account/security');
  await page.getByLabel('Current password', { exact: true }).fill('fictional-test-password');
  await page.getByRole('button', { name: 'Send email code', exact: true }).click();
  await page.getByLabel('Email verification code').fill('123 456');
  await expect(page.getByLabel('Email verification code')).toHaveValue('123456');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const screenshotPath = testInfo.outputPath('email-verification-mobile.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await testInfo.attach('email-verification-mobile', { path: screenshotPath, contentType: 'image/png' });
  await page.getByRole('button', { name: 'Switch to Swahili' }).click();
  await expect(page.getByRole('heading', { name: 'Angalia barua pepe yako' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
