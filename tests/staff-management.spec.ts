import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockStaffManagement } from './support/staff-management-api';

async function confirmAndVerify(page: Page) {
  const confirmation = page.locator('dialog.confirm-dialog').filter({ has: page.locator('textarea') });
  await confirmation.locator('textarea').fill('Fictional reviewed staff administration change');
  await confirmation.locator('input[type=checkbox]').check();
  await confirmation.getByRole('button', { name: 'Confirm', exact: true }).click();
  const verification = page.locator('.identity-dialog');
  await verification.getByLabel('Current password', { exact: true }).fill('Fictional-Password1234!');
  await verification.getByLabel('Verification code', { exact: true }).fill('123456');
  await verification.getByRole('button', { name: 'Verify and continue' }).click();
}
test('invite form requires confirmation and fresh authentication before sending one pending request', async ({ page }) => {
  const state = await mockStaffManagement(page);
  await page.goto('/administration');
  await page.getByRole('button', { name: 'Invite staff…' }).click();
  const editor = page.locator('dialog.access-editor');
  await editor.getByLabel('Name', { exact: true }).fill('Fictional new colleague');
  await editor.getByLabel('Email', { exact: true }).fill('new@example.test');
  await editor.getByLabel('Role', { exact: true }).selectOption('2');
  await editor.getByLabel('Access scope').selectOption('global');
  await editor.getByRole('button', { name: 'Review request' }).click();
  expect(state.proposals).toBe(0);
  await confirmAndVerify(page);
  await expect(page.getByRole('status')).toContainText('independent review');
  expect(state.proposals).toBe(1);
  expect(state.proofs).toBe(1);
  expect(state.headers['idempotency-key']).toMatch(/^[a-f0-9-]{36}$/);
  expect(state.command).toMatchObject({ kind: 'invite', confirmed: true, payload: { email: 'new@example.test', role_id: 2, scope: { kind: 'global', area_id: null } } });
  await page.getByRole('tab', { name: 'Access requests' }).click();
  await expect(page.getByText('Fictional new colleague', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('Fictional-Password1234!');
});
test('another administrator can review a pending request after reauthentication', async ({ page }) => {
  const state = await mockStaffManagement(page);
  await page.goto('/administration/access');
  await page.getByRole('tab', { name: 'Access requests' }).click();
  await page.getByRole('button', { name: 'Approve…', exact: true }).click();
  await confirmAndVerify(page);
  await expect(page.getByText('approved', { exact: true })).toBeVisible();
  expect(state.reviews).toBe(1);
});
test('self-approval is disabled and denied scope exposes no staff records', async ({ page }) => {
  const state = await mockStaffManagement(page, { ownRequest: true });
  await page.goto('/administration');
  await page.getByRole('tab', { name: 'Access requests' }).click();
  await expect(page.getByRole('button', { name: 'Approve…', exact: true })).toBeDisabled();
  expect(state.reviews).toBe(0);
});
test('administration is accessible in English and Swahili and on a small screen', async ({ page }) => {
  await mockStaffManagement(page);
  await page.goto('/administration');
  await expect(page.getByRole('heading', { name: 'Staff roles & permissions' })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: /Switch to Swahili/ }).click();
  await expect(page.getByRole('heading', { name: 'Majukumu na ruhusa za watumishi' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('scope denial keeps the administration page closed to staff data', async ({ page }) => {
  await mockStaffManagement(page, { forbidden: true });
  await page.goto('/administration');
  await expect(page.getByRole('alert')).toContainText('scope');
  await expect(page.getByText('Fictional staff colleague')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Invite staff…' })).toBeDisabled();
});

test('an invitation token leaves the address bar and acceptance still requires sign-in and MFA', async ({ page }) => {
  await mockStaffManagement(page);
  let accepted = 0;
  await page.route('**/auth/invitations/accept', async route => {
    const headers = { 'content-type': 'application/json', 'access-control-allow-origin': 'http://127.0.0.1:4173', 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'POST,OPTIONS', 'access-control-allow-headers': 'content-type,x-xsrf-token' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    expect(route.request().postDataJSON()).toMatchObject({ token: 'a'.repeat(64), password: 'Fictional-Password1234!' });
    accepted++;
    return route.fulfill({ status: 200, headers, body: JSON.stringify({ data: { state: 'sign_in_required' } }) });
  });
  await page.goto('/accept-invitation#token=' + 'a'.repeat(64));
  await expect(page).toHaveURL(/\/accept-invitation$/);
  await page.getByLabel('New password', { exact: true }).fill('Fictional-Password1234!');
  await page.getByLabel('Confirm password', { exact: true }).fill('Fictional-Password1234!');
  await page.getByRole('button', { name: 'Accept invitation', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('enroll an authenticator');
  expect(accepted).toBe(1);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('a'.repeat(64));
});
