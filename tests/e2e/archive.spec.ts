import { test, expect, type Page } from "@playwright/test";

/**
 * These flows test templates and behaviour, not particular posts. Each one
 * therefore finds its subject through the section index and skips when that
 * section has nothing published — so retiring a post never turns the suite
 * red, and publishing one puts the coverage back.
 */
async function firstIn(page: Page, index: string, prefix: string) {
  await page.goto(index);
  const link = page.locator(`a[href^="${prefix}"]`).first();
  return { link, count: await link.count() };
}

test.describe("archive interactions", () => {
  test("command palette finds content and opens it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "keyboard flow");
    const { link, count } = await firstIn(page, "/notes", "/notes/");
    test.skip(count === 0, "nothing published under /notes");
    const href = await link.getAttribute("href");
    const title = (await link.innerText()).split("\n")[0]!.trim();

    await page.goto("/");
    await page.keyboard.press("ControlOrMeta+k");
    const input = page.getByRole("combobox");
    await expect(input).toBeVisible();
    await input.fill(title.split(/\s+/).slice(0, 3).join(" "));
    await expect(
      page.getByRole("option", { name: new RegExp(escapeRe(title)) }),
    ).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(escapeRe(href!)));
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
    const { link, count } = await firstIn(page, "/work", "/work/");
    await expect(
      page.getByRole("heading", { name: "Portfolio", level: 1 }),
    ).toBeVisible();
    test.skip(count === 0, "nothing published under /work");
    // year subheaders present
    await expect(page.getByRole("heading", { name: /^20\d\d$/ }).first()).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/work\//);
  });

  test("article renders math and the TOC covers its sections", async ({ page }) => {
    const { link, count } = await firstIn(page, "/notes", "/notes/");
    test.skip(count === 0, "nothing published under /notes");
    await page.goto((await link.getAttribute("href"))!);
    await expect(page.locator(".katex").first()).toBeVisible();
    // Maths grows as KaTeX's webfonts arrive and everything below it moves
    // down, so settle the layout before measuring positions.
    await page.evaluate(() => document.fonts.ready);

    // Desktop shows the TOC as a sticky sidebar; mobile folds the same list
    // into a <details>. Either way the links are looked up inside it.
    let toc = page.getByRole("navigation", { name: "Table of contents" });
    const sidebar = await toc.isVisible();
    if (!sidebar) {
      toc = page.locator("details").filter({ hasText: "Contents" }).first();
      await toc.locator("summary").click();
    }

    // Every entry has to point at a section that is actually on the page —
    // a table of contents that lists headings which do not exist is the
    // failure worth catching, and it is the same contract in both layouts.
    const targets = await toc
      .getByRole("link")
      .evaluateAll((els) =>
        els.map((e) => (e as HTMLAnchorElement).getAttribute("href")!),
      );
    expect(targets.length).toBeGreaterThan(0);
    for (const href of targets) {
      await expect(page.locator(href), href).toBeAttached();
    }

    // Following an entry is asserted on the desktop rail only. WebKit does
    // not act on an anchor clicked from inside a <details> that was opened on
    // a freshly loaded page — no hash, no scroll — so asserting it on mobile
    // would be testing the browser, not the site.
    test.skip(!sidebar, "anchor-from-details navigation is a WebKit difference");
    await toc.getByRole("link").first().click();
    await expect(page).toHaveURL(new RegExp(escapeRe(targets[0]!)));
    await expect(page.locator(targets[0]!)).toBeInViewport({ timeout: 10_000 });
  });

  test("book cards open review pages with engagement controls", async ({ page }) => {
    const { link, count } = await firstIn(page, "/reading", "/reading/");
    test.skip(count === 0, "nothing published under /reading");
    await link.click();
    await expect(page).toHaveURL(/\/reading\/[a-z0-9-]+/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("[data-engagement]")).toBeVisible();
  });

  test("likes and comments persist in the browser", async ({ page }) => {
    const { link, count } = await firstIn(page, "/notes", "/notes/");
    test.skip(count === 0, "nothing published under /notes");
    await link.click();
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
    let checked = 0;
    for (const [index, prefix] of [
      ["/notes", "/notes/"],
      ["/work", "/work/"],
    ] as const) {
      const { link, count } = await firstIn(page, index, prefix);
      if (count === 0) continue;
      await link.click();
      await expect(page.locator("[data-engagement]")).toBeVisible();
      checked++;
    }
    test.skip(checked === 0, "no notes or projects published");
  });

  test("series navigation never links to something unpublished", async ({
    page,
    request,
  }) => {
    const { link, count } = await firstIn(page, "/notes", "/notes/");
    test.skip(count === 0, "nothing published under /notes");
    await link.click();
    const series = page.getByRole("navigation", { name: /series/i });
    test.skip((await series.count()) === 0, "no note is part of a series");
    // Every part the navigation offers must actually exist in production.
    for (const href of await series
      .getByRole("link")
      .evaluateAll((els) =>
        els.map((e) => (e as HTMLAnchorElement).getAttribute("href")!),
      )) {
      expect((await request.get(href)).status(), href).toBe(200);
    }
  });

  test("musings stream renders and each block links to its permalink", async ({
    page,
  }) => {
    await page.goto("/marginalia");
    await expect(page.getByRole("heading", { name: /Musings/ })).toBeVisible();
    const entry = page.locator('ol li a[href^="/marginalia/"]').first();
    test.skip((await entry.count()) === 0, "nothing published under /marginalia");
    // year subheader present
    await expect(page.getByRole("heading", { name: /^20\d\d$/ }).first()).toBeVisible();
    await entry.click();
    await expect(page).toHaveURL(/\/marginalia\//);
  });

  test("problems page renders math and reveals a solution", async ({ page }) => {
    const { link, count } = await firstIn(page, "/problems", "/problems/");
    await expect(page.getByRole("heading", { name: "Problems", level: 1 })).toBeVisible();
    test.skip(count === 0, "nothing published under /problems");
    await link.click();
    await expect(page).toHaveURL(/\/problems\/[a-z0-9-]+/);
    // The solution is behind a disclosure — its math is hidden until opened.
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
    // Embedded PDF viewer present, with a download affordance. WebKit only
    // reports the <object> visible once it has actually painted the PDF, which
    // under a full parallel run can take well past the default timeout.
    await expect(page.locator('object[type="application/pdf"]')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("link", { name: /Download PDF/ })).toBeVisible();
    // print emulation hides site chrome
    await page.emulateMedia({ media: "print" });
    await expect(page.locator("header[data-site-header]")).toBeHidden();
    await expect(page.locator("footer[data-site-footer]")).toBeHidden();
  });

  test("search page reflects query in URL and finds notes", async ({ page }) => {
    const { link, count } = await firstIn(page, "/notes", "/notes/");
    test.skip(count === 0, "nothing published under /notes");
    const title = (await link.innerText()).split("\n")[0]!.trim();
    const term = title.split(/\s+/)[0]!.toLowerCase();

    await page.goto("/search");
    await page.getByRole("searchbox").fill(term);
    await expect(page).toHaveURL(new RegExp(`q=${term}`, "i"));
    await expect(
      page.getByRole("link", { name: new RegExp(escapeRe(title)) }),
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

/** Titles carry regex metacharacters (parentheses, dashes); names do not. */
function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
