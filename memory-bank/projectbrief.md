# Project Brief

## 概要

Goen Net は、7〜10人規模のメンタリング/ピアグループが定期的に集まり、近況共有・優先度付け・役割別ワークシートを通じて相互支援するためのWebアプリ。

## 主要機能

- Updates board（近況投稿・優先度フラグ・最新アクティビティ表示）
- Prioritization workflow（ドラッグ&ドロップ）
- Meeting worksheets（Moderator/Presenter/Observer/Coach）
- 認証（Google Sign-in via NextAuth）
- 永続化（Turso/LibSQL。必要に応じてメモリ退避）

## 重要な制約

- Next.js App Router + React（RSC/Server Actions を含む）
- 秘密情報は環境変数で管理（.env.local）
- 依存更新時は lockfile を含めて安全性確認（OSV-Scanner など）
