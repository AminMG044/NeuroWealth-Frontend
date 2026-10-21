import { expect, test } from "@playwright/test";
import { STORAGE_KEYS } from "../src/lib/storage-keys";
import { dictionaries } from "../src/lib/i18n/messages";

// Exercise the actual dashboard, providers and stream hook rather than copied markup.
for (const locale of ["en", "fr"] as const) {
  test(`realtime controls use ${locale} labels and retain start/stop/reset behavior`, async ({ page }, testInfo) => {
    await page.addInitScript(key => {
      window.localStorage.setItem(key, JSON.stringify({ completed: true, lastStep: 2, timestamp: Date.now() }));
    }, STORAGE_KEYS.ONBOARDING_STATE);
    await page.goto("/login");
    await page.getByRole("button", { name: /fill demo credentials/i }).click();
    await page.locator('[data-qa="login-submit-button"]').click();
    await page.waitForURL("**/dashboard");

    // Choose through the existing locale control while the dashboard stays mounted.
    await page.getByRole("combobox", { name: dictionaries.en.locale.switcherLabel }).selectOption(locale);
    const t = dictionaries[locale].dashboard.realtime;
    const region = page.getByRole("region", { name: t.simulatedStream, exact: true });
    const controls = region.getByRole("group", { name: t.controlsLabel, exact: true });
    const start = controls.getByRole("button", { name: t.startStreamLabel, exact: true });
    const stop = controls.getByRole("button", { name: t.stopStreamLabel, exact: true });
    const reset = controls.getByRole("button", { name: t.resetStreamLabel, exact: true });
    await expect(start).toHaveText(t.start);
    await expect(stop).toHaveText(t.stop);
    await expect(reset).toHaveText(t.reset);
    await expect(start).toBeEnabled();
    await expect(stop).toBeDisabled();
    await expect(region.locator('[aria-label*="{t."]')).toHaveCount(0);
    await expect(region.getByLabel(t.streamStatusLabel.replace("{{status}}", t.status.idle), { exact: true })).toBeVisible();

    await page.clock.install();
    await start.focus();
    await page.keyboard.press("Space");
    await expect(start).toBeDisabled();
    await expect(stop).toBeEnabled();
    await expect(region.getByLabel(t.streamStatusLabel.replace("{{status}}", t.status.live), { exact: true })).toBeVisible();
    await page.clock.fastForward(10_000);
    await expect(region.getByRole("list", { name: t.eventLog, exact: true })).toBeVisible();

    await stop.focus();
    await page.keyboard.press("Enter");
    await expect(start).toBeEnabled();
    await expect(stop).toBeDisabled();
    await expect(region.getByLabel(t.streamStatusLabel.replace("{{status}}", t.status.paused), { exact: true })).toBeVisible();
    await reset.click();
    await expect(region.getByText(t.noEvents, { exact: true })).toBeVisible();
    await expect(region.getByLabel(t.streamStatusLabel.replace("{{status}}", t.status.idle), { exact: true })).toBeVisible();
    await testInfo.attach(`realtime-controls-${locale}`, { body: await region.screenshot(), contentType: "image/png" });
  });
}
