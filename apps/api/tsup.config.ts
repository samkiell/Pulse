import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["cjs"],
  target: "node22",
  sourcemap: true,
  clean: true,
  noExternal: ["@pulse/db"],
  external: ["@prisma/client"],
});
