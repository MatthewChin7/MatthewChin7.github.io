import { test, expect } from "@playwright/test";

test.describe("primary navigation", () => {
  test("homepage renders the editable about layout", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Matthew Chin/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Matthew Chin");
    await expect(page.getByRole("heading", { name: "Currently" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Background" })).toBeVisible();
  });

  test("primary destinations are reachable", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "desktop nav only");
    await page.goto("/");
    for (const [label, heading] of [
      ["Blog", "Blog"],
      ["Musings", "Musings"],
      ["Portfolio", "Portfolio"],
      ["Problems", "Problems"],
      ["Reading", "Reading"],
      ["CV", "CV"],
    ] as const) {
      await page
        .getByRole("navigation", { name: "Primary" })
        .getByRole("link", { name: label })
        .click();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
    }
  });

  test("mobile archive menu opens, traps focus, closes with Escape", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile only");
    await page.goto("/");
    // open via keyboard so focus semantics are testable across engines
    // (Safari/WebKit does not focus buttons on tap by design)
    const trigger = page.getByRole("button", { name: "Index" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: /Musings/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    // focus returns to the trigger
    await expect(trigger).toBeFocused();
  });

  test("404 page shows the unindexed-coordinate design", async ({ page }) => {
    const res = await page.goto("/definitely-not-a-page");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("[404 / NOT IN THE ARCHIVE]")).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to the index" })).toBeVisible();
  });

  test("theme toggle switches modes and persists", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const initial = await html.getAttribute("data-theme");
    await page
      .getByRole("button", { name: /Switch to/ })
      .first()
      .click();
    const flipped = await html.getAttribute("data-theme");
    expect(flipped).not.toBe(initial);
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", flipped!);
  });

  test("internal links on the homepage resolve", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "run once");
    await page.goto("/");
    const hrefs = await page.$$eval("a[href^='/']", (as) =>
      [...new Set(as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!))].filter(
        (h) => !h.startsWith("/#") && !h.includes("#"),
      ),
    );
    expect(hrefs.length).toBeGreaterThan(10);
    for (const href of hrefs) {
      const res = await request.get(href);
      expect(res.status(), href).toBeLessThan(400);
    }
  });
});
