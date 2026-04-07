'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Car, Target, Clock, TrendingUp, RefreshCw, Edit2, Rocket, Trophy, Download, LogOut, Plus } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import ProductionChart from '@/components/charts/ProductionChart'
import GoalCelebration from '@/components/ui/GoalCelebration'
import GoalEditModal from '@/components/ui/GoalEditModal'
import ShiftEditModal from '@/components/ui/ShiftEditModal'
import { formatTime, formatDate, cn, exportToExcel } from '@/lib/utils'
import { exportToPDF } from '@/lib/exportUtils'
import { DAILY_GOAL, SHIFT_START, SHIFT_END } from '@/types'
import { useRouter } from 'next/navigation'

interface DashboardViewProps {
  shift: 1 | 2
  title: string
}

export default function DashboardView({ shift, title }: DashboardViewProps) {
  const {
    dashboardStats, fetchDashboardStats, goalReached, setGoalReached, updateGoal,
    shiftConfig, fetchShiftConfig, updateShiftConfig,
  } = useAppStore()
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [celebrationCount, setCelebrationCount] = useState(0)
  const [lastCelebrationTime, setLastCelebrationTime] = useState(0)
  const [user, setUser] = useState<{ name: string; shift: number; role: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.user?.shift !== shift) {
           // Segurança: se o turno logado não for o da página, redireciona
           router.push(data.user?.shift === 1 ? '/dashboard-manha' : '/dashboard-noite')
        }
        setUser(data.user)
      })
  }, [shift, router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  useEffect(() => {
    fetchDashboardStats()
    fetchShiftConfig()
    const id = setInterval(fetchDashboardStats, 30_000)
    return () => clearInterval(id)
  }, [fetchDashboardStats, fetchShiftConfig])

  const total = dashboardStats?.totalToday ?? 0
  const currentGoal = dashboardStats?.goal ?? DAILY_GOAL
  const progress = Math.min((total / currentGoal) * 100, 100)
  const goalHit = total >= currentGoal
  const isAboveGoal = total > currentGoal

  const shiftStart = dashboardStats?.shiftStart ?? shiftConfig?.shiftStart ?? SHIFT_START
  const shiftEnd = dashboardStats?.shiftEnd ?? shiftConfig?.shiftEnd ?? SHIFT_END

  const handleDownload = async () => {
    try {
      const sDate = shiftConfig?.shiftDate || new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/productions?startDate=${sDate}&endDate=${sDate}`)
      const r = await res.json()
      const allProductions: any[] = r.data || []

      if (allProductions.length === 0) {
        alert('Nenhuma produção encontrada para este turno.')
        return
      }

      const isLeader = user?.role === 'LIDER'
      if (isLeader) {
        const data = allProductions.map(p => ({
          VIN: p.vin,
          Funcionario: p.employee?.name || '---',
          Versao: p.carVersion,
          Data: formatDate(p.createdAt),
          Hora: formatTime(p.createdAt)
        }))
        exportToExcel(data, `producao-${sDate}.xlsx`, ['VIN', 'Funcionario', 'Versao', 'Data', 'Hora'])
      } else {
        exportToPDF(allProductions, `relatorio-producao-${sDate}.pdf`)
      }
    } catch (e) {
      console.error('Erro ao baixar dados:', e)
      alert('Erro ao carregar dados para exportação.')
    }
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="display font-extrabold text-2xl md:text-3xl text-white uppercase tracking-tight">
            {title}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
                "px-2 py-0.5 text-[10px] font-black rounded-md border uppercase tracking-widest",
                shift === 1 ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
            )}>
              {user?.name || '...'}
            </span>
            <span className="text-slate-500 text-xs tracking-tight">
              {formatDate(new Date())} · {shift === 1 ? `Turno Manhã (${shiftStart} - ${shiftEnd})` : `Turno Noite (${shiftStart} - ${shiftEnd})`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/employees" className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl border border-blue-500/20 transition-all font-bold text-xs uppercase tracking-widest">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Incluir Funcionários</span>
          </Link>
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white rounded-xl border border-green-500/20 transition-all font-bold text-xs uppercase tracking-widest"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          
          <button 
            onClick={handleLogout} 
            className="p-2.5 bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/20 text-red-400 hover:text-red-500 transition-all shadow-sm"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`col-span-2 card relative overflow-hidden ${goalHit ? 'border-green-500/50' : ''}`}>
          {goalHit && <div className="absolute inset-0 bg-green-500/5 animate-pulse-green" />}
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Car className="w-4 h-4" />
                <span>Registros de Hoje</span>
              </div>
              {isAboveGoal && (
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-black rounded-full border border-blue-500/30 uppercase tracking-wider flex items-center gap-1.5 shadow-glow-blue-sm animate-pulse-slow">
                  <Rocket className="w-3 h-3" />
                  +{total - currentGoal} ACIMA
                </span>
              )}
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className={`stat-num text-6xl md:text-7xl ${goalHit ? 'text-green-400' : 'text-white'}`}>{total}</span>
              <span className="stat-num text-3xl text-slate-500 mb-2">/ {currentGoal}</span>
            </div>
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700", goalHit ? "bg-green-400" : "bg-blue-500")}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="card">
           <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Target className="w-4 h-4 text-blue-400" />
              <span>Meta Atribuída</span>
            </div>
            <p className="stat-num text-4xl text-blue-400">{currentGoal}</p>
            <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">carros / turno</p>
        </div>

        <div className="card">
           <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Janela do Turno</span>
            </div>
            <p className="stat-num text-xl text-purple-400">{shiftStart} - {shiftEnd}</p>
            <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">{shift === 1 ? 'Matutino' : 'Vespertino/Noturno'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <ProductionChart data={dashboardStats?.hourlyData ?? []} />
        </div>
        
        <div className="card border-yellow-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <h3 className="display font-bold text-lg text-white uppercase tracking-wide">Ranking</h3>
            </div>
          </div>
          <div className="space-y-2">
            {dashboardStats?.ranking?.map((r, i) => (
              <div key={r.employee.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                <span className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold uppercase bg-slate-800 text-slate-400">
                  {i + 1}º
                </span>
                <span className="flex-1 text-sm text-white font-medium truncate">{r.employee.name}</span>
                <span className="stat-num text-lg text-white">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <h3 className="display font-bold text-lg text-white uppercase tracking-wide">Últimos Carros Bipados</h3>
        </div>
        {!dashboardStats?.recentProductions?.length ? (
          <div className="text-center py-8 text-slate-500 italic">Nenhum registro ainda</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-slate-500 uppercase text-left">
                  <th className="py-2">VIN</th>
                  <th className="py-2">Funcionário</th>
                  <th className="py-2">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {dashboardStats.recentProductions.slice(0, 10).map(p => (
                  <tr key={p.id} className="hover:bg-white/3">
                    <td className="py-3"><span className="vin text-[10px] text-blue-400 bg-blue-500/10 px-2 py-1 rounded">{p.vin}</span></td>
                    <td className="py-3 text-sm text-white">{p.employee?.name}</td>
                    <td className="py-3 text-sm text-slate-400">{formatTime(p.createdAt)}</td>
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
