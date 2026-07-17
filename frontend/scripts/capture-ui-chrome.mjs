import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const APP_URL = process.env.REVIEW_APP_URL ?? "http://127.0.0.1:5173/";
const CDP_URL = process.env.CHROME_CDP_URL ?? "http://127.0.0.1:9222";
const OUT_DIR = process.env.REVIEW_OUT_DIR ?? path.resolve("review-screenshots");

const targets = [
  { key: "home", title: null, file: "01-world-home.png" },
  { key: "chapters", title: "Open Chapters and prepared scenes", file: "02-chapters.png" },
  { key: "board", title: "Open Board and Moodboard", file: "03-board.png" },
  { key: "wiki", title: "Open the Wiki entity workspace", file: "04-entity-editor.png" },
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP_URL);
  } catch (error) {
    console.error(`Cannot connect to Chrome at ${CDP_URL}.`);
    console.error("Start Chrome outside Codex first, for example:");
    console.error('  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir=/tmp/codex-builder-chrome http://127.0.0.1:5173/');
    console.error("");
    console.error(String(error?.message ?? error));
    process.exit(1);
  }

  const context = browser.contexts()[0] ?? await browser.newContext();
  const page = context.pages()[0] ?? await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 980 });
  await page.goto(APP_URL, { waitUntil: "networkidle" });

  const results = [];
  for (const target of targets) {
    if (target.title) {
      const button = page.locator(`[title="${target.title}"]`).first();
      if (await button.count()) {
        await button.click();
        await page.waitForTimeout(600);
      } else {
        results.push({ key: target.key, captured: false, reason: `Missing control: ${target.title}` });
        continue;
      }
    }
    const filePath = path.join(OUT_DIR, target.file);
    await page.screenshot({ path: filePath, fullPage: true });
    results.push({ key: target.key, captured: true, file: filePath });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(APP_URL, { waitUntil: "networkidle" });
  const mobileFile = path.join(OUT_DIR, "05-mobile-home.png");
  await page.screenshot({ path: mobileFile, fullPage: true });
  results.push({ key: "mobile-home", captured: true, file: mobileFile });

  await browser.close();
  console.log(JSON.stringify({ appUrl: APP_URL, cdpUrl: CDP_URL, outDir: OUT_DIR, results, errors }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
