import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set in the environment variables.`);
  }
  return value;
}

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
};
