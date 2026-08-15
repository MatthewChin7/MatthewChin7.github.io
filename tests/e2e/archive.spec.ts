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

  test("portfolio shows projects grouped by year, cards link through", async ({
    page,
  }) => {
    await page.goto("/work");
    await expect(
      page.getByRole("heading", { name: "Portfolio", level: 1 }),
    ).toBeVisible();
    // year subheaders present
    await expect(page.getByRole("heading", { name: /^20\d\d$/ }).first()).toBeVisible();
    // a project card is a link to its detail page
    const card = page
      .getByRole("link", { name: /Market-Making|Volatility|Dispersion/ })
      .first();
    await card.click();
    await expect(page).toHaveURL(/\/work\//);
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

  test("book cards open review pages with engagement controls", async ({ page }) => {
    await page.goto("/reading");
    await page
      .getByRole("link", {
        name: "Read the review of Options, Futures, and Other Derivatives",
      })
      .click();
    await expect(page).toHaveURL(/\/reading\/hull-options-futures-derivatives/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Options, Futures, and Other Derivatives",
      }),
    ).toBeVisible();
    await expect(page.locator("[data-engagement]")).toBeVisible();
  });

  test("likes and comments persist in the browser", async ({ page }) => {
    await page.goto("/reading/elements-of-statistical-learning");
    const engagement = page.locator("[data-engagement]");
    const like = engagement.getByRole("button", { name: "Like", exact: true });
    await like.click();
    await expect(engagement.getByText("1 like", { exact: true })).toBeVisible();

    await engagement.getByLabel("Name (optional)").fill("Test Reader");
    await engagement.getByLabel("Comment").fill("A useful review.");
    await engagement.getByRole("button", { name: "Post comment" }).click();
    await expect(engagement.getByText("A useful review.", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByText("A useful review.", { exact: true })).toBeVisible();
    await expect(page.getByText("1 like", { exact: true })).toBeVisible();
  });

  test("notes and work pages include the engagement panel", async ({ page }) => {
    for (const path of [
      "/notes/realized-vs-implied-volatility",
      "/work/btc-vol-surface",
    ]) {
      await page.goto(path);
      await expect(page.locator("[data-engagement]")).toBeVisible();
    }
  });

  test("series navigation is hidden for drafts in production", async ({ page }) => {
    await page.goto("/notes/realized-vs-implied-volatility");
    // part 2 of the series is a draft — must not be linked in prod
    await expect(
      page.getByRole("link", { name: /Fitting an Implied-Volatility/ }),
    ).toHaveCount(0);
  });

  test("musings stream renders and each block links to its permalink", async ({
    page,
  }) => {
    await page.goto("/marginalia");
    await expect(page.getByRole("heading", { name: /Musings/ })).toBeVisible();
    // year subheader present
    await expect(page.getByRole("heading", { name: /^20\d\d$/ }).first()).toBeVisible();
    // clicking an entry block navigates to its permalink
    await page.locator("ol li a").first().click();
    await expect(page).toHaveURL(/\/marginalia\//);
  });

  test("problems page renders math and reveals a solution", async ({ page }) => {
    await page.goto("/problems");
    await expect(page.getByRole("heading", { name: "Problems", level: 1 })).toBeVisible();
    // this problem's question itself contains math
    await page.getByRole("link", { name: /Sum of Cubes is a Square/ }).click();
    await expect(page).toHaveURL(/\/problems\/sum-of-cubes-is-a-square/);
    // KaTeX rendered the question
    await expect(page.locator(".katex").first()).toBeVisible();
    // solution is behind a disclosure — hidden until opened
    const details = page.locator("details");
    await expect(details.locator(".katex").first()).toBeHidden();
    await details.locator("summary").click();
    await expect(details.locator(".katex").first()).toBeVisible();
  });

  test("videos index shows honest empty state (drafts excluded)", async ({ page }) => {
    await page.goto("/videos");
    await expect(page.getByText("The projector is warming up.")).toBeVisible();
  });

  test("cv renders the uploaded PDF in a scrollable viewer", async ({ page }) => {
    await page.goto("/resume");
    await expect(page.getByRole("heading", { name: "CV", level: 1 })).toBeVisible();
    // embedded PDF viewer present, with a download affordance
    await expect(page.locator('object[type="application/pdf"]')).toBeVisible();
    await expect(page.getByRole("link", { name: /Download PDF/ })).toBeVisible();
    // print emulation hides site chrome
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
    // Every method on the authoring API, not just the one the UI happens to use.
    expect((await request.get("/admin/api?action=list")).status()).toBe(404);
    expect(
      (
        await request.post("/admin/api", { data: { action: "save", kind: "note" } })
      ).status(),
    ).toBe(404);
    expect((await request.delete("/admin/api?kind=note&slug=anything")).status()).toBe(
      404,
    );
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
