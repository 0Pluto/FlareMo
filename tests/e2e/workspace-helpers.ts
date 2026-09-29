import { expect, type Page } from "@playwright/test";

/**
 * Shared UI interactions for the workspace shell.
 *
 * The desktop timeline was unified under a persistent workspace layout: the
 * inline search box is gone and searching now goes through the ⌘K spotlight
 * dialog. These helpers keep every spec on the same interaction, so the next
 * time the shell changes there is one place to update instead of eight.
 */

/** The trigger button that opens the spotlight search dialog. */
export function searchTrigger(page: Page) {
  return page.getByRole("button", { name: /搜索记录|Search notes/i }).first();
}

/**
 * Fill the spotlight search box and apply the query to the timeline.
 *
 * Pressing Enter with a non-empty draft runs the "view in timeline" action,
 * which is exactly what the old inline input did on every keystroke: the
 * query lands in the workspace state and filters the visible memos.
 *
 * While a query is active the trigger renders as the query chip plus a clear
 * button instead of the "Search notes" button, so an active query is cleared
 * first. Without that, a second search in the same test could never find the
 * trigger.
 */
export async function searchTimeline(page: Page, query: string) {
  const clear = page.getByRole("button", {
    name: /清除搜索|Clear search/i,
  });
  if (await clear.count()) {
    await clear.first().click();
  }
  await searchTrigger(page).click();
  const dialog = page.locator('[role="dialog"]:visible').last();
  const input = dialog.getByPlaceholder(
    /搜索记录、任务、操作|Search notes, tasks, actions/i,
  );
  await expect(input).toBeVisible();
  await input.fill(query);
  await input.press("Enter");
  // The dialog closes on submit; the timeline behind it now carries the query.
  await expect(dialog).toHaveCount(0);
}

/** Clear the active search query through the trigger's inline clear button. */
export async function clearTimelineSearch(page: Page) {
  await page
    .getByRole("button", { name: /清除搜索|Clear search/i })
    .first()
    .click();
}

/**
 * The narrow-screen inline search. Below the `md` breakpoint the workspace
 * still renders a debounced input instead of the spotlight, which is where the
 * IME-composition and request-cancellation guards apply.
 */
export function mobileSearchInput(page: Page) {
  return page.getByRole("textbox", { name: /^搜索$|^Search$/i });
}

/**
 * Create a memory from the /memory page.
 *
 * The page used to open a modal with a textarea; it now grows an inline quick
 * composer. The composer defaults to the "Iron rule" tier, which locks the
 * memory on creation, so `tier` picks the starting state: "ironRule" keeps the
 * default, "preference" toggles down first so the memory is created unlocked.
 */
export async function createMemoryViaComposer(
  page: Page,
  content: string,
  tier: "ironRule" | "preference" = "ironRule",
) {
  const composer = page
    .getByPlaceholder(
      /给 AI 立一条规则或习惯|记下一条偏好或认知|Set a new rule or preference|Set a rule or habit|Note a preference or insight/i,
    )
    .first();
  await expect(composer).toBeVisible();
  if (tier === "preference") {
    await page
      .getByRole("button", { name: /^铁律$|^Iron rule$/i })
      .first()
      .click();
  }
  await composer.fill(content);
  await page
    .getByRole("button", { name: /^发送$|^Send$/i })
    .locator("visible=true")
    .first()
    .click();
}

/**
 * Open the spotlight and switch it into semantic mode, then return the dialog.
 *
 * The toggle only renders once the deployment reports a semantic-search budget
 * (`semanticEnabled`), and it stays disabled while the vector-usage query is
 * pending — clicking too early silently leaves the shell in keyword mode, so
 * the query would ride `/api/app/memos` instead of `/api/app/search/semantic`.
 * Waiting for the button to be enabled is therefore part of the contract, not
 * politeness.
 */
export async function openSemanticSearch(page: Page) {
  await searchTrigger(page).click();
  const dialog = page.locator('[role="dialog"]:visible').last();
  const toggle = dialog.getByRole("button", { name: /^语义$|^Semantic$/i });
  await expect(toggle).toBeEnabled();
  await toggle.click();
  // Selected styling proves semantic mode is on, not merely toggled.
  await expect(toggle).toHaveAttribute("data-variant", "secondary");
  return dialog;
}
