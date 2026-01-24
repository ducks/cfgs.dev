import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import GitLab from "next-auth/providers/gitlab";
import { createUser } from "./db";
import { randomUUID } from "crypto";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    GitLab({
      clientId: process.env.GITLAB_CLIENT_ID!,
      clientSecret: process.env.GITLAB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !profile) return false;

      const provider = account.provider;
      const providerId = account.providerAccountId;

      // Get username from profile
      let username = "";
      if (provider === "github") {
        username = (profile as { login?: string }).login || user.email?.split("@")[0] || providerId;
      } else if (provider === "gitlab") {
        username = (profile as { username?: string }).username || user.email?.split("@")[0] || providerId;
      }

      // Create or update user in our database
      createUser({
        id: randomUUID(),
        username,
        name: user.name || null,
        email: user.email || null,
        avatar_url: user.image || null,
        provider,
        provider_id: providerId,
        dotfiles_url: null,
      });

      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        // Add provider info to session
        session.user.id = token.sub;
        session.user.provider = token.provider as string;
        session.user.username = token.username as string;
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.provider = account.provider;
        if (account.provider === "github") {
          token.username = (profile as { login?: string }).login;
        } else if (account.provider === "gitlab") {
          token.username = (profile as { username?: string }).username;
        }
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
});

// Extend the session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      provider?: string;
      username?: string;
    };
  }
}
