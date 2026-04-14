export const dynamic = 'force-dynamic'

// Settings page — displays current env config status and links to external services.
// No form submissions here; env vars are set in Vercel/hosting platform.

function EnvRow({ label, envKey, masked = true }: {
  label: string
  envKey: string
  masked?: boolean
}) {
  const value = process.env[envKey]
  const isSet = !!value && value !== '' && !value.startsWith('your_')

  return (
    <div className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <code className="text-xs text-white/30">{envKey}</code>
      </div>
      <div className="flex items-center gap-2">
        {isSet ? (
          <>
            <span className="text-xs text-white/30">
              {masked ? '••••••••' + value.slice(-4) : value.slice(0, 20) + '…'}
            </span>
            <span className="w-2 h-2 rounded-full bg-pgd-green" />
          </>
        ) : (
          <span className="text-xs text-red-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Not set
          </span>
        )}
      </div>
    </div>
  )
}

const ENV_GROUPS = [
  {
    title: 'Database',
    vars: [
      { label: 'Database URL', envKey: 'DATABASE_URL' },
    ],
  },
  {
    title: 'Authentication',
    vars: [
      { label: 'Auth Secret', envKey: 'NEXTAUTH_SECRET' },
      { label: 'Membership Shared Secret', envKey: 'MEMBERSHIP_SHARED_SECRET' },
    ],
  },
  {
    title: 'Mux (Video)',
    vars: [
      { label: 'Mux Token ID', envKey: 'MUX_TOKEN_ID' },
      { label: 'Mux Token Secret', envKey: 'MUX_TOKEN_SECRET' },
      { label: 'Mux Signing Key ID', envKey: 'MUX_SIGNING_KEY_ID' },
      { label: 'Mux Signing Private Key', envKey: 'MUX_SIGNING_PRIVATE_KEY' },
      { label: 'Mux Webhook Secret', envKey: 'MUX_WEBHOOK_SECRET' },
    ],
  },
  {
    title: 'Stripe (Payments)',
    vars: [
      { label: 'Stripe Secret Key', envKey: 'STRIPE_SECRET_KEY' },
      { label: 'Stripe Webhook Secret', envKey: 'STRIPE_WEBHOOK_SECRET' },
      { label: 'Always On Price ID', envKey: 'STRIPE_PRICE_ALWAYS_ON_MONTHLY' },
    ],
  },
  {
    title: 'Resend (Email)',
    vars: [
      { label: 'Resend API Key', envKey: 'RESEND_API_KEY' },
    ],
  },
  {
    title: 'Anthropic (AI Q&A)',
    vars: [
      { label: 'Anthropic API Key', envKey: 'ANTHROPIC_API_KEY' },
    ],
  },
  {
    title: 'App',
    vars: [
      { label: 'App URL', envKey: 'NEXT_PUBLIC_APP_URL', masked: false },
      { label: 'Cron Secret', envKey: 'CRON_SECRET' },
    ],
  },
]

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/50 text-sm mt-1">
          Environment variable status — configure these in your Vercel project settings
        </p>
      </div>

      <div className="space-y-5 max-w-2xl">
        {ENV_GROUPS.map((group) => (
          <div key={group.title} className="bg-pgd-purple-light rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10">
              <h2 className="text-sm font-semibold text-white">{group.title}</h2>
            </div>
            <div className="px-5">
              {group.vars.map((v) => (
                <EnvRow key={v.envKey} label={v.label} envKey={v.envKey} masked={v.masked !== false} />
              ))}
            </div>
          </div>
        ))}

        <div className="bg-pgd-purple-light rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Cron Jobs</h2>
          <div className="space-y-2">
            {[
              { path: '/api/cron/sequence', schedule: 'Every hour', desc: 'Email sequence steps 2, 3, 6, 10' },
              { path: '/api/cron/watch-reminders', schedule: 'Daily 9am', desc: 'Scheduled-watch & post-completion follow-ups' },
              { path: '/api/cron/abandoned', schedule: 'Daily 10am', desc: 'Re-engage partial viewers (steps 8 & 9)' },
              { path: '/api/cron/live-reminders', schedule: 'Every hour', desc: '24h/1h pre-live + replay-available emails' },
            ].map((job) => (
              <div key={job.path} className="flex items-start justify-between py-2 border-b border-white/10 last:border-0">
                <div>
                  <code className="text-pgd-yellow text-xs">{job.path}</code>
                  <p className="text-white/50 text-xs mt-0.5">{job.desc}</p>
                </div>
                <span className="text-xs text-white/40 flex-shrink-0 ml-4">{job.schedule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
