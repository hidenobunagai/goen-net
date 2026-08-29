import type { AuthOptions } from "next-auth";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { getConfig } from "@/lib/config";
import { logger } from "@/lib/logger";

// モジュール評価時ではなく実行時に getConfig() を呼ぶことで
// Edge Runtime (middleware) での import 時のクラッシュを防ぐ
function getAllowedEmails(): Set<string> {
  const config = getConfig();
  return new Set(
    (config.ALLOWED_EMAILS ?? "")
      .split(/[,\s]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    // process.env を直接参照することでモジュール評価時の getConfig() 実行を回避する
    // (getConfig はモジュール import 時ではなく実際の認証処理時に呼ばれる)
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  callbacks: {
    async signIn({ user }) {
      const allowedEmails = getAllowedEmails();
      if (allowedEmails.size === 0) {
        logger.warn("Sign-in blocked: ALLOWED_EMAILS is empty.");
        return false;
      }

      const email = user.email?.toLowerCase();
      if (!email) {
        logger.warn("Sign-in blocked: missing email on user profile.");
        return false;
      }

      if (!allowedEmails.has(email)) {
        logger.warn("Sign-in blocked: email not in ALLOWED_EMAILS.", { email });
        return false;
      }

      return true;
    },
  },
};

export default NextAuth(authOptions);
