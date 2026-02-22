export { auth as middleware } from "@/../auth";

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
