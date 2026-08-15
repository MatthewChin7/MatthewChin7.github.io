import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    /**
     * The admin store tests write real fixtures into `content/` (that is what
     * the studio does), and the loader/search tests read the same tree, so
     * test files must not run against it concurrently.
     */
    fileParallelism: false,
  },
});
