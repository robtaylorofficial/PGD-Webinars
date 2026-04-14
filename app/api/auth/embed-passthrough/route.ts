import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '../../../../lib/prisma'

export async function POST(req: NextRequest) {
  const secret = process.env.MEMBERSHIP_SHARED_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const body = await req.json()
  const { email, membershipToken, webinarSlug } = body

  if (!email || !membershipToken || !webinarSlug) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify the JWT signed by plangrowdo.com with the shared secret
  let payload: { email?: string; membershipStatus?: string }
  try {
    const secretKey = new TextEncoder().encode(secret)
    const result = await jwtVerify(membershipToken, secretKey, {
      algorithms: ['HS256'],
    })
    payload = result.payload as { email?: string; membershipStatus?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // The token's email must match the claimed email
  if (payload.email !== email) {
    return NextResponse.json({ error: 'Token email mismatch' }, { status: 401 })
  }

  const webinar = await prisma.webinar.findUnique({ where: { slug: webinarSlug } })
  if (!webinar) {
    return NextResponse.json({ error: 'Webinar not found' }, { status: 404 })
  }

  // Upsert user with active membership
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      membershipStatus: 'ACTIVE',
      role: 'VIEWER',
    },
    update: {
      membershipStatus: 'ACTIVE',
    },
  })

  // Upsert registration — grant access immediately
  const registration = await prisma.registration.upsert({
    where: { webinarId_email: { webinarId: webinar.id, email } },
    create: {
      webinarId: webinar.id,
      userId: user.id,
      email,
      name: user.name,
      accessGranted: true,
    },
    update: {
      accessGranted: true,
      userId: user.id,
    },
  })

  return NextResponse.json({
    accessToken: registration.accessToken,
    watchUrl: `/embed/${webinarSlug}/player?token=${registration.accessToken}`,
  })
}
