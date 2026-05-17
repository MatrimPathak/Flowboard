import { test, expect } from '@playwright/test';
import { createBlankDoc, gotoDocs } from './helpers';

test('create blank doc persists after refresh', async ({ page }) => {
  await gotoDocs(page);
  const { title, titleInput } = await createBlankDoc(page, 'Create Persist');
  await expect(titleInput).toBeFocused();
  await page.reload();
  await expect(page.getByRole('button', { name: title })).toBeVisible();
  await expect(page.locator('input.text-3xl')).toHaveValue(title);
});
