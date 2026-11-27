import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockSettings } from './support/settings-api';

async function confirmAndVerify(page: Page, reason = 'Fictional brand and contact update') {
  const confirmation = page.locator('dialog.confirm-dialog').filter({ has: page.locator('textarea') });
  await confirmation.locator('textarea').fill(reason);
  await confirmation.locator('input[type=checkbox]').check();
  await confirmation.getByRole('button', { name: 'Confirm', exact: true }).click();
  const verification = page.locator('.identity-dialog');
  await verification.getByLabel('Current password', { exact: true }).fill('Fictional-Password1234!');
  await verification.getByLabel('Verification code', { exact: true }).fill('123456');
}

test('app details are validated, confirmed with fresh authentication and saved once', async ({ page }) => {
  const state = await mockSettings(page);
  await page.goto('/administration/settings');
  await expect(page.getByRole('heading', { name: 'System settings' })).toBeVisible();
  const save = page.getByRole('button', { name: 'Save changes…' });
  await expect(save).toBeDisabled();
  await page.getByLabel('App name').fill('Ravu Mobility');
  await page.getByLabel('Support phone').fill('0712 000 000');
  await save.click();
  await expect(page.getByText('Use international format, for example +255700000000.')).toBeVisible();
  expect(state.writes).toBe(0);
  await page.getByLabel('Support phone').fill('+255700000001');
  await page.getByLabel('Support email').fill('Help@Example.test');
  await page.getByLabel('Office address').fill('Fictional Office, Dar es Salaam');
  await save.click();
  await confirmAndVerify(page);
  await expect(page.getByRole('status').filter({ hasText: 'Settings saved.' })).toBeVisible();
  expect(state.writes).toBe(1);
  expect(state.headers['idempotency-key']).toMatch(/^[a-f0-9-]{36}$/);
  expect(state.last).toMatchObject({ version: 0, confirmed: true, name: 'Ravu Mobility', support_email: 'help@example.test', support_phone: '+255700000001', address: 'Fictional Office, Dar es Salaam' });
  await expect(page.getByText(/^Version 1/)).toBeVisible();
  await expect(page).toHaveTitle('Ravu Mobility · Control Centre');
});

test('a logo is checked locally, previewed, uploaded as multipart and can be removed', async ({ page }) => {
  const state = await mockSettings(page);
  await page.goto('/administration/settings');
  const chooser = page.locator('input[type=file]');
  await chooser.setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') });
  await expect(page.getByText('Choose a PNG, JPEG or WebP image. SVG is not accepted.')).toBeVisible();
  await chooser.setInputFiles({ name: 'brand.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6ioAAAAASUVORK5CYII=', 'base64') });
  await expect(page.getByText('brand.png')).toBeVisible();
  await page.getByRole('button', { name: 'Upload logo…' }).click();
  await confirmAndVerify(page, 'Fictional brand refresh for apps');
  await expect(page.getByRole('status').filter({ hasText: 'Logo updated.' })).toBeVisible();
  expect(state.contentType).toContain('multipart/form-data');
  expect(String(state.last)).toContain('Fictional brand refresh for apps');
  await expect(page.locator('.brand .brand-tile img')).toHaveAttribute('src', /company-profile\/logo\?v=1$/);
  await page.getByRole('button', { name: 'Remove…' }).click();
  await confirmAndVerify(page, 'Fictional logo withdrawal for review');
  await expect(page.getByRole('status').filter({ hasText: 'Logo removed.' })).toBeVisible();
  expect(state.last).toMatchObject({ version: 1, confirmed: true });
  await expect(page.locator('.brand .ravu-logo')).toBeVisible();
});

test('view-only staff see settings without edit controls and pages pass axe', async ({ page }) => {
  await mockSettings(page, { manage: false });
  await page.goto('/administration/settings');
  await expect(page.getByLabel('App name')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Choose logo' })).toBeDisabled();
  await expect(page.getByText('View only.', { exact: false })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Administration sections' }).getByRole('link', { name: 'Staff and roles' })).toBeVisible();
  const results = await new AxeBuilder({ page }).include('.system-settings').analyze();
  expect(results.violations.filter(violation => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('Support email').scrollIntoViewIfNeeded();
  await expect(page.getByLabel('Support email')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
