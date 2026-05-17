import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs/promises';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page, request, baseURL }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error('E2E_TEST_EMAIL and E2E_TEST_PASSWORD are required');
  }

  const login = await request.post(`${baseURL}/api/auth/login`, {
    data: { email, password },
  });
  expect(login.ok()).toBeTruthy();

  await page.goto(`${baseURL}/`);
  await fs.mkdir('e2e/.auth', { recursive: true });
  await page.context().storageState({ path: authFile });
});
