const { test, expect } = require("@playwright/test");

const BASE_URL =
  (process.env.APP_URL && process.env.APP_URL.trim()) || "https://statusapp56040.azurewebsites.net";

const EXPECTED_FILE = (process.env.EXPECTED_FILE && process.env.EXPECTED_FILE.trim()) || null;

test.describe.configure({ retries: process.env.CI ? 2 : 0 });

async function waitForHealthy(request) {
  const deadlineMs = process.env.CI ? 120000 : 30000;
  const start = Date.now();

  while (Date.now() - start < deadlineMs) {
    try {
      // zdrowie sprawdzamy na /status (najpewniejsze)
      const res = await request.get(`${BASE_URL}/status`, { timeout: 15000 });
      if (res.ok()) {
        const body = await res.json();
        if (body && body.status === "Online") return;
      }
    } catch (_) {}

    await new Promise((r) => setTimeout(r, 5000));
  }

  throw new Error(`App not healthy within ${deadlineMs}ms: ${BASE_URL}/status`);
}

test("status is online (UI)", async ({ page, request }) => {
  test.setTimeout(process.env.CI ? 150000 : 60000);

  await waitForHealthy(request);

  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Nowe UI: "System Status:" + span#status = Online
  await expect(page.getByText("System Status:")).toBeVisible({ timeout: 60000 });
  await expect(page.locator("#status")).toHaveText("Online", { timeout: 60000 });
});

test("files endpoint returns array and optionally contains expected blob", async ({ request }) => {
  await waitForHealthy(request);

  const res = await request.get(`${BASE_URL}/files`, { timeout: 30000 });
  expect(res.ok()).toBeTruthy();

  const body = await res.json();
  expect(body).toHaveProperty("files");
  expect(Array.isArray(body.files)).toBeTruthy();

  if (EXPECTED_FILE) {
    expect(body.files).toContain(EXPECTED_FILE);
  }
});
