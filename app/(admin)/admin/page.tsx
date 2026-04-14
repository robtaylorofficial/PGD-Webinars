export const dynamic = 'force-dynamic'

import { prisma } from '../../../lib/prisma'
import Link from 'next/link'
import RegistrationChart from '../../../components/admin/registration-chart'

async function getStats() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalRegistrations,
      registrationsToday,
      totalRevenue,
      webinarCount,
      recentRegistrations,
      recentRegistrationsByDay,
      topWebinars,
      completionCount,
    ] = await Promise.all([
      prisma.registration.count(),
      prisma.registration.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      prisma.purchase.aggregate({
        _sum: { amountGbp: true },
        where: { status: 'COMPLETE' },
      }),
      prisma.webinar.count({ where: { status: { in: ['PUBLISHED', 'LIVE'] } } }),
      prisma.registration.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { webinar: { select: { title: true, slug: true } } },
      }),
      prisma.registration.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.webinar.findMany({
        where: { status: { in: ['PUBLISHED', 'LIVE'] } },
        include: { _count: { select: { registrations: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      prisma.watchEvent.count({ where: { eventType: 'COMPLETE' } }),
    ])

    // Build daily registration chart data (last 30 days)
    const dayMap = new Map<string, number>()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const key = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      dayMap.set(key, 0)
    }
    for (const reg of recentRegistrationsByDay) {
      const key = new Date(reg.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      dayMap.set(key, (dayMap.get(key) ?? 0) + 1)
    }
    const chartData = Array.from(dayMap.entries()).map(([date, registrations]) => ({
      date,
      registrations,
    }))

    return {
      totalRegistrations,
      registrationsToday,
      totalRevenuePence: totalRevenue._sum.amountGbp ?? 0,
      webinarCount,
      completionCount,
      recentRegistrations,
      chartData,
      topWebinars,
    }
  } catch {
    return {
      totalRegistrations: 0,
      registrationsToday: 0,
      totalRevenuePence: 0,
      webinarCount: 0,
      completionCount: 0,
      recentRegistrations: [],
      chartData: [],
      topWebinars: [],
    }
  }
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="bg-pgd-purple-light rounded-xl p-5">
      <p className="text-sm font-medium text-white/60">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent ?? 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
    </div>
  )
}

export default async function AdminDashboard() {
  const stats = await getStats()
  const revenue = `£${(stats.totalRevenuePence / 100).toFixed(2)}`

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-white/50 text-sm mt-1">Plan Grow Do Webinar Portal</p>
        </div>
        <Link
          href="/admin/webinars/new"
          className="bg-pgd-yellow text-pgd-purple font-semibold px-4 py-2 rounded-lg text-sm hover:bg-pgd-yellow-dark transition-colors"
        >
          + New Webinar
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Registrations today"
          value={String(stats.registrationsToday)}
          sub="since midnight"
          accent="text-pgd-yellow"
        />
        <StatCard
          label="Total registrations"
          value={stats.totalRegistrations.toLocaleString()}
        />
        <StatCard
          label="Completions"
          value={String(stats.completionCount)}
          sub={stats.totalRegistrations > 0
            ? `${Math.round((stats.completionCount / stats.totalRegistrations) * 100)}% rate`
            : undefined}
          accent="text-pgd-green"
        />
        <StatCard
          label="Total revenue"
          value={revenue}
          accent="text-pgd-blue"
        />
      </div>

      {/* Registrations chart */}
      <div className="bg-pgd-purple-light rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-white">Registrations — last 30 days</h2>
        </div>
        <RegistrationChart data={stats.chartData} />
      </div>

      {/* Bottom grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top webinars */}
        <div className="bg-pgd-purple-light rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h2 className="font-semibold text-white text-sm">Top webinars</h2>
            <Link href="/admin/webinars" className="text-pgd-blue text-xs hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-white/10">
            {stats.topWebinars.length === 0 ? (
              <p className="px-5 py-8 text-center text-white/30 text-sm">No webinars yet</p>
            ) : (
              stats.topWebinars.map((w) => (
                <Link
                  key={w.id}
                  href={`/admin/webinars/${w.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{w.title}</p>
                    <span className={`text-xs font-medium ${
                      w.status === 'LIVE' ? 'text-pgd-green' : 'text-white/40'
                    }`}>{w.status}</span>
                  </div>
                  <span className="text-pgd-yellow font-bold text-sm ml-4 flex-shrink-0">
                    {w._count.registrations}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent registrations */}
        <div className="bg-pgd-purple-light rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h2 className="font-semibold text-white text-sm">Recent registrations</h2>
            <Link href="/admin/registrations" className="text-pgd-blue text-xs hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-white/10">
            {stats.recentRegistrations.length === 0 ? (
              <p className="px-5 py-8 text-center text-white/30 text-sm">No registrations yet</p>
            ) : (
              stats.recentRegistrations.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{r.name || r.email}</p>
                    <p className="text-xs text-white/40 truncate">{r.webinar.title}</p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      r.accessGranted ? 'bg-pgd-green/20 text-pgd-green' : 'bg-pgd-yellow/20 text-pgd-yellow'
                    }`}>
                      {r.accessGranted ? 'Active' : 'Pending'}
                    </span>
                    <p className="text-xs text-white/30 mt-1">
                      {new Date(r.createdAt).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
