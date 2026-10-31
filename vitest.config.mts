import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Pruebas unitarias del frontend (lógica y servicios). El backend tiene
// las suyas con Jest en backend/tests.
export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/*.test.tsx"],
  },
});
