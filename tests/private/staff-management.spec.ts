import { test, expect } from '@playwright/test';
import { mockStaffManagement } from '../support/staff-management-api';
test('A22 staff administration desktop and mobile evidence stays private', async ({ page }, testInfo) => {
  await mockStaffManagement(page);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/administration');
    await expect(page.getByRole('heading', { name: 'Staff roles and permissions' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const matrix = testInfo.outputPath(`a22-roles-${width}.png`);
    await page.screenshot({ path: matrix, fullPage: true });
    await testInfo.attach(`a22-roles-${width}`, { path: matrix, contentType: 'image/png' });
    await page.getByRole('button', { name: 'Invite staff' }).click();
    await expect(page.locator('dialog.access-editor')).toBeVisible();
    const editor = testInfo.outputPath(`a22-invite-${width}.png`);
    await page.screenshot({ path: editor, fullPage: true });
    await testInfo.attach(`a22-invite-${width}`, { path: editor, contentType: 'image/png' });
    await page.goto('/accept-invitation');
    await expect(page.getByRole('heading', { name: 'Accept your staff invitation', exact: true })).toBeInViewport();
    const acceptance = testInfo.outputPath(`staff-invitation-accept-${width}.png`);
    await page.screenshot({ path: acceptance, fullPage: true });
    await testInfo.attach(`staff-invitation-accept-${width}`, { path: acceptance, contentType: 'image/png' });
  }
});

test('super administrator user creation and member setup evidence stays private', async ({ page }, testInfo) => {
  await mockStaffManagement(page, { superAdmin: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/administration');
    await page.getByRole('tab', { name: 'Users', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Create user', exact: true })).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    const directory = testInfo.outputPath(`a22-owner-users-${width}.png`);
    await page.screenshot({ path: directory, fullPage: true });
    await testInfo.attach(`a22-owner-users-${width}`, { path: directory, contentType: 'image/png' });
    await page.getByRole('button', { name: 'Create user', exact: true }).click();
    const editor = testInfo.outputPath(`a22-create-member-${width}.png`);
    await page.screenshot({ path: editor, fullPage: true });
    await testInfo.attach(`a22-create-member-${width}`, { path: editor, contentType: 'image/png' });
    await page.goto('/accept-invitation#kind=member');
    await expect(page.getByRole('heading', { name: 'Set up your Ravu account', exact: true })).toBeInViewport();
    const acceptance = testInfo.outputPath(`member-invitation-accept-${width}.png`);
    await page.screenshot({ path: acceptance, fullPage: true });
    await testInfo.attach(`member-invitation-accept-${width}`, { path: acceptance, contentType: 'image/png' });
  }
});
