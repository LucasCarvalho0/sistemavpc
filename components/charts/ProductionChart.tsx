'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { HourlyData } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl text-sm">
      <p className="text-slate-300 font-medium mb-1.5">{label}h</p>
      {payload.map((e: { color: string; name: string; value: number }, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: e.color }} />
          <span className="text-slate-400">{e.name}:</span>
          <span className="text-white font-bold font-mono">{e.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function ProductionChart({ data }: { data: HourlyData[] }) {
  return (
    <div className="card">
      <h3 className="display font-bold text-lg text-white mb-4 uppercase tracking-wide">
        Produtividade por Hora
      </h3>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
          Sem dados para exibir
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}h`} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
            <Bar dataKey="count" name="Por hora" fill="rgba(34,197,94,0.25)" stroke="#22c55e" strokeWidth={1} radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="accumulated" name="Acumulado" stroke="#60a5fa" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#60a5fa' }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
