import coreWebVitals from "eslint-config-next/core-web-vitals";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import globals from "globals";

const eslintConfig = [
  ...coreWebVitals,
  {
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // New in eslint-config-next 16 (react-hooks v7 / React Compiler ruleset).
      // Flags the standard "read client-only state after mount to avoid SSR
      // hydration mismatch" pattern used throughout this app (auth/theme
      // state, URL params). That pattern is intentional here, not a bug —
      // downgraded to a warning rather than rewritten, to keep this
      // dependency-security upgrade from touching working, tested UI logic.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "coverage/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
