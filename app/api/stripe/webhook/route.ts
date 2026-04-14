import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '../../../../lib/stripe'
import { prisma } from '../../../../lib/prisma'
import { sendEmail } from '../../../../lib/email'
import { registrationConfirmEmail } from '../../../../lib/email-templates'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const meta = session.metadata ?? {}

      if (meta.type === 'WEBINAR_ACCESS') {
        const registration = await prisma.registration.update({
          where: { id: meta.registrationId },
          data: { accessGranted: true },
          include: { webinar: true },
        })

        await prisma.purchase.create({
          data: {
            email: session.customer_email ?? registration.email,
            webinarId: meta.webinarId,
            stripeSessionId: session.id,
            stripePaymentIntentId: typeof session.payment_intent === 'string'
              ? session.payment_intent
              : '',
            amountGbp: session.amount_total ?? 0,
            status: 'COMPLETE',
          },
        })

        // Send access confirmation email
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        const accessUrl = `${appUrl}/watch/${registration.webinar.slug}?token=${registration.accessToken}`
        const unsubscribeUrl = `${appUrl}/unsubscribe?token=${registration.accessToken}`
        const firstName = (registration.name || registration.email).split(' ')[0].split('@')[0]

        const { subject, html } = registrationConfirmEmail({
          firstName,
          webinarTitle: registration.webinar.title,
          accessUrl,
          unsubscribeUrl,
        })

        await sendEmail({ to: registration.email, subject, html })
      }

      if (meta.type === 'MEMBERSHIP_UPGRADE') {
        await prisma.user.update({
          where: { id: meta.userId },
          data: { membershipStatus: 'ACTIVE' },
        })

        // Grant access to all MEMBERSHIP webinars
        const membershipWebinars = await prisma.webinar.findMany({
          where: { accessType: 'MEMBERSHIP', status: 'PUBLISHED' },
        })

        const email = session.customer_email ?? ''
        for (const webinar of membershipWebinars) {
          await prisma.registration.upsert({
            where: { webinarId_email: { webinarId: webinar.id, email } },
            create: { webinarId: webinar.id, email, accessGranted: true },
            update: { accessGranted: true },
          })
        }
      }

      if (meta.type === 'PRODUCT_PURCHASE') {
        await prisma.purchase.create({
          data: {
            email: session.customer_email ?? '',
            productId: meta.productId ?? null,
            stripeSessionId: session.id,
            stripePaymentIntentId: typeof session.payment_intent === 'string'
              ? session.payment_intent
              : '',
            amountGbp: session.amount_total ?? 0,
            status: 'COMPLETE',
          },
        })
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object
      const meta = (subscription as { metadata?: Record<string, string> }).metadata ?? {}

      if (meta.userId) {
        const isActive = subscription.status === 'active'
        await prisma.user.update({
          where: { id: meta.userId },
          data: { membershipStatus: isActive ? 'ACTIVE' : 'CANCELLED' },
        })
      }
    }
  } catch (err) {
    console.error('[stripe/webhook] processing error', err)
    return NextResponse.json({ error: 'Processing error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
