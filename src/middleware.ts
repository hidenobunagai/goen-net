import { withAuth } from "next-auth/middleware";

// auth.ts をここで import すると getConfig() がモジュール評価時に Edge Runtime で実行され
// 環境変数が読めずクラッシュするため、静的な pages 値を直接記述する
export default withAuth({
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
});

export const config = {
  matcher: [
    // 保護対象パス（認証が必要なパスのみ）
    "/",
    "/updates/:path*",
    "/worksheets/:path*",
    "/prioritization/:path*",
    "/documentation/:path*",
    // API Routesは除外（個別に認証処理）
    "/((?!api|_next/static|_next/image|favicon.ico|signin|manifest|robots).*)",
  ],
};
