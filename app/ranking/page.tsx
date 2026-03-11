'use client'

import { useEffect, useState, useRef } from 'react'
import { Trophy, Medal, RefreshCw, TrendingUp, Download, Calendar } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { cn } from '@/lib/utils'
import type { QuarterlyEntry } from '@/types'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const MEDAL = [
  { bg: 'rank-gold', num: 'text-yellow-400', emoji: '🥇' },
  { bg: 'rank-silver', num: 'text-slate-300', emoji: '🥈' },
  { bg: 'rank-bronze', num: 'text-orange-400', emoji: '🥉' },
]

export default function RankingPage() {
  const { ranking, fetchRanking } = useAppStore()
  const [monthly, setMonthly] = useState<QuarterlyEntry[]>([])
  const [quarterly, setQuarterly] = useState<QuarterlyEntry[]>([])
  const [loadingM, setLoadingM] = useState(true)
  const [loadingQ, setLoadingQ] = useState(true)
  const pdfRef = useRef<HTMLDivElement>(null)

  const fetchMonthly = () => {
    setLoadingM(true)
    fetch('/api/stats/monthly')
      .then(r => r.json())
      .then(r => setMonthly(r.data || []))
      .catch(e => {
        console.error(e)
        setMonthly([])
      })
      .finally(() => setLoadingM(false))
  }

  useEffect(() => {
    fetchRanking()
    fetchMonthly()
    fetch('/api/stats/quarterly')
      .then(r => r.json())
      .then(r => setQuarterly(r.data || []))
      .catch(e => {
        console.error(e)
        setQuarterly([])
      })
      .finally(() => setLoadingQ(false))

    const id = setInterval(() => {
      fetchRanking()
      fetchMonthly()
    }, 10_000)
    return () => clearInterval(id)
  }, [fetchRanking, fetchMonthly])

  const handleExportPDF = async () => {
    if (!pdfRef.current) return

    try {
      const element = pdfRef.current
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a' // match slate-950
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      })

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2)
      pdf.save(`ranking-mensal-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar PDF. Tente novamente.')
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in" ref={pdfRef}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display font-extrabold text-2xl md:text-3xl text-white uppercase tracking-tight">Ranking do Turno</h1>
          <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            Atualização em tempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl border border-green-500/30 transition-all font-bold text-sm shadow-lg shadow-green-900/20"
          >
            <Download className="w-4 h-4" />
            <span>PDF</span>
          </button>
          <button onClick={fetchRanking} className="p-2.5 bg-secondary hover:bg-accent rounded-xl border border-border text-slate-400 hover:text-white transition-all">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Podium */}
      {ranking.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 items-end">
          <div className="text-center card rank-silver">
            <p className="text-3xl mb-1">🥈</p>
            <p className="font-bold text-white text-sm truncate">{ranking[1].employee.name}</p>
            <p className="stat-num text-3xl text-slate-300">{ranking[1].count}</p>
            <p className="text-xs text-slate-500">carros</p>
          </div>
          <div className="text-center card rank-gold transform scale-105">
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center mx-auto mb-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-4xl mb-1">🥇</p>
            <p className="font-bold text-white truncate">{ranking[0].employee.name}</p>
            <p className="stat-num text-4xl text-yellow-400">{ranking[0].count}</p>
            <p className="text-xs text-slate-500">carros</p>
          </div>
          <div className="text-center card rank-bronze">
            <p className="text-3xl mb-1">🥉</p>
            <p className="font-bold text-white text-sm truncate">{ranking[2].employee.name}</p>
            <p className="stat-num text-3xl text-orange-400">{ranking[2].count}</p>
            <p className="text-xs text-slate-500">carros</p>
          </div>
        </div>
      )}

      {/* Full table */}
      <div className="card">
        <h3 className="display font-bold text-lg text-white uppercase tracking-wide mb-4 flex items-center gap-2">
          <Medal className="w-5 h-5 text-yellow-400" />Classificação Completa
        </h3>
        {ranking.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Nenhum registro ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ranking.map((entry, i) => {
              const m = MEDAL[i] ?? null
              return (
                <div key={entry.employee.id} className={cn('flex items-center gap-4 p-3 rounded-xl', m ? m.bg : 'bg-secondary/50 border border-transparent')}>
                  <div className={cn('w-8 h-8 flex items-center justify-center shrink-0 stat-num text-xl', m ? m.num : 'text-slate-500')}>
                    {i < 3 ? m!.emoji : `#${i + 1}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{entry.employee.name}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('stat-num text-3xl', m ? m.num : 'text-white')}>{entry.count}</p>
                    <p className="text-xs text-slate-500">carros</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Monthly Ranking */}
      <div className="card border-green-500/20">
        <h3 className="display font-bold text-lg text-white uppercase tracking-wide mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-400" />Ranking Mensal
          </div>
          {!loadingM && (
            <span className="text-xs font-normal text-slate-500 animate-pulse">Este mês</span>
          )}
        </h3>
        {loadingM ? (
          <p className="text-slate-500 text-sm">Carregando...</p>
        ) : monthly.length === 0 ? (
          <div className="text-center py-4 text-slate-500 italic">Sem registros no mês atual</div>
        ) : (
          <div className="space-y-4">
            {/* Champion of the Month */}
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Campeão Mensal
                  </p>
                  <p className="text-xl font-bold text-white">{monthly[0].employee.name}</p>
                </div>
                <div className="text-right">
                  <p className="stat-num text-4xl text-green-400">{monthly[0].total}</p>
                  <p className="text-[10px] text-slate-500 -mt-1 uppercase">Total Acumulado</p>
                </div>
              </div>
            </div>

            {/* Others in list */}
            <div className="space-y-2">
              {monthly.map((e, i) => (
                <div key={i} className="flex items-center gap-4 py-3 border-b border-border/30 last:border-0 hover:bg-white/5 transition-colors px-2 rounded-lg">
                  <span className={cn("text-sm font-bold w-6", i === 0 ? "text-green-400" : "text-slate-500")}>#{i + 1}</span>
                  <span className="flex-1 text-white font-semibold">{e.employee.name}</span>
                  <div className="flex flex-col items-end">
                    <span className="stat-num text-2xl text-white">{e.total}</span>
                    <div className="w-24 h-1.5 bg-secondary rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${(e.total / monthly[0].total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quarterly */}
      <div className="card">
        <h3 className="display font-bold text-lg text-white uppercase tracking-wide mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />Evolução Trimestral
        </h3>
        {loadingQ ? (
          <p className="text-slate-500 text-sm">Carregando...</p>
        ) : quarterly.length === 0 ? (
          <p className="text-slate-500 text-sm">Sem dados disponíveis</p>
        ) : (
          <>
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl mb-4 text-center">
              <p className="text-xs text-blue-500 font-bold uppercase tracking-wider mb-1">Soma dos últimos 90 dias</p>
            </div>
            <div className="space-y-4">
              {quarterly.map((e, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <span className="text-slate-500 text-xs w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white font-medium text-sm">{e.employee.name}</span>
                      <span className="stat-num text-lg text-blue-400">{e.total}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-1000"
                        style={{ width: `${(e.total / (quarterly[0]?.total || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
