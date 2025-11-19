import js from "@eslint/js"
import pluginReact from "eslint-plugin-react"
import { defineConfig } from "eslint/config"
import globals from "globals"
import tseslint from "typescript-eslint"

export default defineConfig([
  {
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
  },
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json", "./packages/*/tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  pluginReact.configs.flat.recommended,
  {
    rules: {
      "@typescript-eslint/no-deprecated": "off",
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    ignores: ["**/*.d.ts", "**/dist/**", "packages/web/test/**"],
  },
  {
    settings: {
      react: {
        version: "detect",
      },
    },
  },
])
