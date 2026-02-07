const { test, expect } = require("@playwright/test");

test("status is online", async ({ page }) => {
  await page.goto("https://statusapp56040.azurewebsites.net");
  await expect(page.getByText("System Status: Online")).toBeVisible();
});

test("files endpoint contains expected blob name", async ({ request }) => {
  const baseUrl = "https://statusapp56040.azurewebsites.net";
  const expectedFile = "1770406392704-test.png";

  const res = await request.get(`${baseUrl}/files`);
  expect(res.ok()).toBeTruthy();

  const body = await res.json();
  expect(body).toHaveProperty("files");
  expect(Array.isArray(body.files)).toBeTruthy();
  expect(body.files).toContain(expectedFile);
});
