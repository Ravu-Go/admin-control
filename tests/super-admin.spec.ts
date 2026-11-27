import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockStaffManagement } from './support/staff-management-api';

async function verify(page: import('@playwright/test').Page) {
  const confirmation = page.locator('dialog.confirm-dialog').filter({ has: page.locator('textarea') });
  await confirmation.locator('textarea').fill('Fictional owner account administration');
  await confirmation.locator('input[type=checkbox]').check();
  await confirmation.getByRole('button', { name: 'Confirm', exact: true }).click();
  await page.getByLabel('Current password', { exact: true }).fill('Fictional-Password1234!');
  await page.getByLabel('Verification code', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
}

test('super admin applies an administrator invitation directly', async ({ page }) => {
  const state = await mockStaffManagement(page, { superAdmin: true, ownRequest: true });
  await page.goto('/administration');
  await page.getByRole('button', { name: 'Add admin or staff' }).click();
  const editor = page.locator('dialog.access-editor');
  await editor.getByLabel('Name', { exact: true }).fill('Fictional administrator');
  await editor.getByLabel('Email', { exact: true }).fill('admin@example.test');
  await editor.getByRole('combobox', { name: 'Role', exact: true }).selectOption('2');
  await editor.getByRole('combobox', { name: 'Access scope', exact: true }).selectOption('global');
  await editor.getByRole('button', { name: 'Apply change' }).click();
  expect(state.proposals).toBe(0);
  await verify(page);
  await expect(page.getByRole('status')).toContainText('Change applied');
  expect(state.command).toMatchObject({ apply_immediately: true, kind: 'invite', confirmed: true });
});

test('super admin can review their own pending request', async ({ page }) => {
  const state = await mockStaffManagement(page, { superAdmin: true, ownRequest: true });
  await page.goto('/administration');
  await page.getByRole('tab', { name: 'Access requests' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Fictional invited colleague');
  await expect(page.getByRole('button', { name: /^Approve/ })).toBeEnabled();
  await page.getByRole('button', { name: /^Approve/ }).click();
  await verify(page);
  await expect(page.getByText('approved', { exact: true })).toBeVisible();
  expect(state.reviews).toBe(1);
});

for (const kind of ['rider', 'driver', 'partner']) {
  test(`super admin creates a ${kind} through confirmation and fresh MFA`, async ({ page }) => {
    const state = await mockStaffManagement(page, { superAdmin: true });
    await page.goto('/administration');
    await page.getByRole('tab', { name: 'Users', exact: true }).click();
    await page.getByRole('button', { name: 'Create user…', exact: true }).click();
    const editor = page.locator('dialog.access-editor');
    await editor.getByLabel('Name', { exact: true }).fill('Fictional member');
    await editor.getByLabel('Email', { exact: true }).fill('member@example.test');
    await editor.getByLabel('Phone (+255)', { exact: true }).fill('+255712345678');
    await editor.getByRole('combobox', { name: 'Account type', exact: true }).selectOption(kind);
    await expect(editor.locator('input[type=password]')).toHaveCount(0);
    await editor.getByRole('button', { name: 'Confirm creation' }).click();
    expect(state.members).toBe(0);
    await verify(page);
    await expect(page.getByRole('status').filter({ hasText: 'User created' })).toBeVisible();
    expect(state.members).toBe(1);
    expect(state.proofs).toBe(1);
    expect(state.command).toMatchObject({ kind, confirmed: true, email: 'member@example.test' });
    expect(state.headers['idempotency-key']).toMatch(/^[a-f0-9-]{36}$/);
    await expect(page.getByRole('table')).toContainText('m***@example.test');
    await expect(page.getByRole('table')).not.toContainText('member@example.test');
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('member@example.test');
    expect(page.url()).not.toContain('member@example.test');
  });
}

test('regular administrators do not see owner user creation', async ({ page }) => {
  await mockStaffManagement(page);
  await page.goto('/administration');
  await expect(page.getByRole('tab', { name: 'Users', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add admin or staff' })).toHaveCount(0);
});

test('owner Users page and form remain accessible in both languages and on mobile', async ({ page }) => {
  await mockStaffManagement(page, { superAdmin: true });
  await page.goto('/administration');
  await page.getByRole('tab', { name: 'Users', exact: true }).click();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByRole('button', { name: 'Create user…', exact: true }).click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.locator('dialog.access-editor').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
  await page.getByRole('button', { name: /Switch to Swahili/ }).click();
  await expect(page.getByRole('button', { name: 'Unda mtumiaji…', exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('member setup directs the recipient to the Ravu app without a staff sign-in', async ({ page }) => {
  await mockStaffManagement(page);
  await page.route('**/auth/invitations/accept', async route => {
    const headers = { 'content-type': 'application/json', 'access-control-allow-origin': 'http://127.0.0.1:4173', 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'POST,OPTIONS', 'access-control-allow-headers': 'content-type,x-xsrf-token' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    return route.fulfill({ status: 201, headers, body: JSON.stringify({ data: { state: 'sign_in_required', account_kind: 'driver' } }) });
  });
  await page.goto('/accept-invitation#token=' + 'b'.repeat(64) + '&kind=member');
  await expect(page).toHaveURL(/\/accept-invitation$/);
  await expect(page.getByRole('heading', { name: 'Set up your Ravu account', exact: true })).toBeInViewport();
  await page.getByLabel('New password', { exact: true }).fill('Fictional-Password1234!');
  await page.getByLabel('Confirm password', { exact: true }).fill('Fictional-Password1234!');
  await page.getByRole('button', { name: 'Accept invitation', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('verify your phone');
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveCount(0);
});

function memberFixture() {
  return { id: '40', version: 1, display_name: 'Fictional managed member', kind: 'rider', status: 'active', email_masked: 'm***@example.test', phone_masked: '+255 *** *** 678', phone_verified: false, email_verified: false, created_at: '2026-11-26T10:00:00Z' };
}

test('owner member disable, enable and closure require confirmation and fresh proof', async ({ page }, testInfo) => {
  const state = await mockStaffManagement(page, { superAdmin: true });
  state.users.push(memberFixture());
  await page.goto('/administration');
  await expect(page.getByText('Your granted capabilities apply globally.', { exact: false })).toBeVisible();
  await page.getByRole('tab', { name: 'Users', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: 'Fictional managed member' });
  await page.screenshot({ path: testInfo.outputPath('owner-controls-desktop.png'), fullPage: true });
  for (const [index, action] of ['Disable…', 'Enable…', 'Close account…'].entries()) {
    await row.getByRole('button', { name: action, exact: true }).click();
    expect(state.statusUpdates).toBe(index);
    await verify(page);
    await expect(page.getByRole('status').filter({ hasText: 'Account status updated.' })).toBeVisible();
    expect(state.statusUpdates).toBe(index + 1);
    expect(state.proofs).toBe(index + 1);
    expect(state.command).toMatchObject({ confirmed: true, version: index + 1, status: ['suspended','active','closed'][index] });
    expect(state.headers['idempotency-key']).toMatch(/^[a-f0-9-]{36}$/);
  }
  await expect(row).toContainText('Closed · history retained');
  await expect(row.getByRole('button')).toHaveCount(0);
});

test('a stale member status decision shows conflict and never reports success', async ({ page }) => {
  const state = await mockStaffManagement(page, { superAdmin: true });
  state.users.push(memberFixture()); state.statusConflict = true;
  await page.goto('/administration');
  await page.getByRole('tab', { name: 'Users', exact: true }).click();
  await page.getByRole('button', { name: 'Disable…', exact: true }).click();
  await verify(page);
  await expect(page.getByRole('alert').filter({ hasText: 'The record changed.' })).toBeVisible();
  await expect(page.getByText('Account status updated.', { exact: true })).toHaveCount(0);
  expect(state.statusUpdates).toBe(0);
  await expect(page.getByRole('button', { name: 'Disable…', exact: true })).toBeVisible();
});

test('member controls remain accessible in Swahili on mobile without page overflow', async ({ page }, testInfo) => {
  const state = await mockStaffManagement(page, { superAdmin: true });
  state.users.push(memberFixture());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/administration');
  await page.getByRole('tab', { name: 'Users', exact: true }).click();
  await page.getByRole('button', { name: /Switch to Swahili/ }).click();
  const row = page.getByRole('row').filter({ hasText: 'Fictional managed member' });
  await row.getByRole('button', { name: 'Sitisha…', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sitisha akaunti: Fictional managed member' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('owner-controls-mobile.png'), fullPage: true });
  await page.locator('dialog.confirm-dialog').getByRole('button', { name: 'Ghairi', exact: true }).click();
  expect(state.statusUpdates).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(audit.violations.filter(item => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
});
