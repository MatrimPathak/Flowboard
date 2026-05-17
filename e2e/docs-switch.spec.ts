import { test, expect } from '@playwright/test';
import { createDocFromNewDocButton, expectDocSelectedButton, gotoDocs, selectDoc } from './helpers';

test('switching documents updates selection and URL', async ({ page }) => {
  await gotoDocs(page);
  const a = `Doc A ${Date.now()}`;
  const b = `Doc B ${Date.now()}`;
  await createDocFromNewDocButton(page, a);
  await createDocFromNewDocButton(page, b);

  await selectDoc(page, a);
  await expectDocSelectedButton(page, a);
  await expect(page).toHaveURL(new RegExp('docId='));

  await selectDoc(page, b);
  await expectDocSelectedButton(page, b);
  const currentUrl = page.url();

  await page.reload();
  await expect(page).toHaveURL(currentUrl);
  await expect(page.locator('input.text-3xl')).toHaveValue(b);
});
