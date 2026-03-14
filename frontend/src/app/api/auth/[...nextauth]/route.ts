import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      // After Google sign-in, redirect to our FastAPI OAuth flow
      // which will upsert the user by oauth_sub and issue a FastAPI JWT.
      // The actual FastAPI JWT exchange happens in /auth/callback page.
      return true;
    },
    async redirect({ url, baseUrl }) {
      return baseUrl + "/auth/callback";
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
