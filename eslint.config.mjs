import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
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
    rules: {
      // console.log等のコンソールメソッド使用を警告
      "no-console": ["warn", {
        allow: ["warn", "error"] // warn と error は許可（エラーハンドリングで使用）
      }],
    },
  },
];

export default eslintConfig;
