import { chromium } from "playwright";
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
const base =
  process.argv.find((a) => a.startsWith("--url="))?.slice(6) ||
  "http://localhost:3024/";
const browser = await chromium.launch({
  headless: true,
  ...(existsSync("/usr/bin/google-chrome")
    ? { executablePath: "/usr/bin/google-chrome" }
    : {}),
});
const context = await browser.newContext({
  locale: "it-IT",
  viewport: { width: 1440, height: 1100 },
});
const page = await context.newPage();
await page.clock.setFixedTime(new Date("2026-11-12T12:00:00Z"));
const errors = [];
const remote = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(r.url() + r.status());
});
page.on("request", (r) => {
  if (!r.url().startsWith(base) && !r.url().startsWith("blob:"))
    remote.push(r.url());
});
page.on("dialog", (d) => d.accept());
mkdirSync("docs/screenshots", { recursive: true });
try {
  await page.goto(base);
  await page.getByRole("heading", { name: "Choose how to begin" }).waitFor();
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  await page.getByRole("button", { name: "Try demo", exact: true }).click();
  await page.locator(".chart svg").first().waitFor();
  await page.screenshot({
    path: "docs/screenshots/dashboard.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByText("Enter a positive amount with at most two decimal places.", {
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("textbox", { name: "Amount", exact: true })
    .fill("24.50");
  await page.getByLabel("Description", { exact: true }).fill("Fixture lunch");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit Fixture lunch", exact: true })
    .click();
  await page.getByRole("textbox", { name: "Amount", exact: true }).fill("30");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByRole("button", { name: "Duplicate Fixture lunch", exact: true })
    .click();
  await page.getByRole("heading", { name: "Review duplicate" }).waitFor();
  await page
    .getByLabel("Description", { exact: true })
    .fill("Fixture duplicate");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete Fixture duplicate", exact: true })
    .click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit Fixture duplicate", exact: true })
    .waitFor();
  await page.getByRole("link", { name: "Transactions", exact: true }).click();
  if (await page.locator(".notice button").isVisible())
    await page.locator(".notice button").click();
  await page.screenshot({
    path: "docs/screenshots/transactions.png",
    fullPage: true,
  });
  await page
    .locator(".filter-fields label")
    .nth(4)
    .locator("input")
    .fill("zzzz");
  await page
    .getByText("No transactions in this selection.", { exact: true })
    .waitFor();
  assert.ok(!page.url().includes("zzzz"));
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  const csvDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  let csv = "";
  for await (const chunk of await (await csvDownload).createReadStream())
    csv += chunk;
  assert.match(csv, /amount_eur/);
  assert.match(csv, /Fixture lunch/);
  await page.getByRole("link", { name: "Budgets", exact: true }).click();
  await page.getByRole("textbox", { name: "Planned", exact: true }).fill("100");
  await page.getByRole("button", { name: "Set budget", exact: true }).click();
  assert.match(await page.locator(".budget-card").first().innerText(), /Over/);
  await page.screenshot({
    path: "docs/screenshots/budgets.png",
    fullPage: true,
  });
  await page.locator('input[type="month"]').fill("2026-12");
  await page
    .getByRole("button", { name: "Copy previous month", exact: true })
    .click();
  assert.match(await page.locator(".budget-card").first().innerText(), /100/);
  await page.locator('input[type="month"]').fill("2026-11");
  await page.getByRole("link", { name: "Insights", exact: true }).click();
  await page.locator(".chart svg").first().waitFor();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  const backupDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Backup JSON", exact: true }).click();
  let backup = "";
  for await (const chunk of await (await backupDownload).createReadStream())
    backup += chunk;
  assert.equal(JSON.parse(backup).version, 2);
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("it");
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("lang"), "it");
  await page
    .getByRole("combobox", { name: "Lingua", exact: true })
    .selectOption("en");
  await page
    .getByRole("button", { name: "Delete local data", exact: true })
    .click();
  await page.getByRole("button", { name: "Start empty", exact: true }).click();
  await page.getByRole("link", { name: "Transactions", exact: true }).click();
  await page
    .getByText("No transactions in this selection.", { exact: true })
    .waitFor();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("Restore JSON", { exact: true }).setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{"),
  });
  await page
    .locator(".notice")
    .filter({ hasText: "Invalid or incompatible backup. Nothing was changed." })
    .waitFor();
  await page.getByLabel("Restore JSON", { exact: true }).setInputFiles({
    name: "ledger.json",
    mimeType: "application/json",
    buffer: Buffer.from(backup),
  });
  await page.getByRole("heading", { name: "Preview restore" }).waitFor();
  await page
    .getByRole("button", { name: "Replace dataset", exact: true })
    .click();
  await page.getByRole("link", { name: "Transactions", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit Fixture lunch", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await page.locator(".voice summary").click();
  await page
    .getByRole("textbox", { name: "Optional text or voice input", exact: true })
    .fill("expense groceries 12.50 yesterday");
  await page
    .getByRole("button", { name: "Preview fields", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply to form", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("textbox", { name: "Amount", exact: true })
      .inputValue(),
    "12.50",
  );
  await page
    .getByRole("button", { name: "Cancel", exact: true })
    .first()
    .click();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "docs/screenshots/mobile.png",
    fullPage: true,
  });
  await page.keyboard.press("Tab");
  assert.ok(
    await page.evaluate(() => document.activeElement !== document.body),
  );
  await page.setViewportSize({ width: 820, height: 1180 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await page.evaluate(() => document.activeElement?.tagName),
    "H1",
  );
  await page.keyboard.press("Tab"); // cancel
  await page.keyboard.press("Tab"); // type
  await page.keyboard.press("Tab"); // amount
  assert.equal(
    await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label"),
    ),
    "Amount",
  );
  await page.keyboard.type("5.50");
  await page.getByRole("button", { name: "Save", exact: true }).focus();
  await page.keyboard.press("Enter");
  assert.deepEqual(errors, []);
  assert.deepEqual(remote, []);
  console.log(
    "PASS demo, CRUD/duplicate/undo, filters, CSV, budgets, insights, language, backup restore, empty start, typed phrase, mobile and keyboard; no errors or external requests",
  );
  const isolated = await browser.newContext();
  await isolated.addInitScript(() => {
    localStorage.setItem(
      "fs-bilancio-23",
      JSON.stringify([
        {
          id: "legacy-a",
          type: "Income",
          category: "Risparmi",
          amount: 20,
          date: "2020-11-13",
        },
      ]),
    );
    Object.defineProperty(window, "SpeechRecognition", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: undefined,
      configurable: true,
    });
  });
  const p = await isolated.newPage();
  await p.goto(base);
  await p
    .getByText(
      "Legacy categories require review and are excluded from all totals until confirmed.",
      { exact: true },
    )
    .waitFor();
  assert.ok(
    await p.evaluate(() => !!localStorage.getItem("ledger:original-legacy")),
  );
  await p.getByRole("button", { name: "Add transaction", exact: true }).click();
  await p.locator(".voice summary").click();
  await p
    .getByText("Speech not supported. Typed phrases still work.", {
      exact: true,
    })
    .waitFor();
  await isolated.close();
  console.log("PASS isolated legacy migration and unsupported speech");
  const mocked = await browser.newContext();
  await mocked.addInitScript(() => {
    window.SpeechRecognition = class {
      start() {
        setTimeout(() => this.onerror?.({ error: "not-allowed" }), 10);
      }
      stop() {
        this.onend?.();
      }
      abort() {}
    };
  });
  const voice = await mocked.newPage();
  await voice.goto(base);
  await voice.getByRole("button", { name: "Start empty", exact: true }).click();
  await voice
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await voice.locator(".voice summary").click();
  await voice
    .getByRole("button", { name: "Start listening", exact: true })
    .click();
  await voice
    .getByText("Microphone permission denied.", { exact: true })
    .waitFor();
  await mocked.close();
  const corrupt = await browser.newContext();
  await corrupt.addInitScript(() =>
    localStorage.setItem("ledger:v2", "corrupt-original"),
  );
  const recovery = await corrupt.newPage();
  await recovery.goto(base);
  assert.equal(
    await recovery.evaluate(() => localStorage.getItem("ledger:v2")),
    "corrupt-original",
  );
  await recovery
    .getByRole("button", { name: "Export original", exact: true })
    .waitFor();
  await corrupt.close();
  console.log(
    "PASS mocked speech permission error and corrupt-storage recovery (no real microphone test)",
  );
} finally {
  await browser.close();
}
