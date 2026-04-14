export const dynamic = 'force-dynamic'

import { prisma } from '../../../../lib/prisma'
import Link from 'next/link'

async function getWebinars() {
  try {
    return await prisma.webinar.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { registrations: true } },
      },
    })
  } catch {
    return []
  }
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-white/10 text-white/60',
  LIVE: 'bg-pgd-green/20 text-pgd-green animate-pulse',
  PUBLISHED: 'bg-pgd-blue/20 text-pgd-blue',
  ARCHIVED: 'bg-white/5 text-white/30',
}

const TYPE_LABELS: Record<string, string> = {
  ON_DEMAND: 'On Demand',
  LIVE: 'Live',
  HYBRID: 'Hybrid',
}

export default async function WebinarsPage() {
  const webinars = await getWebinars()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Webinars</h1>
          <p className="text-white/50 text-sm mt-1">{webinars.length} total</p>
        </div>
        <Link
          href="/admin/webinars/new"
          className="bg-pgd-yellow text-pgd-purple font-semibold px-4 py-2 rounded-lg text-sm hover:bg-pgd-yellow-dark transition-colors"
        >
          + New Webinar
        </Link>
      </div>

      <div className="bg-pgd-purple-light rounded-xl overflow-hidden">
        {webinars.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-white/40 text-sm">No webinars yet.</p>
            <Link href="/admin/webinars/new" className="text-pgd-yellow hover:underline text-sm mt-2 inline-block">
              Create your first webinar →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-3 text-white/50 font-medium">Title</th>
                <th className="text-left px-6 py-3 text-white/50 font-medium">Type</th>
                <th className="text-left px-6 py-3 text-white/50 font-medium">Access</th>
                <th className="text-left px-6 py-3 text-white/50 font-medium">Status</th>
                <th className="text-right px-6 py-3 text-white/50 font-medium">Registrations</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {webinars.map((w) => (
                <tr key={w.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-white">{w.title}</p>
                    <p className="text-white/40 text-xs mt-0.5">/{w.slug}</p>
                  </td>
                  <td className="px-6 py-4 text-white/60">
                    {TYPE_LABELS[w.webinarType] ?? w.webinarType}
                  </td>
                  <td className="px-6 py-4">
                    {w.accessType === 'FREE' ? (
                      <span className="text-pgd-green text-xs font-medium">Free</span>
                    ) : w.accessType === 'MEMBERSHIP' ? (
                      <span className="text-pgd-blue text-xs font-medium">Membership</span>
                    ) : (
                      <span className="text-pgd-yellow text-xs font-medium">
                        £{(w.priceGbp / 100).toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[w.status] ?? 'bg-white/10 text-white/60'}`}
                    >
                      {w.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-white/60">
                    {w._count.registrations}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/webinars/${w.id}`}
                      className="text-pgd-blue text-xs hover:underline"
                    >
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
