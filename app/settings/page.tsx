'use client'

import { useEffect, useState } from 'react'
import { Server, Clock, Target, Wifi, WifiOff, Settings } from 'lucide-react'
import { DAILY_GOAL, SHIFT_START, SHIFT_END, SHIFT_OVERTIME_END, SHIFT_RESET_TIME } from '@/types'

export default function SettingsPage() {
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  useEffect(() => {
    const url = typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
      : ''
    if (!url) return
    const ws = new WebSocket(url)
    ws.onopen = () => setWsStatus('connected')
    ws.onerror = () => setWsStatus('disconnected')
    ws.onclose = () => setWsStatus('disconnected')
    return () => ws.close()
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-2xl">
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
        <h3 className="display font-bold text-base text-white uppercase tracking-wide mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-green-400" />Meta de Produção
        </h3>
        <div className="flex items-center justify-between py-2">
          <span className="text-slate-400 text-sm">Meta diária</span>
          <span className="stat-num text-2xl text-green-400">{DAILY_GOAL} carros</span>
        </div>
      </div>

      {/* Shift */}
      <div className="card">
        <h3 className="display font-bold text-base text-white uppercase tracking-wide mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />Configuração de Turno
        </h3>
        <div className="space-y-2">
          {[
            { label: 'Início do turno',  val: SHIFT_START,        col: 'text-green-400' },
            { label: 'Fim do turno',     val: SHIFT_END,          col: 'text-red-400' },
            { label: 'Hora extra até',   val: SHIFT_OVERTIME_END, col: 'text-yellow-400' },
            { label: 'Reset automático', val: SHIFT_RESET_TIME,   col: 'text-slate-400' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <span className="text-slate-400 text-sm">{item.label}</span>
              <span className={`font-mono font-bold text-lg ${item.col}`}>{item.val}</span>
            </div>
          ))}
        </div>
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
