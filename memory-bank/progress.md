# Progress

## Status

- 2025-12-12: React RSC脆弱性対応として Next.js をパッチ更新し、ビルド/ユニットテストを通過。

## Known Issues / Follow-ups

- OSV-Scanner が `pnpm-lock.yaml` に対して `esbuild@0.21.5` の脆弱性（GHSA-67mh-4wv8-2f99）を1件報告。
  - package.json では overrides により esbuild を 0.25.0 に固定しているため、lockfile側で古い解決が残っていないか要調査。
