export const dynamic = 'force-dynamic'

import { prisma } from '../../../../lib/prisma'
import Link from 'next/link'

async function getWidgets() {
  try {
    return await prisma.widget.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { webinar: { select: { id: true, title: true, slug: true } } },
    })
  } catch {
    return []
  }
}

export default async function WidgetsPage() {
  const widgets = await getWidgets()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Widgets</h1>
        <p className="text-white/50 text-sm mt-1">All active embed widgets across webinars</p>
      </div>

      {widgets.length === 0 ? (
        <div className="bg-pgd-purple-light rounded-xl p-16 text-center">
          <p className="text-white/40 text-sm mb-2">No widgets yet</p>
          <p className="text-white/30 text-xs">Create widgets from the Widgets tab on each webinar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {widgets.map((w) => {
            const typeAttr = w.widgetType === 'EXIT_INTENT' ? 'exit-intent' : 'floating'
            const snippet = `<script src="${appUrl}/widget.js" data-widget-id="${w.id}" data-type="${typeAttr}" async></script>`
            return (
              <div key={w.id} className="bg-pgd-purple-light rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        w.isActive ? 'bg-pgd-green/20 text-pgd-green' : 'bg-white/10 text-white/40'
                      }`}>
                        {w.isActive ? 'Active' : 'Off'}
                      </span>
                      <span className="text-xs text-white/40">{w.widgetType === 'EXIT_INTENT' ? 'Exit-Intent' : 'Floating'}</span>
                    </div>
                    <p className="text-white font-medium text-sm">{w.headline || w.webinar.title}</p>
                    <Link
                      href={`/admin/webinars/${w.webinar.id}?tab=widgets`}
                      className="text-pgd-blue text-xs hover:underline"
                    >
                      {w.webinar.title} →
                    </Link>
                  </div>
                </div>
                <div className="bg-pgd-purple rounded-lg px-3 py-2">
                  <code className="text-pgd-green text-xs break-all">{snippet}</code>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
