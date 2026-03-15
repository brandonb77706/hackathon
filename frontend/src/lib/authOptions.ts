import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.googleAccessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).googleAccessToken = token.googleAccessToken;
      return session;
    },
    async redirect({ url, baseUrl }) {
      return baseUrl + "/auth/callback";
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
