import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": root } },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "dom", environment: "jsdom", setupFiles: ["./vitest.setup.ts"], include: ["components/**/*.test.{ts,tsx}", "app/**/*.dom.test.tsx"] },
      },
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["**/*.test.{ts,tsx}"],
          exclude: ["components/**", "app/**/*.dom.test.tsx", "node_modules/**", ".next/**"],
        },
      },
    ],
  },
});
