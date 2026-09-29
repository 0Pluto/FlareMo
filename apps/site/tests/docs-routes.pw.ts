import { expect, type Page, test } from "@playwright/test";

async function collectHydrationErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

function expectNoHydrationErrors(errors: string[]) {
  expect(
    errors.filter((message) =>
      /Minified React error #418|Hydration failed|hydration|did not match/i.test(
        message,
      ),
    ),
  ).toEqual([]);
}

async function waitForHydratedControls(page: Page) {
  const trigger = page.getByRole("button", {
    name: "切换主题 / Switch theme",
  });
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toBeHidden();
}

test("homepage can reach the static docs index", async ({ page }) => {
  const errors = await collectHydrationErrors(page);
  await page.goto("/");
  await expect(page.getByRole("main")).toHaveCount(1);
  await waitForHydratedControls(page);

  await page.getByRole("link", { name: "Docs", exact: true }).first().click();
  await expect(page).toHaveURL(/\/docs\/?$/);
  await expect(
    page.getByRole("heading", { name: "Documentation" }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toHaveCount(1);
  expectNoHydrationErrors(errors);
});

for (const route of [
  {
    path: "/docs/deploy",
    heading: "Deploying FlareMo",
    body: "FlareMo deploys to Cloudflare Workers.",
  },
  {
    path: "/zh/docs/deploy",
    heading: "部署 FlareMo",
    body: "FlareMo 部署到 Cloudflare Workers。",
  },
]) {
  test(`direct ${route.path} keeps the prerendered article during hydration`, async ({
    page,
  }) => {
    const errors = await collectHydrationErrors(page);
    await page.goto(route.path);

    await expect(page.locator("main h1").first()).toHaveText(route.heading);
    await expect(page.locator("main article").first()).toContainText(
      route.body,
    );
    await expect(page.getByRole("main")).toHaveCount(1);
    await waitForHydratedControls(page);
    expectNoHydrationErrors(errors);
  });
}
