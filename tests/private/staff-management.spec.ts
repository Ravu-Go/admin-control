import { test, expect } from '@playwright/test';
import { mockStaffManagement } from '../support/staff-management-api';
test('A22 staff administration desktop and mobile evidence stays private', async ({ page }, testInfo) => {
  await mockStaffManagement(page);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/administration');
    await expect(page.getByRole('heading', { name: 'Staff roles & permissions' })).toBeVisible();
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
