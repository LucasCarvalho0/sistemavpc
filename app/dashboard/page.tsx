'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Car, Target, Clock, TrendingUp, RefreshCw, Edit2, Rocket, Trophy, Download } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import ProductionChart from '@/components/charts/ProductionChart'
import GoalCelebration from '@/components/ui/GoalCelebration'
import GoalEditModal from '@/components/ui/GoalEditModal'
import ShiftEditModal from '@/components/ui/ShiftEditModal'
import { formatTime, formatDate, cn, exportToCSV } from '@/lib/utils'
import { DAILY_GOAL, SHIFT_START, SHIFT_END } from '@/types'

export default function DashboardPage() {
  const {
    dashboardStats, fetchDashboardStats, goalReached, setGoalReached, updateGoal,
    shiftConfig, fetchShiftConfig, updateShiftConfig,
  } = useAppStore()
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [celebrationCount, setCelebrationCount] = useState(0)
  const [lastCelebrationTime, setLastCelebrationTime] = useState(0)

  useEffect(() => {
    fetchDashboardStats()
    fetchShiftConfig()
    const id = setInterval(fetchDashboardStats, 30_000)
    return () => clearInterval(id)
  }, [fetchDashboardStats, fetchShiftConfig])

  // Lógica de repetição da celebração: 3 vezes a cada 20 minutos
  useEffect(() => {
    const total = dashboardStats?.totalToday ?? 0
    const currentGoal = dashboardStats?.goal ?? DAILY_GOAL
    const goalHit = total >= currentGoal

    if (goalHit && celebrationCount < 2) {
      const now = Date.now()
      const tenMinutes = 10 * 60 * 1000

      if (lastCelebrationTime === 0 || (now - lastCelebrationTime >= tenMinutes)) {
        if (!goalReached) {
          setGoalReached(true)
          setCelebrationCount(prev => prev + 1)
          setLastCelebrationTime(now)
        }
      }
    }
  }, [dashboardStats?.totalToday, dashboardStats?.goal, celebrationCount, lastCelebrationTime, goalReached, setGoalReached])

  const total = dashboardStats?.totalToday ?? 0
  const currentGoal = dashboardStats?.goal ?? DAILY_GOAL
  const progress = Math.min((total / currentGoal) * 100, 100)
  const goalHit = total >= currentGoal
  const isAboveGoal = total > currentGoal

  const shiftStart = dashboardStats?.shiftStart ?? shiftConfig?.shiftStart ?? SHIFT_START
  const shiftEnd = dashboardStats?.shiftEnd ?? shiftConfig?.shiftEnd ?? SHIFT_END

  const handleDownload = () => {
    if (!dashboardStats?.recentProductions) return
    const data = dashboardStats.recentProductions.map(p => ({
      VIN: p.vin,
      Funcionario: p.employee?.name || '---',
      Versao: p.carVersion,
      Data: formatDate(p.createdAt),
      Hora: formatTime(p.createdAt)
    }))
    exportToCSV(data, `producao-${new Date().toISOString().split('T')[0]}.csv`, ['VIN', 'Funcionario', 'Versao', 'Data', 'Hora'])
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-fade-in relative">
      {goalReached && (
        <GoalCelebration
          currentGoal={currentGoal}
          onClose={() => setGoalReached(false)}
        />
      )}
      {showGoalModal && (
        <GoalEditModal
          currentGoal={currentGoal}
          onSave={updateGoal}
          onClose={() => setShowGoalModal(false)}
        />
      )}
      {showShiftModal && (
        <ShiftEditModal
          currentStart={shiftStart}
          currentEnd={shiftEnd}
          onSave={updateShiftConfig}
          onClose={() => setShowShiftModal(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display font-extrabold text-2xl md:text-3xl text-white uppercase tracking-tight">
            Painel de Produção
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">{formatDate(new Date())} · Turno ativo</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white rounded-xl border border-green-500/20 transition-all font-bold text-xs uppercase tracking-widest"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Baixar Dados</span>
          </button>
          <button onClick={fetchDashboardStats} className="p-2.5 bg-secondary hover:bg-accent rounded-xl border border-border text-slate-400 hover:text-white transition-all">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Main production card */}
        <div className={`col-span-2 card relative overflow-hidden ${goalHit ? 'border-green-500/50' : ''}`}>
          {goalHit && <div className="absolute inset-0 bg-green-500/5 animate-pulse-green" />}
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Car className="w-4 h-4" />
                <span>Produção do Turno</span>
              </div>
              <div className="flex gap-2">
                {isAboveGoal && (
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-black rounded-full border border-blue-500/30 uppercase tracking-wider flex items-center gap-1.5 shadow-glow-blue-sm animate-pulse-slow">
                    <Rocket className="w-3 h-3" />
                    +{total - currentGoal} ACIMA DA META
                  </span>
                )}
                {goalHit && !isAboveGoal && (
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 text-[10px] font-black rounded-full border border-green-500/30 uppercase tracking-wider">
                    🎉 Meta Batida!
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className={`stat-num text-6xl md:text-7xl ${goalHit ? (isAboveGoal ? 'text-blue-400' : 'text-green-400') : 'text-white'}`}>{total}</span>
              <span className="stat-num text-3xl text-slate-500 mb-2">/ {currentGoal}</span>
            </div>
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${isAboveGoal ? 'bg-blue-400' : (goalHit ? 'bg-green-400' : 'bg-green-500')}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-slate-500">
              <span className={goalHit ? (isAboveGoal ? 'text-blue-400' : 'text-green-400') : ''}>
                {progress.toFixed(0)}% da meta
              </span>
              <span>{Math.max(0, currentGoal - total)} restantes</span>
            </div>
          </div>
        </div>

        {/* Dynamic Goal Card */}
        <div className="card group cursor-pointer hover:border-blue-500/50 transition-all" onClick={() => setShowGoalModal(true)}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Target className="w-4 h-4 text-blue-400" />
              <span>Meta do Turno</span>
            </div>
            <Edit2 className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 transition-colors" />
          </div>
          <div className="flex items-end gap-2">
            <p className="stat-num text-4xl text-blue-400">{currentGoal}</p>
            <p className="text-xs text-slate-500 mb-1.5 uppercase font-bold tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Alterar</p>
          </div>
          <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">carros / período</p>
        </div>

        {/* Turno — agora editável */}
        <div className="card group cursor-pointer hover:border-purple-500/50 transition-all" onClick={() => setShowShiftModal(true)}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Turno</span>
            </div>
            <Edit2 className="w-3.5 h-3.5 text-slate-600 group-hover:text-purple-400 transition-colors" />
          </div>
          <p className="stat-num text-xl text-purple-400">{shiftStart}</p>
          <p className="text-xs text-slate-500">até {shiftEnd}</p>
          <p className="text-[10px] text-slate-600 mt-1 uppercase font-black tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Clique para alterar</p>
        </div>
      </div>

      {/* Production by Version & Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Car className="w-4 h-4 text-blue-400" />
            <h3 className="display font-bold text-lg text-white uppercase tracking-wide">Produção por Versão</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dashboardStats?.versionData?.map((v) => (
              <div key={v.version} className="card flex items-center justify-between border-l-4 border-l-blue-500 overflow-hidden group">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none mb-1">Versão</span>
                  <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{v.version}</span>
                </div>
                <div className="bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/20">
                  <span className="stat-num text-2xl text-blue-400">{v.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card border-yellow-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <h3 className="display font-bold text-lg text-white uppercase tracking-wide">Ranking do Turno</h3>
            </div>
            <Link href="/ranking" className="text-[10px] font-black uppercase text-slate-500 hover:text-yellow-400 transition-colors tracking-widest">Ver Tudo</Link>
          </div>
          <div className="space-y-2">
            {dashboardStats?.ranking?.length === 0 ? (
              <p className="text-center py-4 text-slate-500 text-sm italic">Inicie a produção para ver o ranking</p>
            ) : (
              dashboardStats?.ranking?.map((r, i) => (
                <div key={r.employee.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <span className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold uppercase",
                    i === 0 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                      i === 1 ? "bg-slate-300/20 text-slate-300 border border-slate-300/30" :
                        i === 2 ? "bg-orange-400/20 text-orange-400 border border-orange-400/30" : "text-slate-500"
                  )}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <span className="flex-1 text-sm text-white font-medium truncate">{r.employee.name}</span>
                  <span className="stat-num text-lg text-white">{r.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <ProductionChart data={dashboardStats?.hourlyData ?? []} />

      {/* Recent */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <h3 className="display font-bold text-lg text-white uppercase tracking-wide">Atividades Recentes</h3>
        </div>
        {!dashboardStats?.recentProductions?.length ? (
          <div className="text-center py-8 text-slate-500">
            <Car className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Nenhuma produção registrada ainda</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-4 md:px-0 py-2">VIN</th>
                  <th className="text-left px-4 md:px-0 py-2">Funcionário</th>
                  <th className="text-left px-4 md:px-0 py-2 hidden sm:table-cell">Versão</th>
                  <th className="text-left px-4 md:px-0 py-2">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {dashboardStats?.recentProductions?.slice(0, 10).map(p => (
                  <tr key={p.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 md:px-0 py-3">
                      <span className="vin text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-lg">{p.vin}</span>
                    </td>
                    <td className="px-4 md:px-0 py-3 text-sm text-white font-medium">{p.employee?.name ?? '—'}</td>
                    <td className="px-4 md:px-0 py-3 text-sm text-slate-400 hidden sm:table-cell">{p.carVersion}</td>
                    <td className="px-4 md:px-0 py-3 text-sm text-slate-400 font-mono">{formatTime(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
