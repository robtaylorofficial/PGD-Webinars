// PGD branded email HTML helpers
// All colours match the official PGD brand palette

const PURPLE = '#43165c'
const YELLOW = '#fbba00'
const WHITE = '#ffffff'
const LIGHT_PURPLE = '#6b2a8f'
const TEXT_MUTED = '#c8a6e0'

export function base(content: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Plan Grow Do</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body { margin: 0; padding: 0; background-color: ${PURPLE}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    a { color: ${YELLOW}; }
    @media only screen and (max-width: 600px) {
      .email-body { padding: 16px !important; }
      .email-card { border-radius: 8px !important; }
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}&nbsp;‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${PURPLE};">
    <tr>
      <td align="center" class="email-body" style="padding: 40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;">
          <!-- Header -->
          <tr>
            <td style="background-color:${PURPLE};padding:24px 32px 20px;border-radius:12px 12px 0 0;border-bottom:3px solid ${YELLOW};">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.5px;">
                      <span style="color:${YELLOW};">PLAN.</span>
                      <span style="color:#76b82a;"> GROW.</span>
                      <span style="color:#009fe3;"> DO.</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body card -->
          <tr>
            <td class="email-card" style="background-color:${LIGHT_PURPLE};padding:32px;border-radius:0 0 12px 12px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:${TEXT_MUTED};">
                You're receiving this because you registered for a Plan Grow Do webinar.<br/>
                <a href="{{unsubscribeUrl}}" style="color:${TEXT_MUTED};text-decoration:underline;">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="https://plangrowdo.com" style="color:${TEXT_MUTED};text-decoration:underline;">plangrowdo.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function h1(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:${WHITE};line-height:1.2;">${text}</h1>`
}

export function h2(text: string): string {
  return `<h2 style="margin:0 0 12px;font-size:20px;font-weight:600;color:${WHITE};line-height:1.3;">${text}</h2>`
}

export function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:${WHITE};line-height:1.6;">${text}</p>`
}

export function muted(text: string): string {
  return `<p style="margin:0 0 12px;font-size:13px;color:${TEXT_MUTED};line-height:1.5;">${text}</p>`
}

export function btn(label: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
    <tr>
      <td style="border-radius:6px;background-color:${YELLOW};">
        <a href="${href}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:${PURPLE};text-decoration:none;border-radius:6px;">${label}</a>
      </td>
    </tr>
  </table>`
}

export function divider(): string {
  return `<hr style="border:none;border-top:1px solid rgba(251,186,0,0.2);margin:24px 0;" />`
}

export function highlight(text: string): string {
  return `<div style="background-color:rgba(251,186,0,0.1);border-left:3px solid ${YELLOW};padding:12px 16px;border-radius:0 6px 6px 0;margin:16px 0;">
    <p style="margin:0;font-size:14px;color:${WHITE};line-height:1.5;">${text}</p>
  </div>`
}

// ── Prebuilt template functions ───────────────────────────────────────────────

export function registrationConfirmEmail(vars: {
  firstName: string
  webinarTitle: string
  accessUrl: string
  unsubscribeUrl: string
}): { subject: string; html: string } {
  const subject = `Here's your access link: ${vars.webinarTitle}`
  const html = base(
    h1(`You're registered! 🎉`) +
    p(`Hi ${vars.firstName}, you're all set. Click below to watch <strong>${vars.webinarTitle}</strong> whenever you're ready.`) +
    btn('Watch Now', vars.accessUrl) +
    divider() +
    muted('This link is personal to you — please do not share it. It never expires.'),
    "Your access link is inside →",
  ).replace('{{unsubscribeUrl}}', vars.unsubscribeUrl)
  return { subject, html }
}

export function watchReminderEmail(vars: {
  firstName: string
  webinarTitle: string
  accessUrl: string
  unsubscribeUrl: string
  dayNumber: number
}): { subject: string; html: string } {
  const subject = vars.dayNumber === 1
    ? `Have you had a chance to watch yet?`
    : `Don't miss this — ${vars.webinarTitle}`
  const html = base(
    h1(vars.dayNumber === 1 ? `Still waiting for you, ${vars.firstName}` : `Last reminder, ${vars.firstName}`) +
    p(`Your access to <strong>${vars.webinarTitle}</strong> is ready and waiting. It only takes a click.`) +
    btn('Watch Now', vars.accessUrl),
    vars.dayNumber === 1 ? "Your webinar is ready to watch →" : "Final reminder — watch today →",
  ).replace('{{unsubscribeUrl}}', vars.unsubscribeUrl)
  return { subject, html }
}

export function completionEmail(vars: {
  firstName: string
  webinarTitle: string
  ctaUrl: string
  unsubscribeUrl: string
}): { subject: string; html: string } {
  const subject = `You did it — what did you think?`
  const html = base(
    h1(`Well done, ${vars.firstName}!`) +
    p(`You've just finished watching <strong>${vars.webinarTitle}</strong>. That alone puts you ahead of most people.`) +
    p(`Ready to take the next step?`) +
    btn("See What's Next", vars.ctaUrl) +
    divider() +
    muted(`Hit reply and let me know your biggest takeaway — I read every reply.`),
    "Great job finishing the webinar →",
  ).replace('{{unsubscribeUrl}}', vars.unsubscribeUrl)
  return { subject, html }
}

export function liveReminderEmail(vars: {
  firstName: string
  webinarTitle: string
  liveUrl: string
  scheduledTime: string
  unsubscribeUrl: string
  hoursUntil: number
}): { subject: string; html: string } {
  const subject = vars.hoursUntil <= 1
    ? `We go live in 1 hour — join here`
    : `Tomorrow at ${vars.scheduledTime} — your spot is confirmed`
  const html = base(
    h1(vars.hoursUntil <= 1 ? `We're almost live!` : `See you tomorrow, ${vars.firstName}`) +
    p(vars.hoursUntil <= 1
      ? `<strong>${vars.webinarTitle}</strong> starts in less than an hour. Click below to join.`
      : `Your spot for tomorrow's live session of <strong>${vars.webinarTitle}</strong> is confirmed. We go live at ${vars.scheduledTime}.`) +
    btn(vars.hoursUntil <= 1 ? 'Join Now →' : 'Add to Calendar & Join Tomorrow →', vars.liveUrl),
    vars.hoursUntil <= 1 ? "We're live in under an hour →" : "Your live session is tomorrow →",
  ).replace('{{unsubscribeUrl}}', vars.unsubscribeUrl)
  return { subject, html }
}

export function scheduledWatchReminderEmail(vars: {
  firstName: string
  webinarTitle: string
  accessUrl: string
  unsubscribeUrl: string
}): { subject: string; html: string } {
  const subject = `Your webinar is ready — you picked today`
  const html = base(
    h1(`Ready when you are, ${vars.firstName}`) +
    p(`You told us you wanted to watch <strong>${vars.webinarTitle}</strong> today. Your access link is below — it only takes a click.`) +
    btn('Watch Now', vars.accessUrl) +
    divider() +
    muted(`This link is personal to you and never expires.`),
    "You picked today — your link is inside →",
  ).replace('{{unsubscribeUrl}}', vars.unsubscribeUrl)
  return { subject, html }
}

export function abandonedEmail(vars: {
  firstName: string
  webinarTitle: string
  accessUrl: string
  unsubscribeUrl: string
  watchPercent: number
}): { subject: string; html: string } {
  const isEarly = vars.watchPercent < 30
  const subject = isEarly
    ? `You were so close, ${vars.firstName}...`
    : `You got most of the way — here's the ending`
  const html = base(
    h1(isEarly ? `Don't leave it there` : `So nearly there, ${vars.firstName}`) +
    p(isEarly
      ? `You started watching <strong>${vars.webinarTitle}</strong> but didn't finish. The best bits are still ahead — it only takes a few more minutes.`
      : `You watched most of <strong>${vars.webinarTitle}</strong> — the final section covers the most actionable part. Worth finishing.`) +
    btn('Pick Up Where You Left Off', vars.accessUrl) +
    divider() +
    muted(`Your watch position is saved — you can continue from exactly where you stopped.`),
    isEarly ? "The best bits are still ahead →" : "Just a few minutes left — finish it today →",
  ).replace('{{unsubscribeUrl}}', vars.unsubscribeUrl)
  return { subject, html }
}

export function nextStepEmail(vars: {
  firstName: string
  webinarTitle: string
  ctaUrl: string
  unsubscribeUrl: string
}): { subject: string; html: string } {
  const subject = `Next step after ${vars.webinarTitle}`
  const html = base(
    h1(`What's next, ${vars.firstName}?`) +
    p(`You finished watching <strong>${vars.webinarTitle}</strong> two days ago. Now's the time to put what you learned into action.`) +
    p(`Here's the natural next step for members who've completed this webinar:`) +
    btn('See What Members Do Next', vars.ctaUrl) +
    divider() +
    muted(`Hit reply and tell me where you're at — I read every reply.`),
    "Ready for the next step? →",
  ).replace('{{unsubscribeUrl}}', vars.unsubscribeUrl)
  return { subject, html }
}

export function replayAvailableEmail(vars: {
  firstName: string
  webinarTitle: string
  watchUrl: string
  unsubscribeUrl: string
}): { subject: string; html: string } {
  const subject = `Missed the live? The replay is waiting for you`
  const html = base(
    h1(`The replay is live, ${vars.firstName}`) +
    p(`If you couldn't make it to the live session of <strong>${vars.webinarTitle}</strong>, no worries — the recording is ready for you right now.`) +
    btn('Watch the Replay', vars.watchUrl),
    "Catch up on the replay →",
  ).replace('{{unsubscribeUrl}}', vars.unsubscribeUrl)
  return { subject, html }
}
