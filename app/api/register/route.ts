import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { sendEmail } from '../../../lib/email'
import { registrationConfirmEmail } from '../../../lib/email-templates'
import { getStripe } from '../../../lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { webinarId, email, name, scheduledWatchAt, utmSource, utmMedium, utmCampaign } = body

    if (!webinarId || !email) {
      return NextResponse.json({ error: 'webinarId and email are required' }, { status: 400 })
    }

    const webinar = await prisma.webinar.findUnique({
      where: { id: webinarId, status: 'PUBLISHED' },
    })

    if (!webinar) {
      return NextResponse.json({ error: 'Webinar not found' }, { status: 404 })
    }

    const watchAt = scheduledWatchAt ? new Date(scheduledWatchAt) : null
    const watchingNow = !watchAt || watchAt <= new Date(Date.now() + 60_000) // within 1 minute = "now"

    // Upsert registration — no duplicate errors on re-submit
    const registration = await prisma.registration.upsert({
      where: { webinarId_email: { webinarId, email } },
      create: {
        webinarId,
        email,
        name: name ?? '',
        accessGranted: webinar.accessType === 'FREE',
        scheduledWatchAt: watchAt,
        utmSource: utmSource ?? '',
        utmMedium: utmMedium ?? '',
        utmCampaign: utmCampaign ?? '',
      },
      update: {
        name: name ?? '',
        ...(watchAt ? { scheduledWatchAt: watchAt } : {}),
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const accessUrl = `${appUrl}/watch/${webinar.slug}?token=${registration.accessToken}`
    const unsubscribeUrl = `${appUrl}/unsubscribe?token=${registration.accessToken}`
    const firstName = (email as string).split('@')[0]

    // ── FREE: always send confirmation email; no Stripe involved ──────────────
    if (webinar.accessType === 'FREE') {
      const { subject, html } = registrationConfirmEmail({
        firstName,
        webinarTitle: webinar.title,
        accessUrl,
        unsubscribeUrl,
      })
      await sendEmail({ to: email, subject, html })

      // If watching now, also return the access token so the client could
      // optionally redirect directly (future enhancement)
      return NextResponse.json({
        success: true,
        watchingNow,
        accessToken: watchingNow ? registration.accessToken : undefined,
      })
    }

    // ── PAID: create Stripe Checkout — no access granted until payment ────────
    if (webinar.accessType === 'PAID') {
      if (!webinar.stripePriceId) {
        return NextResponse.json({ error: 'Webinar payment not configured' }, { status: 500 })
      }

      const stripe = getStripe()
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: webinar.stripePriceId, quantity: 1 }],
        customer_email: email,
        success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/checkout/cancelled`,
        metadata: {
          type: 'WEBINAR_ACCESS',
          webinarId: webinar.id,
          registrationId: registration.id,
        },
      })

      return NextResponse.json({ checkoutUrl: session.url })
    }

    // ── MEMBERSHIP: redirect to upgrade page ─────────────────────────────────
    if (webinar.accessType === 'MEMBERSHIP') {
      return NextResponse.json({ membershipUrl: '/membership/upgrade' })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[register] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
