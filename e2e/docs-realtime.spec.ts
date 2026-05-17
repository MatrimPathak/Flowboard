import { test, expect } from '@playwright/test';
import { getWorkspaceDocsPath } from './helpers';
import { collection, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../src/lib/firebase';

test('realtime sync across two tabs for create/update/delete', async ({ browser }) => {
  const path = getWorkspaceDocsPath();
  const context = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
  const pageA = await context.newPage();
  const pageB = await context.newPage();

  await pageA.goto(path);
  await pageB.goto(path);

  const title = `Realtime ${Date.now()}`;
  await pageA.getByRole('button', { name: 'New Doc' }).click();
  const titleInputA = pageA.locator('input.text-3xl');
  await titleInputA.fill(title);

  await expect(pageB.getByRole('button', { name: title })).toBeVisible();
  await pageB.getByRole('button', { name: title }).click();

  const renamed = `${title} Updated`;
  await titleInputA.fill(renamed);
  await expect(pageB.getByRole('button', { name: renamed })).toBeVisible();

  const docsQ = query(collection(db, 'docs'), where('title', '==', renamed));
  const snap = await getDocs(docsQ);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));

  await expect(pageB.getByRole('button', { name: renamed })).toHaveCount(0);
  await context.close();
});
