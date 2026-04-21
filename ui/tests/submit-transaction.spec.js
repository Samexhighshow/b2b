import { expect, test } from "@playwright/test";

test("submit transaction does not crash with undefined chain id", async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/");
  await expect(page.getByText("CassavaTrace")).toBeVisible();

  await page.getByLabel("Batch ID", { exact: false }).fill("20240002");
  await page.getByLabel("Quantity (kg)", { exact: false }).fill("2500");
  await page.getByLabel("Origin", { exact: false }).fill("Ibadan, Nigeria");

  await page.getByRole("button", { name: "Submit Transaction" }).click();

  await expect(
    page.getByText(
      /Connect MetaMask before submitting a transaction|Wallet session is not fully initialized|Wrong network|Deploy contract first/i,
    ),
  ).toBeVisible();

  expect(
    pageErrors.some((message) => message.includes("Cannot read properties of undefined (reading 'id')")),
  ).toBe(false);
  expect(
    consoleErrors.some((message) => message.includes("Cannot read properties of undefined (reading 'id')")),
  ).toBe(false);
});
