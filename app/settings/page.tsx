'use client'

import { useEffect, useState } from 'react'
import { Server, Clock, Target, Wifi, WifiOff, Settings, Edit2, Loader2, Check } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import GoalEditModal from '@/components/ui/GoalEditModal'
import ShiftEditModal from '@/components/ui/ShiftEditModal'
import { DAILY_GOAL, SHIFT_START, SHIFT_END, SHIFT_OVERTIME_END, SHIFT_RESET_TIME } from '@/types'

export default function SettingsPage() {
  const { dashboardStats, fetchDashboardStats, updateGoal, shiftConfig, fetchShiftConfig, updateShiftConfig } = useAppStore()
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [goalSaved, setGoalSaved] = useState(false)
  const [shiftSaved, setShiftSaved] = useState(false)

  useEffect(() => {
    fetchDashboardStats()
    fetchShiftConfig()
  }, [fetchDashboardStats, fetchShiftConfig])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setWsStatus('connecting')
    const es = new EventSource('/api/events')

    es.onmessage = (e) => {
      try {
        const { type } = JSON.parse(e.data)
        if (type === 'connected') setWsStatus('connected')
      } catch { /* ignora */ }
    }

    es.onerror = () => setWsStatus('disconnected')

    return () => es.close()
  }, [])

  const currentGoal = dashboardStats?.goal ?? DAILY_GOAL
  const shiftStart = shiftConfig?.shiftStart ?? SHIFT_START
  const shiftEnd = shiftConfig?.shiftEnd ?? SHIFT_END

  const handleGoalSave = async (newGoal: number) => {
    await updateGoal(newGoal)
    setShowGoalModal(false)
    setGoalSaved(true)
    setTimeout(() => setGoalSaved(false), 2000)
  }

  const handleShiftSave = async (start: string, end: string) => {
    await updateShiftConfig(start, end)
    setShowShiftModal(false)
    setShiftSaved(true)
    setTimeout(() => setShiftSaved(false), 2000)
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-2xl">
      {showGoalModal && (
        <GoalEditModal
          currentGoal={currentGoal}
          onSave={handleGoalSave}
          onClose={() => setShowGoalModal(false)}
        />
      )}
      {showShiftModal && (
        <ShiftEditModal
          currentStart={shiftStart}
          currentEnd={shiftEnd}
          onSave={handleShiftSave}
          onClose={() => setShowShiftModal(false)}
        />
      )}

      <div>
        <h1 className="display font-extrabold text-2xl md:text-3xl text-white uppercase tracking-tight">Configurações</h1>
        <p className="text-slate-400 text-sm mt-0.5">Sistema de Produção Automotiva</p>
      </div>

      {/* Connection */}
      <div className="card">
        <h3 className="display font-bold text-base text-white uppercase tracking-wide mb-4 flex items-center gap-2">
          <Server className="w-4 h-4 text-slate-400" />Status da Conexão
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <div>
              <p className="text-sm text-white font-medium">API Next.js</p>
              <p className="text-xs text-slate-500 font-mono">/api/*</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />Online
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-white font-medium">WebSocket (Tempo Real)</p>
              <p className="text-xs text-slate-500 font-mono">/ws</p>
            </div>
            {wsStatus === 'connected' ? (
              <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
                <Wifi className="w-3 h-3" />Conectado
              </span>
            ) : wsStatus === 'connecting' ? (
              <span className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />Conectando
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                <WifiOff className="w-3 h-3" />Desconectado
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Goal */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="display font-bold text-base text-white uppercase tracking-wide flex items-center gap-2">
            <Target className="w-4 h-4 text-green-400" />Meta de Produção
          </h3>
          {goalSaved && (
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
              <Check className="w-3 h-3" />Salvo!
            </span>
          )}
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <span className="text-slate-400 text-sm">Meta diária</span>
            <p className="text-xs text-slate-600 mt-0.5">Número de carros por turno</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="stat-num text-3xl text-green-400">{currentGoal}</span>
            <button
              onClick={() => setShowGoalModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider rounded-xl border border-green-500/20 transition-all"
            >
              <Edit2 className="w-3 h-3" />
              Editar
            </button>
          </div>
        </div>
      </div>

      {/* Shift */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="display font-bold text-base text-white uppercase tracking-wide flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />Configuração de Turno
          </h3>
          {shiftSaved && (
            <span className="flex items-center gap-1 text-xs text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
              <Check className="w-3 h-3" />Salvo!
            </span>
          )}
        </div>
        <div className="space-y-2 mb-4">
          {[
            { label: 'Início do turno', val: shiftStart, col: 'text-green-400', editable: true },
            { label: 'Fim do turno', val: shiftEnd, col: 'text-red-400', editable: true },
            { label: 'Hora extra até', val: SHIFT_OVERTIME_END, col: 'text-yellow-400', editable: false },
            { label: 'Reset automático', val: SHIFT_RESET_TIME, col: 'text-slate-400', editable: false },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <span className="text-slate-400 text-sm">{item.label}</span>
              <span className={`font-mono font-bold text-lg ${item.col}`}>{item.val}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowShiftModal(true)}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-sm font-bold uppercase tracking-wider border border-purple-500/20 transition-all"
        >
          <Edit2 className="w-4 h-4" />
          Alterar Horários do Dia
        </button>
      </div>

      {/* PWA */}
      <div className="card">
        <h3 className="display font-bold text-base text-white uppercase tracking-wide mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4 text-slate-400" />Instalar Aplicativo (PWA)
        </h3>
        <p className="text-slate-400 text-sm mb-3">Instale como app no celular ou tablet para uso offline.</p>
        <div className="text-sm text-slate-500 space-y-1">
          <p>• Android: Menu ⋮ → "Adicionar à tela inicial"</p>
          <p>• iPhone: Compartilhar  → "Adicionar à Tela de Início"</p>
          <p>• Chrome Desktop: ícone de instalação na barra de endereço</p>
        </div>
      </div>

      <p className="text-center text-xs text-slate-700 font-mono">Sistema de Produção Automotiva v1.0.0 · Next.js 14</p>
    </div>
  )
}
