import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // El backend usa CommonJS en la configuración de sequelize-cli y de jest.
  {
    files: ["backend/**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // Los parámetros que empiezan con "_" son intencionalmente no usados
  // (por ejemplo `_next` en el manejador de errores de Express).
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
