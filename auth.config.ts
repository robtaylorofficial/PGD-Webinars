import type { NextAuthConfig } from 'next-auth'

// Edge-compatible auth config — no Prisma, no Node.js-only modules.
// Used by middleware.ts for JWT verification at the edge.
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [], // providers added in auth.ts with full Prisma support
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const role = (auth?.user as { role?: string })?.role

      if (nextUrl.pathname.startsWith('/admin')) {
        if (!isLoggedIn) return false
        return role === 'ADMIN'
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? 'VIEWER'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as { role?: string }).role = token.role as string
      }
      return session
    },
  },
  session: { strategy: 'jwt' },
}
