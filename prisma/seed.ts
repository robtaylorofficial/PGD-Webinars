/**
 * Seed script — creates the first admin user.
 *
 * Usage:
 *   npx tsx prisma/seed.ts
 *
 * Environment variables required:
 *   DATABASE_URL — your Postgres connection string
 *   ADMIN_EMAIL  — the email address for the admin account
 *   ADMIN_PASSWORD — the initial password (change after first login)
 *
 * Example:
 *   ADMIN_EMAIL=robert@plangrowdo.com ADMIN_PASSWORD=changeme123 npx tsx prisma/seed.ts
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma/client'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    console.error('❌  ADMIN_EMAIL and ADMIN_PASSWORD must be set')
    process.exit(1)
  }

  const hashed = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', password: hashed },
    create: {
      email,
      name: 'Admin',
      password: hashed,
      role: 'ADMIN',
    },
  })

  console.log(`✅  Admin user ready: ${user.email} (id: ${user.id})`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
