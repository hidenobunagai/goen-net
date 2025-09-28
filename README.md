## Goen Net Next.js 移行プロジェクト

Vite + React ベースで構築されていた Goen Net を、Next.js（App Router）＋ NextAuth（Google 認証）＋ Turso（LibSQL）へ段階的に移行するための新しいコードベースです。

現段階では以下を実装済みです。

- **Next.js 15 App Router 構成** - `src/app/` ベースのルーティング。
- **NextAuth (Google)** - `src/app/api/auth/[...nextauth]/route.ts` と `src/app/signin/page.tsx` による認証フロー。
- **Turso クライアントユーティリティ** - `src/lib/turso.ts` からサーバー用クライアントを取得。
- **保護されたトップページのサンプル** - `src/app/page.tsx` がサーバーサイドでセッションを検証し、認証済みユーザーだけに情報を表示。

## セットアップ手順

1. 依存関係をインストールします。

   ```bash
   npm install
   ```

2. `.env.example` を `.env.local` にコピーし、値を設定します。

   ```bash
   cp .env.example .env.local
   ```

   必須項目:

   - **NEXTAUTH_URL**: 開発時は `http://localhost:3000`
   - **NEXTAUTH_SECRET**: 任意のランダム文字列（`openssl rand -base64 32` などで生成）
   - **GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET**: Google Cloud Console で OAuth クライアントを作成して取得
   - **TURSO_DB_URL / TURSO_DB_AUTH_TOKEN**: 既存 Turso プロジェクトの値を流用

3. 開発サーバーを起動します。

   ```bash
   npm run dev
   ```

   `http://localhost:3000` にアクセスすると、未認証時は `/signin` へリダイレクトされ、Google サインイン後にトップページへ戻ります。

## ディレクトリ構成（抜粋）

- `src/app/layout.tsx` — アプリ全体のレイアウト。`NextAuthSessionProvider` をラップしています。
- `src/app/page.tsx` — 認証ガード付きのトップページ例。
- `src/app/signin/page.tsx` — Google サインインボタンを提供するクライアントコンポーネント。
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth の API ルート。
- `src/lib/auth.ts` — `NextAuthOptions` の定義。
- `src/lib/turso.ts` — Turso クライアント取得ヘルパー。
- `src/components/session-provider.tsx` — `SessionProvider` ラッパー。
- `src/components/sign-out-button.tsx` — サインアウトボタン。

## 今後の移行タスク例

- **ルーティング移行**: 既存 SPA (`src/components/` 以下) の各ページを Next.js のルートへ置き換え。
- **API/サーバー処理の統合**: 既存 `server/` の Express API を Next.js Route Handlers, Server Actions, Edge Functions へ移行。
- **UI コンポーネント整理**: Vite プロジェクトのスタイル・アセットを `app/` ルーターに最適化した形で再配置。
- **Turso クエリ実装**: `src/lib/turso.ts` のユーティリティを用いてサーバーコンポーネントから DB にアクセスする実装を追加。

## デプロイについて

Vercel へのデプロイを想定しています。`NEXTAUTH_URL` を本番 URL に設定し、Turso の接続情報を環境変数として登録してください。Google OAuth のリダイレクト URI も同様に本番 URL に合わせて更新する必要があります。
