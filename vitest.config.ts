import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "json", "html"],
      include: ["convex/**/*.ts", "app/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/node_modules/**",
        "**/_generated/**",
        "**/build/**",
        "**/tests/**",
        "**/*.types.ts",
        "**/runtime.ts",
      ],
    },
  },
  resolve: {
    alias: {
      convex: path.resolve(__dirname, "./convex"),
      app: path.resolve(__dirname, "./app"),
      types: path.resolve(__dirname, "./app/types"),
    },
  },
});
