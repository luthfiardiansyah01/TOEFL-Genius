import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { ensureAdminAccount } from "./admin-seed";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
  pages: {
    signIn: "/",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        // Make sure the default admin account exists before login attempts.
        await ensureAdminAccount();

        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = (user as { role?: string }).role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        session.user.name = (token.name as string) || session.user.name;
        session.user.email = (token.email as string) || session.user.email;
        (session.user as { role?: string }).role = (token.role as string) || "USER";
      }
      return session;
    },
  },
};

/** Returns the authenticated user's id from a server request, or null. */
export async function getAuthUserId(): Promise<string | null> {
  const { getServerSession } = await import("next-auth");
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  return id ?? null;
}

/** Returns the authenticated user's full record (id, role, name, email) or null. */
export async function getAuthUser(): Promise<{
  id: string;
  role: string;
  name: string;
  email: string;
} | null> {
  const userId = await getAuthUserId();
  if (!userId) return null;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, name: true, email: true },
  });
  return user ?? null;
}

/**
 * Throws a 401-ish sentinel for non-admins. Returns the admin user record on success.
 * Usage in route handlers:
 *   const admin = await requireAdmin();
 *   if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 */
export async function requireAdmin(): Promise<{
  id: string;
  role: string;
  name: string;
  email: string;
} | null> {
  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}
