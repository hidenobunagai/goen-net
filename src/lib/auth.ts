import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set in the environment variables.`);
  }
  return value;
}

const allowedEmails = new Set(
  (process.env.ALLOWED_EMAILS ?? "")
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
      clientId: getEnvVar("GOOGLE_CLIENT_ID"),
      clientSecret: getEnvVar("GOOGLE_CLIENT_SECRET"),
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
        console.warn("Sign-in blocked: missing email on user profile.");
        return false;
      }

      if (!allowedEmails.has(email)) {
        console.warn(`Sign-in blocked: ${email} is not in ALLOWED_EMAILS.`);
        return false;
      }

      return true;
    },
  },
};
