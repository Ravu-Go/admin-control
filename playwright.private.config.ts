import { defineConfig } from '@playwright/test';
import base from './playwright.config';
if (!process.env.PRIVATE_VISUAL_REFERENCE_DIR) throw new Error('Private native reference directory is required; run this check in Ravu-API CI or an authorised local workspace.');
export default defineConfig({
  ...base, testDir: './tests/private', testIgnore: [], updateSnapshots: 'none',
  snapshotPathTemplate: process.env.PRIVATE_VISUAL_REFERENCE_DIR + '/{arg}{ext}',
  outputDir: 'test-results/private',
});
