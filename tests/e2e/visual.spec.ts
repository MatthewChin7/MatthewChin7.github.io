import { test, expect, type Page } from "@playwright/test";

/**
 * Visual regression. Animations disabled by the toHaveScreenshot config;
 * the ambient atlas drift is frozen by reduced-motion emulation.
 */
test.use({ contextOptions: { reducedMotion: "reduce" } });

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

const shots: { name: string; path: string; theme?: "night" }[] = [
  { name: "home-day", path: "/" },
  { name: "home-night", path: "/", theme: "night" },
  { name: "work-index", path: "/work" },
  { name: "project-case-study", path: "/work/btc-vol-surface" },
  { name: "notes-index", path: "/notes" },
  { name: "article-math", path: "/notes/martingales-and-stopping-times" },
  { name: "problems-index", path: "/problems" },
  { name: "problem-detail", path: "/problems/expected-maximum-two-dice" },
  { name: "atlas", path: "/atlas" },
  { name: "resume", path: "/resume" },
  { name: "reading-index", path: "/reading" },
  {
    name: "book-review",
    path: "/reading/elements-of-statistical-learning",
  },
];

for (const shot of shots) {
  test(`visual: ${shot.name}`, async ({ page }, testInfo) => {
    if (shot.theme === "night" && testInfo.project.name === "mobile") test.skip();
    if (shot.theme) {
      await page.addInitScript((t) => localStorage.setItem("theme", t), shot.theme);
    }
    await page.goto(shot.path);
    await settle(page);
    await expect(page).toHaveScreenshot(`${shot.name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
    });
  });
}

test("visual: mobile menu", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile only");
  await page.goto("/");
  await settle(page);
  await page.getByRole("button", { name: "Index" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveScreenshot("mobile-menu.png");
});
