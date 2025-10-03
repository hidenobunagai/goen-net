import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getConfig } from "./config";
import { logger } from "./logger";

const config = getConfig();

const allowedEmails = new Set(
  (config.ALLOWED_EMAILS ?? "")
    .split(/[,\s]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async signIn({ user }) {
      if (allowedEmails.size === 0) {
        return true;
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
