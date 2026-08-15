import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const pages = [
  "/",
  "/work",
  "/work/btc-vol-surface",
  "/notes",
  "/notes/realized-vs-implied-volatility",
  "/marginalia",
  "/problems",
  "/problems/expected-maximum-two-dice",
  "/videos",
  "/atlas",
  "/resume",
  "/now",
  "/contact",
  "/reading",
  "/reading/elements-of-statistical-learning",
  "/search",
];

for (const path of pages) {
  test(`axe: ${path} has no serious violations`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "run once on desktop");
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const serious = results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    );
    expect(
      serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`),
    ).toEqual([]);
  });
}

test("skip link jumps to main content", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "keyboard flow");
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main/);
});

test("reduced motion keeps book covers static", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/reading");
  const cover = page.locator("[data-book-cover]").first();
  await cover.hover();
  await expect(cover).toHaveCSS("transform", "none");
  await context.close();
});
