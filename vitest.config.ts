import { defineConfig } from "vitest/config";

// Pin the timezone so date-based ICS output is deterministic across machines/CI.
process.env.TZ = "UTC";

export default defineConfig({
  test: {
    environment: "node",
  },
});
