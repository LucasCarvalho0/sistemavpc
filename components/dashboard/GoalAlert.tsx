'use client'

import { useEffect, useState } from 'react'
import { Trophy, X } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { playSuccess } from '@/lib/utils'

export default function GoalAlert() {
  const { goalReached, setGoalReached } = useAppStore()
  const [visible, setVisible] = useState(false)
  const [particles] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      col: ['#22c55e', '#fbbf24', '#60a5fa', '#f472b6', '#a78bfa'][i % 5],
      dur: 1.2 + Math.random() * 1.8,
      delay: Math.random() * 0.5,
    })),
  )

  useEffect(() => {
    if (goalReached) {
      setVisible(true)
      playSuccess()
    }
  }, [goalReached])

  const close = () => {
    setVisible(false)
    setTimeout(() => setGoalReached(false), 300)
  }

  if (!goalReached) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', opacity: visible ? 1 : 0, transition: 'opacity 0.3s' }}
    >
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute w-2.5 h-2.5 rounded-sm"
          style={{
            left: `${p.x}%`,
            top: '-12px',
            background: p.col,
            animation: `confettiFall ${p.dur}s linear ${p.delay}s infinite`,
          }}
        />
      ))}

      <div className="goal-banner max-w-sm w-full">
        <button onClick={close} className="absolute top-3 right-3 text-green-900/60 hover:text-green-900">
          <X className="w-5 h-5" />
        </button>
        <Trophy className="w-16 h-16 mx-auto text-yellow-400 mb-3 drop-shadow-lg" />
        <p className="display font-extrabold text-5xl text-white mb-1">🎉 META BATIDA!</p>
        <p className="display text-2xl font-bold text-green-900 mb-3">100 CARROS MONTADOS!</p>
        <p className="text-green-800 font-medium">Excelente trabalho da equipe!</p>
        <button
          onClick={close}
          className="mt-5 px-6 py-2.5 bg-green-900/20 hover:bg-green-900/30 text-green-900 font-bold rounded-xl border border-green-900/30 transition-all"
        >
          Fechar
        </button>
      </div>

      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0)    rotate(0deg);   opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
