# 2025-12-12 React RSC Security Update

## Status

- Completed
- Overall Status: 100%

## Plan

1. React公式ブログの指示に従い、Next.js 16.0.x を 16.0.10 へ更新
2. lockfile更新を含め、ビルド/テストで回帰がないことを確認
3. 依存更新前に OSV-Scanner を実行し、結果を保管

## Progress Log

- 2025-12-12
  - React公式ブログ（Critical Security Vulnerability in React Server Components）を確認
  - `next` を `^16.0.10` へ更新し、`pnpm-lock.yaml` の解決版も更新
  - `pnpm test:updates` パス
  - `pnpm build` パス
  - `reports/osv.sarif` を生成（GHSA-67mh-4wv8-2f99: esbuild@0.21.5 を検出）

## Notes

- アプリは App Router かつ Server Actions を利用しているため、本脆弱性の影響可能性が高い前提で対応。
- ホスティング側の暫定緩和策に依存せず、アップデート/再デプロイを優先する。
