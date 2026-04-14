import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'Plan Grow Do <hello@plangrowdo.com>'
const REPLY_TO = 'robert@plangrowdo.com'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  replyTo?: string
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      replyTo: replyTo ?? REPLY_TO,
    })

    if (error) {
      console.error('[email] send error', error)
      return { success: false, error }
    }

    return { success: true, id: data?.id }
  } catch (err) {
    console.error('[email] unexpected error', err)
    return { success: false, error: err }
  }
}

/** Interpolate template tokens */
export function interpolate(
  template: string,
  vars: Record<string, string>,
): string {
  return Object.entries(vars).reduce(
    (out, [key, val]) => out.replaceAll(`{{${key}}}`, val),
    template,
  )
}
