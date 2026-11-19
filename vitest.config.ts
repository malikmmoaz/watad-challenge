import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
    // Report only (`pnpm test:coverage`, run in CI): coverage of the pure procurement logic.
    // No thresholds, so it informs reviewers without gating a merge.
    coverage: {
      provider: "v8",
      include: ["src/lib/procurement/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.test-util.ts"],
      reporter: ["text", "json-summary"],
      reportsDirectory: "coverage",
    },
  },
});
