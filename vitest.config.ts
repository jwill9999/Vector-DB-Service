import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/e2e/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: [
        // Build artifacts and dependencies
        "**/node_modules/**",
        "**/dist/**",

        // Test files and test utilities
        "**/__tests__/**",
        "**/tests/**",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/testing/**",

        // Type definitions (no executable code)
        "**/types.ts",
        "**/*.d.ts",

        // Entry points and bootstrap code (covered by E2E tests)
        "**/index.ts",

        // Configuration files (simple data structures)
        "**/config.ts",

        // OpenAPI specs (static data)
        "**/openapi.ts",
      ],
    },
    globals: false,
    environment: "node",
  },
});
