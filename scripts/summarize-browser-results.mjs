import { readFileSync, writeFileSync } from "node:fs";
const report = JSON.parse(readFileSync("test-results/e2e-results.json", "utf8"));
const tests = [];
function collect(suites) {
  for (const suite of suites) {
    for (const spec of suite.specs || [])
      tests.push({
        title: spec.title,
        passed: spec.ok,
        results: spec.tests.flatMap((test) =>
          test.results.map((result) => ({ status: result.status, durationMs: result.duration })),
        ),
      });
    collect(suite.suites || []);
  }
}
collect(report.suites || []);
const output = { runner: "Playwright Chromium", stats: report.stats, tests };
const path =
  tests.length === 10 ? "docs/browser-test-results.json" : "docs/browser-focused-results.json";
writeFileSync(path, JSON.stringify(output, null, 2) + "\n");
console.log(`Saved sanitized ${tests.length}-test results to ${path}.`);
