export const dynamic = 'force-dynamic'

import { prisma } from '../../../../lib/prisma'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ q?: string; webinarId?: string }>
}

async function getRegistrations(q?: string, webinarId?: string) {
  try {
    return await prisma.registration.findMany({
      where: {
        ...(webinarId ? { webinarId } : {}),
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: 'insensitive' } },
                { name: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        webinar: { select: { title: true, slug: true } },
        _count: { select: { emailLogs: true } },
      },
    })
  } catch {
    return []
  }
}

export default async function RegistrationsPage({ searchParams }: Props) {
  const { q, webinarId } = await searchParams
  const registrations = await getRegistrations(q, webinarId)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Registrations</h1>
          <p className="text-white/50 text-sm mt-1">{registrations.length} shown</p>
        </div>
      </div>

      {/* Search */}
      <form className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name or email…"
          className="bg-pgd-purple-light border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-pgd-yellow w-full max-w-sm"
        />
      </form>

      <div className="bg-pgd-purple-light rounded-xl overflow-hidden">
        {registrations.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-white/40 text-sm">No registrations found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-3 text-white/50 font-medium">Registrant</th>
                <th className="text-left px-6 py-3 text-white/50 font-medium">Webinar</th>
                <th className="text-left px-6 py-3 text-white/50 font-medium">Access</th>
                <th className="text-left px-6 py-3 text-white/50 font-medium">Emails</th>
                <th className="text-left px-6 py-3 text-white/50 font-medium">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {registrations.map((r) => (
                <tr key={r.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-white">{r.name || '—'}</p>
                    <p className="text-white/40 text-xs mt-0.5">{r.email}</p>
                  </td>
                  <td className="px-6 py-4 text-white/60">
                    <Link
                      href={`/admin/webinars/${r.webinarId}`}
                      className="hover:text-pgd-blue transition-colors"
                    >
                      {r.webinar.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      r.accessGranted
                        ? 'bg-pgd-green/20 text-pgd-green'
                        : 'bg-pgd-yellow/20 text-pgd-yellow'
                    }`}>
                      {r.accessGranted ? 'Active' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/60">
                    {r._count.emailLogs}
                  </td>
                  <td className="px-6 py-4 text-white/40 text-xs">
                    {new Date(r.createdAt).toLocaleDateString('en-GB')}
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
