'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  date: string
  registrations: number
}

interface Props {
  data: DataPoint[]
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-pgd-purple border border-white/10 rounded-lg px-3 py-2 text-xs">
      <p className="text-white/60 mb-1">{label}</p>
      <p className="text-pgd-yellow font-bold">{payload[0].value} registrations</p>
    </div>
  )
}

export default function RegistrationChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-white/30 text-sm">No data yet</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#fbba00" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#fbba00" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="date"
          tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="registrations"
          stroke="#fbba00"
          strokeWidth={2}
          fill="url(#regGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#fbba00', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
