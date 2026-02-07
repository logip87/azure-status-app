const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.APP_URL;
const EXPECTED_FILE = process.env.EXPECTED_FILE;

test.describe.configure({ retries: process.env.CI ? 2 : 0 });

async function waitForHealthy(request, url) {
  const deadlineMs = process.env.CI ? 120000 : 30000;
  const start = Date.now();

  while (Date.now() - start < deadlineMs) {
    try {
      const res = await request.get(url, { timeout: 15000 });
      if (res.ok()) return;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 5000));
  }

  throw new Error(`App not healthy within ${deadlineMs}ms: ${url}`);
}

test("status is online", async ({ page, request }) => {
  test.setTimeout(process.env.CI ? 150000 : 60000);

  await waitForHealthy(request, `${BASE_URL}/`);

  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await expect(page.getByText("System Status: Online")).toBeVisible({ timeout: 60000 });
});

test("files endpoint contains expected blob name", async ({ request }) => {
  const res = await request.get(`${BASE_URL}/files`, { timeout: 30000 });
  expect(res.ok()).toBeTruthy();

  const body = await res.json();
  if (EXPECTED_FILE) expect(body.files).toContain(EXPECTED_FILE);
  expect(Array.isArray(body.files)).toBeTruthy();
  expect(body.files).toContain(EXPECTED_FILE);
});
