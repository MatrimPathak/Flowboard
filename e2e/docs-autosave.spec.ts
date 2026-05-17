import { test, expect } from '@playwright/test';
import { createDocFromNewDocButton, gotoDocs, insertEditorText, selectDoc, waitForSaved } from './helpers';

test('autosave survives immediate doc switch and refresh', async ({ page }) => {
  await gotoDocs(page);
  const a = `Autosave A ${Date.now()}`;
  const b = `Autosave B ${Date.now()}`;
  await createDocFromNewDocButton(page, a);
  await createDocFromNewDocButton(page, b);

  await selectDoc(page, a);
  await insertEditorText(page, 'Hello Chronicle');
  await selectDoc(page, b);
  await selectDoc(page, a);
  await waitForSaved(page);
  await page.reload();
  await expect(page.locator('.ProseMirror')).toContainText('Hello Chronicle');
});
