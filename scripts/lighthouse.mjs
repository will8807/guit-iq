/**
 * Run Lighthouse programmatically and print the scores.
 * Usage: node scripts/lighthouse.mjs
 */
import { execFileSync } from "child_process";
import { readFileSync, unlinkSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const URL = "http://localhost:3000";
const OUT = "lighthouse-report.json";

const args = [
  URL,
  "--only-categories=performance,accessibility,best-practices",
  "--output=json",
  `--output-path=${OUT}`,
  "--form-factor=mobile",
  "--screenEmulation.mobile=true",
  "--screenEmulation.width=375",
  "--screenEmulation.height=812",
  "--screenEmulation.deviceScaleFactor=3",
  "--throttling-method=simulate",
  `--chrome-path=${CHROME}`,
  "--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage --disable-gpu",
];

console.log("Running Lighthouse against", URL, "...");

try {
  // Find the lighthouse CLI
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const lhBin = path.resolve(__dirname, "../node_modules/.bin/lighthouse");

  execFileSync("node", [lhBin, ...args], {
    stdio: "inherit",
    timeout: 120_000,
  });

  if (existsSync(OUT)) {
    const report = JSON.parse(readFileSync(OUT, "utf-8"));
    const cats = report.categories;
    const perf = Math.round(cats.performance?.score * 100);
    const a11y = Math.round(cats.accessibility?.score * 100);
    const bp = Math.round(cats["best-practices"]?.score * 100);

    console.log("\n=== Lighthouse Results ===");
    console.log(`Performance:     ${perf}`);
    console.log(`Accessibility:   ${a11y}`);
    console.log(`Best Practices:  ${bp}`);
    console.log("==========================");

    const PASS = 85;
    const failed = [];
    if (perf < PASS) failed.push(`Performance ${perf} < ${PASS}`);
    if (a11y < PASS) failed.push(`Accessibility ${a11y} < ${PASS}`);

    if (failed.length) {
      console.error("\n❌ FAILED:", failed.join(", "));
      process.exit(1);
    } else {
      console.log("\n✅ All scores ≥ 85 — M5.16 PASS");
    }
  }
} catch (err) {
  console.error("Lighthouse failed:", err.message);
  process.exit(1);
}
