import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const pages = [
  "/",
  "/work",
  "/work/btc-vol-surface",
  "/notes",
  "/notes/realized-vs-implied-volatility",
  "/marginalia",
  "/videos",
  "/atlas",
  "/resume",
  "/about",
  "/now",
  "/contact",
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

test("reduced motion serves a static ambient atlas", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  // drift groups exist but no animation transform is applied under reduced motion
  await page.waitForTimeout(600);
  const transforms = await page.$$eval("[data-drift]", (els) =>
    els.map((el) => (el as SVGGElement).style.transform),
  );
  for (const t of transforms) expect(t).toBe("");
  await context.close();
});
