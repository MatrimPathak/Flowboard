import { expect, type Locator, type Page } from '@playwright/test';

export const E2E_WORKSPACE_ID = process.env.E2E_WORKSPACE_ID;

export function getWorkspaceDocsPath() {
  if (!E2E_WORKSPACE_ID) {
    throw new Error('E2E_WORKSPACE_ID is required for docs E2E tests');
  }
  return `/workspace/${E2E_WORKSPACE_ID}/docs`;
}

export async function gotoDocs(page: Page) {
  await page.goto(getWorkspaceDocsPath());
  await expect(page.getByText('Documentation')).toBeVisible();
}

export async function createBlankDoc(page: Page, titlePrefix = 'E2E Doc') {
  await page.getByRole('button', { name: 'Create Blank Doc' }).click();
  const titleInput = page.locator('input.text-3xl');
  await expect(titleInput).toBeVisible();
  const title = `${titlePrefix} ${Date.now()}`;
  await titleInput.fill(title);
  await expect(page.getByRole('button', { name: title })).toBeVisible();
  return { title, titleInput };
}

export async function createDocFromNewDocButton(page: Page, title: string) {
  await page.getByRole('button', { name: 'New Doc' }).click();
  const titleInput = page.locator('input.text-3xl');
  await expect(titleInput).toBeVisible();
  await titleInput.fill(title);
  await expect(page.getByRole('button', { name: title })).toBeVisible();
}

export async function selectDoc(page: Page, title: string) {
  await page.getByRole('button', { name: title }).click();
  await expect(page.locator('input.text-3xl')).toHaveValue(title);
}

export async function expectDocSelectedButton(page: Page, title: string) {
  const selectedButton = page.locator('button.bg-white\\/10.text-white', { hasText: title });
  await expect(selectedButton).toBeVisible();
}

export async function waitForSaved(page: Page) {
  await expect(page.getByText('Saved', { exact: false })).toBeVisible();
}

export async function insertEditorText(page: Page, text: string) {
  const editor = page.locator('.ProseMirror');
  await editor.click();
  await page.keyboard.type(text);
}

export async function importTextFile(page: Page, name: string, content: string) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import File' }).click();
  const fileChooser = await chooser;
  await fileChooser.setFiles({
    name,
    mimeType: name.endsWith('.md') ? 'text/markdown' : 'text/plain',
    buffer: Buffer.from(content, 'utf8'),
  });
}

export async function findDocButton(page: Page, title: string): Promise<Locator> {
  return page.getByRole('button', { name: title });
}
