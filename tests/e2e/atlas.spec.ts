import { test, expect } from "@playwright/test";

test.describe("signal atlas", () => {
  test("index fallback lists every node in the graph", async ({ page }) => {
    await page.goto("/atlas");
    const index = page.locator("#atlas-index");
    await expect(index).toBeVisible();
    // The index is the accessible surface: every node the graph plots has to
    // be listed there too, whatever the archive currently holds. Node labels
    // read "Note: Some Title", so the title is the part after the colon.
    const plotted = await page
      .locator('svg [role="link"]')
      .evaluateAll((els) =>
        els.map((e) =>
          e.getAttribute("aria-label")!.split(":").slice(1).join(":").trim(),
        ),
      );
    const listed = await index.getByRole("link").allInnerTexts();
    expect(plotted.length).toBeGreaterThan(0);
    for (const title of plotted) {
      const bare = title.replace(/,\s*\d{4}$/, "");
      expect(
        listed.some((text) => text.includes(bare)),
        `"${bare}" plotted but not listed in the index`,
      ).toBe(true);
    }
  });

  test("graph supports keyboard exploration and Enter opens content", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "graph hidden on mobile");
    await page.goto("/atlas");
    const canvas = page.getByRole("application");
    await expect(canvas).toBeVisible();
    // tab into the graph: first node gets focus
    const firstNode = canvas.getByRole("link").first();
    await firstNode.focus();
    await expect(firstNode).toBeFocused();
    await page.keyboard.press("ArrowRight");
    const focusedLabel = await page.evaluate(
      () => document.activeElement?.getAttribute("aria-label") ?? "",
    );
    expect(focusedLabel.length).toBeGreaterThan(0);
    // Enter opens non-topic nodes
    for (let i = 0; i < 12; i++) {
      const label = await page.evaluate(
        () => document.activeElement?.getAttribute("aria-label") ?? "",
      );
      if (!label.startsWith("Topic")) break;
      await page.keyboard.press("ArrowRight");
    }
    const before = page.url();
    await page.keyboard.press("Enter");
    await page.waitForURL((url) => url.toString() !== before);
    expect(page.url()).not.toBe(before);
  });

  test("view and domain state land in the URL", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "graph hidden on mobile");
    await page.goto("/atlas");
    await page.getByRole("button", { name: "Time" }).click();
    await expect(page).toHaveURL(/view=time/);
    await page
      .getByRole("group", { name: "Filter by domain" })
      .getByRole("button", { name: "Markets" })
      .click();
    await expect(page).toHaveURL(/domain=markets/);
    // deep link restores state
    await page.goto("/atlas?view=connections&domain=mathematics");
    await expect(page.getByRole("button", { name: "Connections" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("mobile gets the index representation, not a dense graph", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile only");
    await page.goto("/atlas");
    await expect(page.getByRole("application")).toBeHidden();
    await expect(page.locator("#atlas-index")).toBeVisible();
  });
});
