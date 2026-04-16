'use client'

import WatchFunnelChart from './watch-funnel-chart'
import RegistrationChart from './registration-chart'

interface AnalyticsData {
  totalRegistrations: number
  uniqueViewed: number
  halfwayCount: number
  completionCount: number
  completionRate: number
  avgWatchPct: number
  ctaClicks: number
  qaQuestions: number
  avgRating: number | null
  ratingCount: number
  chartData: Array<{ date: string; registrations: number }>
  topQAs: Array<{ question: string; count: number }>
}

interface Props {
  data: AnalyticsData
}

function Metric({ label, value, sub, color }: {
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className="bg-pgd-purple rounded-xl p-4">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color ?? 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function WebinarAnalytics({ data }: Props) {
  const funnelData = [
    { name: 'Registered', value: data.totalRegistrations, color: '#009fe3' },
    { name: 'Watched', value: data.uniqueViewed, color: '#fbba00' },
    { name: '50%+', value: data.halfwayCount, color: '#76b82a' },
    { name: 'Completed', value: data.completionCount, color: '#76b82a' },
  ]

  return (
    <div className="space-y-6">
      {/* Metric tiles */}
      <div className="grid grid-cols-3 gap-3">
        <Metric
          label="Registrations"
          value={data.totalRegistrations.toLocaleString()}
          color="text-pgd-blue"
        />
        <Metric
          label="Started watching"
          value={data.uniqueViewed.toLocaleString()}
          sub={data.totalRegistrations > 0
            ? `${Math.round((data.uniqueViewed / data.totalRegistrations) * 100)}% of registered`
            : undefined}
          color="text-pgd-yellow"
        />
        <Metric
          label="Completions"
          value={data.completionCount.toLocaleString()}
          sub={`${data.completionRate}% completion rate`}
          color="text-pgd-green"
        />
        <Metric
          label="Avg watch %"
          value={`${data.avgWatchPct}%`}
        />
        <Metric
          label="CTA clicks"
          value={data.ctaClicks.toLocaleString()}
        />
        <Metric
          label="Q&A questions asked"
          value={data.qaQuestions.toLocaleString()}
        />
        {data.avgRating !== null && (
          <Metric
            label="Avg star rating"
            value={`${data.avgRating.toFixed(1)} ★`}
            sub={`from ${data.ratingCount} rating${data.ratingCount !== 1 ? 's' : ''}`}
            color="text-pgd-yellow"
          />
        )}
      </div>

      {/* Registrations over time */}
      {data.chartData.length > 0 && (
        <div className="bg-pgd-purple rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Registrations over time</h3>
          <RegistrationChart data={data.chartData} />
        </div>
      )}

      {/* Watch funnel */}
      <div className="bg-pgd-purple rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Watch funnel</h3>
        <WatchFunnelChart data={funnelData} />
      </div>

      {/* Top Q&A questions */}
      {data.topQAs.length > 0 && (
        <div className="bg-pgd-purple rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Top Q&A questions</h3>
          <div className="space-y-2">
            {data.topQAs.map((qa, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-pgd-yellow text-xs font-bold mt-0.5 flex-shrink-0 w-5 text-right">{i + 1}.</span>
                <p className="text-white/70 text-sm flex-1">{qa.question}</p>
                <span className="text-white/30 text-xs flex-shrink-0">{qa.count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
