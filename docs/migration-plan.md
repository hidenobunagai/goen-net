# Turso / API 移行メモ

## ゴール
- **ルーティング移行**: 既存 SPA (`src/components/` 以下) の各ページを Next.js のルートへ置き換え。
- **API/サーバー処理の統合**: 既存 `server/` の Express API を Next.js Route Handlers, Server Actions, Edge Functions へ移行。`/api/next-session` を皮切りに `/api/updates` へ展開。
- **UI コンポーネント整理**: Vite プロジェクトのスタイル・アセットを `app/` ルーターに最適化した形で再配置。
- **Turso クエリ実装**: `src/lib/turso.ts` のユーティリティを用いてサーバーコンポーネントから DB にアクセスする実装を追加。

## 現状整理
- **認証系**: `POST /api/auth/google/signin`, `GET /api/auth/me`, `POST /api/auth/signout`
  - NextAuth 導入済みのため、`/api/auth/[...nextauth]` が置き換え先。旧エンドポイントは段階的に廃止可能。
- **セッション情報**: `GET/POST /api/next-session`
  - 「次回セッション」カードで使用。`next_session` テーブルを操作。
- **Updates 機能**: `GET /api/updates`, `POST /api/updates`, `DELETE /api/updates/:id`, `DELETE /api/updates`
  - 一部 既存のフェッチロジック（`fetchUpdateItems` など）を Turso ベースの Route Handler に再実装し、`updates` テーブルを更新。
- **その他**: メールリマインダー関連 (`/api/internal/session-reminder` など) や `Resend` 送信、Cron Webhook など。

## Next.js 側で実装する Route Handler 案
- `src/app/api/next-session/route.ts`
  - `GET`: 現状の `loadNextSession` のレスポンス形に合わせる。
  - `POST`: 認証済み（`requireUserSession()`） + バリデーション後に更新。
- `src/app/api/updates/route.ts`
  - `GET`: `limit/offset` をクエリで受け、`updates` テーブルを取得。Viewer 情報はセッションから取得。
  - `POST`: 作成処理と Rate Limit を `@vercel/edge-config` 等で行うか、当面はミドルウェアで制御。
  - `DELETE`: 全件削除（管理者のみ許可）。
- `src/app/api/updates/[id]/route.ts`
  - `DELETE`: 個別削除。投稿者本人のみ許可。

## Turso クエリ設計
- `@/lib/turso` に以下を追加予定。
  - `getNextSession()`, `updateNextSession()`
  - `getUpdates({ viewerId })`, `createUpdate(...)`, `deleteUpdate(...)`
- 各関数は `execute({ sql, args })` を使い、型の戻り値を `zod` などで整形する方針を検討。

## クライアント側の移行ステップ
- **NextAuth (Google)** - `src/app/api/auth/[...nextauth]/route.ts` と `src/app/signin/page.tsx` による認証フロー。
- **Turso クライアントユーティリティ** - `src/lib/turso.ts` からサーバー用クライアントを取得。
- **保護されたトップページのサンプル** - `src/app/page.tsx` がサーバーサイドでセッションを検証し、認証済みユーザーだけに情報を表示。
- **次回セッション API** - `src/app/api/next-session/route.ts` で Next Session の取得・更新が可能。
- **Updates API・UI 下書き** - `src/app/api/updates/route.ts` と `src/app/(protected)/updates/page.tsx` を骨組み実装。サーバー側で Turso から一覧表示し、`updates/_components/` 配下にクライアント雛形（サマリー等）を配置済み。
  - `getUpdates({ viewerId })`, `createUpdate(...)`, `deleteUpdate(...)`
  - 各関数は `execute({ sql, args })` を使い、型の戻り値を `zod` などで整形する方針を検討。
  - `src/components/Updates.tsx` を分解し、`next/src/app/(protected)/updates/_components/` 配下にクライアントコンポーネントとして再構築。
  - 例: `updates-table.tsx`, `update-form.tsx`, `update-details-dialog.tsx` など。
- 削除操作などは `useTransition` と通信ステータス表示で UX を最適化。
- `updates-list.tsx` などの雛形コンポーネントに対して、今後フォームや補助アクションを組み込む。

### 簡易テスト手順
- `npm run dev` で Next.js サーバーを起動し、ブラウザで `http://localhost:3000/updates` を開く。
- `Add Update` ダイアログから投稿を作成し、保存後に一覧と `Network` タブで `/api/updates` の 201 応答を確認する。
- 投稿カードの `...` メニュー（今後実装予定）が完成したら `/api/updates/{id}` の `DELETE` を追加テストする。
- `npm run test:updates` で Vitest ベースの Route Handler テストを実行。Vitest 設定は `vitest.config.ts` にあり、`jsdom` + `alias:@=./src` の構成。
- Playwright の E2E 雛形は `tests/e2e/updates.spec.ts`。以下の環境変数を `.env.local` などに設定すると実行可能。
  - `PLAYWRIGHT_BASE_URL` (省略時 `http://localhost:3000`)
  - `PLAYWRIGHT_TEST_EMAIL`
  - `PLAYWRIGHT_TEST_PASSWORD`
  - 認証済みアカウントを用意し、Playwright の `sign in` 手順に沿って動作確認する。
  - サーバーは別プロセスで先に `npm run dev` 等を実行しておく。
  - `.env.local.example` にテンプレートを書いて、開発者が値をコピーしやすくする。

## Next.js 版への移行計画 (優先度ボードなど)

- **Prioritization ページ** (`src/components/Prioritization.tsx`)
  - UI ライブラリ: MUI + dnd-kit を Next 版でも採用。`@mui/material`, `@dnd-kit/*` 依存は `package.json` に追加済み。
  - 保存先: `src/app/(protected)/prioritization/page.tsx` を新設し、MUI コンポーネントを使用してほぼ同等の UX を再現。
  - ボード状態: localStorage 管理 (`STORAGE_KEY`) を Next 版でも踏襲し、`useEffect` による復元と `saveBoardToStorage()` を移植。
  - 優先順位付け: `arrayMove()` や `findColumnIdByItem()` などドラッグ処理ロジックをそのまま移植し、`UpdateItem` 型の差分には注意。
  - API 連携: 当面はモック (`fetchUpdateItems()`) から始め、`/api/updates` Route Handler に置き換え。優先ボード専用 API が必要なら別途設計。
  - アクセシビリティ: キーボード操作 (`KeyboardSensor`) やツールチップなど、Vite 版の配慮を再現する。

- **その他画面**
  - `src/components/Worksheets/*` や `Documentation` 系コンポーネントも Next の App Router に再配置し、共通レイアウト (`Navbar` 等) を共有。
  - 画面ごとのルート構成 (`/worksheets/*`, `/documentation/*`) を App Router で再設計しつつ、既存の `AuthContext` との整合を確認。

- **タスク整理の目安**
  - 新しいページごとに `Plan` → `UI コンポーネント移植` → `API/データ取得` → `テスト` の順で進める。
  - 重要な状態管理（スケジュール、ローカルストレージなど）は先にまとめてユーティリティ化しておくと移植が楽になる。

## 未決事項 / TODO
- Rate limit の代替（`express-rate-limit` をどう置き換えるか）。
- Resend を Next.js の Route Handler から呼び出す際の環境変数管理（Edge Runtime で動作させるか Node Runtime に限定するか）。
- `next_session` テーブルのマイグレーション手順共有（Prisma or raw SQL）。

---
更新日: 2025-09-28
