import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    coverage: {
      reportsDirectory: "__test__/unit/coverage",
    },
    environment: "jsdom",
    include: ["__test__/unit/**/*.{test,spec}.{ts,tsx}"],
    reporters: [
      "default",
      [
        "junit",
        {
          outputFile: "__test__/unit/reports/junit.xml",
        },
      ],
    ],
  },
})
