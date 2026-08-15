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

/** Pages that exist regardless of what has been published. */
const shots: { name: string; path: string; theme?: "night" }[] = [
  { name: "home-day", path: "/" },
  { name: "home-night", path: "/", theme: "night" },
  { name: "work-index", path: "/work" },
  { name: "notes-index", path: "/notes" },
  { name: "problems-index", path: "/problems" },
  { name: "atlas", path: "/atlas" },
  { name: "resume", path: "/resume" },
  { name: "reading-index", path: "/reading" },
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

/**
 * Detail templates, shot through whatever is currently first in the section
 * rather than a fixed slug. The template is what is under test, so the suite
 * should not go red because a post was retired — and a section with nothing
 * published has no template to photograph.
 */
const detailShots: { name: string; index: string; prefix: string }[] = [
  { name: "project-case-study", index: "/work", prefix: "/work/" },
  { name: "article-math", index: "/notes", prefix: "/notes/" },
  { name: "problem-detail", index: "/problems", prefix: "/problems/" },
  { name: "book-review", index: "/reading", prefix: "/reading/" },
];

for (const shot of detailShots) {
  test(`visual: ${shot.name}`, async ({ page }) => {
    await page.goto(shot.index);
    const first = page.locator(`a[href^="${shot.prefix}"]`).first();
    test.skip((await first.count()) === 0, `nothing published under ${shot.prefix}`);
    await first.click();
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
