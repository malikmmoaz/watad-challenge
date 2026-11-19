// Turns coverage/coverage-summary.json (vitest json-summary) into a Markdown table for the CI job
// summary. Report only: always exits 0, and says so when there is no report.
import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";

const file = "coverage/coverage-summary.json";
if (!existsSync(file)) {
  console.log("Coverage: no report (the test step did not produce one).");
  process.exit(0);
}
const data = JSON.parse(readFileSync(file, "utf8"));
const pct = (m) => `${m.pct.toFixed(1)}%`;
const row = (name, s) => `| ${name} | ${pct(s.statements)} | ${pct(s.branches)} | ${pct(s.functions)} | ${pct(s.lines)} |`;
const lines = [
  "### Coverage: `src/lib/procurement` (report only)",
  "",
  "| File | Statements | Branches | Functions | Lines |",
  "|---|---:|---:|---:|---:|",
  row("**All files**", data.total),
  ...Object.entries(data)
    .filter(([k]) => k !== "total")
    .map(([k, s]) => row(`\`${relative(process.cwd(), k)}\``, s))
    .sort(),
];
console.log(lines.join("\n"));
