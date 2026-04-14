import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { sendEmail } from '../../../../lib/email'
import { registrationConfirmEmail } from '../../../../lib/email-templates'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { webinarId, email, name, widgetId } = body

  if (!webinarId || !email) {
    return NextResponse.json({ error: 'webinarId and email are required' }, { status: 400 })
  }

  const webinar = await prisma.webinar.findUnique({ where: { id: webinarId } })
  if (!webinar) return NextResponse.json({ error: 'Webinar not found' }, { status: 404 })

  // Only handle FREE webinars via widget (paid requires Stripe checkout)
  if (webinar.accessType !== 'FREE') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    return NextResponse.json({
      requiresPayment: true,
      webinarUrl: `${appUrl}/webinars/${webinar.slug}`,
    })
  }

  const registration = await prisma.registration.upsert({
    where: { webinarId_email: { webinarId, email } },
    create: {
      webinarId,
      email,
      name: name ?? '',
      accessGranted: true,
      utmSource: widgetId ? 'widget' : '',
      utmMedium: 'widget',
    },
    update: {
      accessGranted: true,
    },
  })

  // Send access email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const firstName = (name || email).split(' ')[0].split('@')[0]
  const { subject, html } = registrationConfirmEmail({
    firstName,
    webinarTitle: webinar.title,
    accessUrl: `${appUrl}/watch/${webinar.slug}?token=${registration.accessToken}`,
    unsubscribeUrl: `${appUrl}/unsubscribe?token=${registration.accessToken}`,
  })

  await sendEmail({ to: email, subject, html })

  return NextResponse.json(
    { success: true, accessToken: registration.accessToken },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
  )
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
