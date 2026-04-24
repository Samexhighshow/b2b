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

  await page.goto("http://localhost:5173/");
  await expect(page.getByText("CassavaTrace")).toBeVisible();

  const createBatchForm = page.getByRole("heading", { name: "Log New Batch" }).locator("..");

  await createBatchForm.getByLabel("Batch ID").fill("20240002");
  await createBatchForm.getByLabel("Quantity (kg)").fill("2500");
  await createBatchForm.getByLabel("Origin").fill("Ibadan, Nigeria");

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
