export const dynamic = 'force-dynamic'

import { prisma } from '../../../../lib/prisma'

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>
}

async function getLogs(q?: string, page = 1) {
  try {
    const take = 50
    const skip = (page - 1) * take
    const where = q
      ? { OR: [
          { email: { contains: q, mode: 'insensitive' as const } },
          { subject: { contains: q, mode: 'insensitive' as const } },
        ]}
      : {}

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.emailLog.count({ where }),
    ])
    return { logs, total, pages: Math.ceil(total / take) }
  } catch {
    return { logs: [], total: 0, pages: 0 }
  }
}

export default async function EmailLogsPage({ searchParams }: Props) {
  const { q, page } = await searchParams
  const { logs, total, pages } = await getLogs(q, parseInt(page ?? '1'))
  const currentPage = parseInt(page ?? '1')

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Email Logs</h1>
          <p className="text-white/50 text-sm mt-1">{total.toLocaleString()} emails sent</p>
        </div>
      </div>

      {/* Search */}
      <form className="mb-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by email or subject..."
          className="w-full max-w-sm bg-pgd-purple-light border border-white/10 rounded-lg px-4 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pgd-yellow"
        />
      </form>

      {logs.length === 0 ? (
        <div className="bg-pgd-purple-light rounded-xl p-16 text-center">
          <p className="text-white/40 text-sm">No emails found</p>
        </div>
      ) : (
        <>
          <div className="bg-pgd-purple-light rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Recipient</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider hidden md:table-cell">Subject</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider hidden lg:table-cell">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm text-white">{log.email}</p>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <p className="text-sm text-white/70 truncate max-w-xs">{log.subject}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-white/50">{log.emailType}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        log.status === 'SENT' ? 'bg-pgd-green/20 text-pgd-green'
                        : log.status === 'FAILED' ? 'bg-red-500/20 text-red-400'
                        : 'bg-white/10 text-white/40'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <p className="text-xs text-white/40">
                        {new Date(log.createdAt).toLocaleString('en-GB', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-white/40 text-sm">Page {currentPage} of {pages}</p>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <a
                    href={`?${q ? `q=${q}&` : ''}page=${currentPage - 1}`}
                    className="bg-pgd-purple-light text-white/70 text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    ← Prev
                  </a>
                )}
                {currentPage < pages && (
                  <a
                    href={`?${q ? `q=${q}&` : ''}page=${currentPage + 1}`}
                    className="bg-pgd-purple-light text-white/70 text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Next →
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
