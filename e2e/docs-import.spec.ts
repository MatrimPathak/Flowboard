import { test, expect } from '@playwright/test';
import { gotoDocs, importTextFile } from './helpers';

test('imports markdown and extracts heading title', async ({ page }) => {
  await gotoDocs(page);
  await importTextFile(page, 'auth-spec.md', '# Authentication Spec\n\nhello world');
  await expect(page.locator('input.text-3xl')).toHaveValue('Authentication Spec');
  await expect(page.locator('.ProseMirror')).toContainText('Authentication Spec');
  await expect(page.locator('.ProseMirror')).toContainText('hello world');
});

test('imports plain text with fallback title', async ({ page }) => {
  await gotoDocs(page);
  await importTextFile(page, 'notes.txt', 'plain text file content');
  await expect(page.locator('input.text-3xl')).toHaveValue('plain text file content');
  await expect(page.locator('.ProseMirror')).toContainText('plain text file content');
});
