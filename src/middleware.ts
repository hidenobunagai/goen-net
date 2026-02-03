import { getToken } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";

const secret = process.env.NEXTAUTH_SECRET;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 認証が不要なパス（公開パス）
  const publicPaths = [
    "/signin",
    "/api/auth",
    "/_next",
    "/static",
    "/favicon.ico",
    "/manifest.json",
    "/robots.txt",
  ];

  // 公開パスはスキップ
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 静的ファイルはスキップ
  if (pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|otf|eot)$/)) {
    return NextResponse.next();
  }

  try {
    // JWTトークンを検証
    const token = await getToken({
      req: request,
      secret,
      secureCookie: process.env.NODE_ENV === "production",
    });

    // 未認証の場合はサインインページへリダイレクト
    if (!token) {
      logger.warn("Unauthorized access attempt", { pathname });
      const signInUrl = new URL("/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
  } catch (error) {
    logger.error("Middleware authentication error", { error, pathname });
    return NextResponse.redirect(new URL("/signin", request.url));
  }
}

export const config = {
  matcher: [
    // 保護対象パス
    "/",
    "/updates/:path*",
    "/worksheets/:path*",
    "/prioritization/:path*",
    "/documentation/:path*",
    // API Routesは除外（個別に認証処理）
    // "/api/:path*",
  ],
};
