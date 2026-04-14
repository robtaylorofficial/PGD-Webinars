import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

// Edge-compatible middleware — uses only authConfig (no Prisma).
// JWT is verified at the edge; no DB access needed.
export default NextAuth(authConfig).auth

export const config = {
  matcher: ['/admin/:path*'],
}
