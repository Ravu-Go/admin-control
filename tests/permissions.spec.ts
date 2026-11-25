import { test, expect } from '@playwright/test';
import { mockStaffApi } from './support/staff-api';

test('missing grants disable navigation and deny direct URLs regardless of role label', async ({ page }) => {
  await mockStaffApi(page, { authenticated: true, permissions: ['accounts.read'] });
  await page.goto('/accounts');
  await expect(page.getByRole('link', { name: 'Accounts', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Payments', exact: true })).toHaveCount(0);
  await expect(page.locator('.nav-disabled').filter({ hasText: 'Payments' })).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('.topbar-sos')).toHaveCount(0);
  await page.goto('/payments');
  await expect(page.getByRole('heading', { name: 'You do not have permission for this action.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reload permissions' })).toBeVisible();
  await page.goto('/account/security');
  await expect(page.getByLabel('Current password')).toBeVisible();
});
