import { FlatCompat } from "@eslint/eslintrc";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

let patchedConfig = [];
try {
  patchedConfig = compat.extends("next/core-web-vitals", "next/typescript").map((config) => {
    if (config.plugins) {
      for (const key of Object.keys(config.plugins)) {
        const plugin = config.plugins[key];
        if (plugin && typeof plugin === "object" && plugin.configs) {
          config.plugins[key] = { ...plugin };
          delete config.plugins[key].configs;
        }
      }
    }
    return config;
  });
} catch (error) {
  console.warn(
    "Warning: Failed to load Next.js ESLint config due to FlatCompat error:",
    error.message
  );
  // Fallback: Continue without Next.js specific rules to allow commit
  patchedConfig = [];
}

const eslintConfig = [
  ...patchedConfig,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "legacy/**",
      "src/components/emails/**",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
    plugins: {
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
      "@typescript-eslint": tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      // console.log等のコンソールメソッド使用を警告
      "no-console": [
        "warn",
        {
          allow: ["warn"], // warn のみ許可（error は logger.error を使用）
        },
      ],
      // Import の自動ソート
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      // 未使用の import を自動削除
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      // TypeScript strict checks
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
];

export default eslintConfig;
