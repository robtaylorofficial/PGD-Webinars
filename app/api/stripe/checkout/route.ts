import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '../../../../lib/stripe'

// Creates a Stripe Checkout session for in-video product purchases
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { priceId, productId, registrationId, email, ctaId } = body

    if (!priceId || !email) {
      return NextResponse.json({ error: 'priceId and email are required' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const stripe = getStripe()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancelled`,
      metadata: {
        type: 'PRODUCT_PURCHASE',
        productId: productId ?? '',
        registrationId: registrationId ?? '',
        ctaId: ctaId ?? '',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/checkout] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
