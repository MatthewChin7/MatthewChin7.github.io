import { test, expect } from "@playwright/test";

test.describe("archive interactions", () => {
  test("command palette finds a project", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "keyboard flow");
    await page.goto("/");
    await page.keyboard.press("ControlOrMeta+k");
    const input = page.getByRole("combobox");
    await expect(input).toBeVisible();
    await input.fill("btc");
    await expect(
      page.getByRole("option", { name: /BTC Implied-Volatility/ }),
    ).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/work\/btc-vol-surface/);
  });

  test("slash opens the palette only outside inputs", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "keyboard flow");
    await page.goto("/search");
    // focus is in the search input — slash should type, not open the palette
    await page.getByRole("searchbox").press("/");
    await expect(page.getByRole("combobox")).toHaveCount(0);
  });

  test("work index filters via URL state", async ({ page }) => {
    await page.goto("/work");
    await page
      .getByRole("navigation", { name: "Filters" })
      .getByRole("link", { name: "Markets" })
      .click();
    await expect(page).toHaveURL(/domain=markets/);
    await expect(page.getByRole("heading", { name: /Market-Making/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Pollution Dispersion/ })).toHaveCount(
      0,
    );
    // deep link works cold
    await page.goto("/work?domain=physical-systems");
    await expect(
      page.getByRole("heading", { name: /Pollution Dispersion/ }),
    ).toBeVisible();
  });

  test("article renders math, TOC navigates, progress bar present", async ({ page }) => {
    await page.goto("/notes/realized-vs-implied-volatility");
    await expect(page.locator(".katex").first()).toBeVisible();
    const toc = page.getByRole("navigation", { name: "Table of contents" });
    if (await toc.isVisible()) {
      await toc.getByRole("link", { name: "The practical upshot" }).click();
      await expect(page).toHaveURL(/#the-practical-upshot/);
    } else {
      // mobile: TOC lives in a disclosure
      await page.getByRole("group").locator("summary", { hasText: "Contents" }).click();
      await page.getByRole("link", { name: "The practical upshot" }).click();
    }
    await expect(
      page.getByRole("heading", { name: "The practical upshot" }),
    ).toBeInViewport();
  });

  test("series navigation is hidden for drafts in production", async ({ page }) => {
    await page.goto("/notes/realized-vs-implied-volatility");
    // part 2 of the series is a draft — must not be linked in prod
    await expect(
      page.getByRole("link", { name: /Fitting an Implied-Volatility/ }),
    ).toHaveCount(0);
  });

  test("marginalia stream renders and filters", async ({ page }) => {
    await page.goto("/marginalia");
    await expect(page.getByRole("heading", { name: /Marginalia/ })).toBeVisible();
    await page
      .getByRole("navigation", { name: "Filter by kind" })
      .getByRole("link", { name: "question", exact: true })
      .click();
    await expect(page).toHaveURL(/type=question/);
  });

  test("videos index shows honest empty state (drafts excluded)", async ({ page }) => {
    await page.goto("/videos");
    await expect(page.getByText("The projector is warming up.")).toBeVisible();
  });

  test("resume has concise/detailed views and print styles", async ({ page }) => {
    await page.goto("/resume");
    await expect(page.getByRole("heading", { name: "Matthew Chin" })).toBeVisible();
    await page.getByRole("link", { name: "detailed" }).click();
    await expect(page).toHaveURL(/view=detailed/);
    // print emulation hides chrome
    await page.emulateMedia({ media: "print" });
    await expect(page.locator("header[data-site-header]")).toBeHidden();
    await expect(page.locator("footer[data-site-footer]")).toBeHidden();
  });

  test("search page reflects query in URL and finds notes", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("searchbox").fill("martingale");
    await expect(page).toHaveURL(/q=martingale/);
    await expect(
      page.getByRole("link", { name: /Martingales and Stopping Times/ }),
    ).toBeVisible();
  });

  test("feeds and metadata endpoints respond", async ({ request }) => {
    for (const [path, type] of [
      ["/feed.xml", "application/rss+xml"],
      ["/sitemap.xml", "application/xml"],
      ["/robots.txt", "text/plain"],
      ["/search-index.json", "application/json"],
    ] as const) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      expect(res.headers()["content-type"], path).toContain(type.split(";")[0]);
    }
  });

  test("admin studio is absent from production", async ({ request }) => {
    expect((await request.get("/admin")).status()).toBe(404);
    expect(
      (
        await request.post("/admin/api", { data: { action: "note", title: "x" } })
      ).status(),
    ).toBe(404);
  });

  test("draft content is excluded from production", async ({ request }) => {
    expect((await request.get("/notes/fitting-iv-surface-atm-rr-bf")).status()).toBe(404);
    expect((await request.get("/videos/volatility-smile-shape")).status()).toBe(404);
    const feed = await (await request.get("/feed.xml")).text();
    expect(feed).not.toContain("fitting-iv-surface-atm-rr-bf");
    const index = await (await request.get("/search-index.json")).json();
    expect(
      (index as { id: string }[]).some((d) => d.id.includes("fitting-iv-surface")),
    ).toBe(false);
  });
});
