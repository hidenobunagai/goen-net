# System Patterns

- Next.js App Router を中心にページ/ルートハンドラを構成（src/app）
- 認証は NextAuth（API route: src/app/api/auth/[...nextauth]/route.ts）
- 認証必須領域は (protected) ルートグループ配下
- Server Actions（"use server"）を用いてサーバ側処理を実装
- DB は Turso/LibSQL（src/lib/turso.ts 等）
- 設定/環境変数は Zod でバリデーション（src/lib/config.ts）
