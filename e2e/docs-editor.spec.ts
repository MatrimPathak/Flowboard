import { test, expect } from '@playwright/test';
import { createDocFromNewDocButton, gotoDocs, waitForSaved } from './helpers';

test('heading, checklist and table persist after refresh', async ({ page }) => {
  await gotoDocs(page);
  await createDocFromNewDocButton(page, `Editor ${Date.now()}`);
  const editor = page.locator('.ProseMirror');
  await editor.click();

  await page.keyboard.type('/Heading');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Architecture Overview');
  await page.keyboard.press('Enter');

  await page.keyboard.type('/Checklist');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Task 1');
  await page.keyboard.press('Enter');

  await page.keyboard.type('/Table');
  await page.keyboard.press('Enter');

  await waitForSaved(page);
  await page.reload();

  await expect(page.locator('.ProseMirror h2')).toContainText('Architecture Overview');
  await expect(page.locator('.ProseMirror ul[data-type="taskList"]')).toBeVisible();
  await expect(page.locator('.ProseMirror table')).toBeVisible();
});
