'use client'

import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { Trophy, Star, PartyPopper } from 'lucide-react'
import { playGoalSound, vibrate } from '@/lib/utils'

interface Props {
    currentGoal: number
    onClose: () => void
}

export default function GoalCelebration({ currentGoal, onClose }: Props) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        setVisible(true)
        playGoalSound()
        vibrate([200, 100, 200, 100, 500])

        const duration = 5 * 1000
        const animationEnd = Date.now() + duration
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now()

            if (timeLeft <= 0) {
                return clearInterval(interval)
            }

            const particleCount = 50 * (timeLeft / duration)
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
        }, 250)

        return () => clearInterval(interval)
    }, [])

    return (
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-700 ${visible ? 'bg-black/80 backdrop-blur-md' : 'bg-transparent pointer-events-none'}`}>
            <div className={`relative max-w-lg w-full p-8 text-center transition-all duration-700 transform ${visible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                {/* Floating Icons */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-6">
                    <Star className="w-8 h-8 text-yellow-400 animate-bounce fill-yellow-400" style={{ animationDelay: '0.1s' }} />
                    <Trophy className="w-16 h-16 text-yellow-400 animate-pulse drop-shadow-glow-yellow" />
                    <Star className="w-8 h-8 text-yellow-400 animate-bounce fill-yellow-400" style={{ animationDelay: '0.2s' }} />
                </div>

                <div className="bg-gradient-to-b from-green-500/20 to-emerald-600/20 border-2 border-green-500/30 rounded-[40px] p-10 shadow-glow-green overflow-hidden">
                    <PartyPopper className="w-12 h-12 text-green-400 mx-auto mb-6 animate-spin-slow" />
                    <h2 className="display font-black text-6xl md:text-7xl text-white uppercase tracking-tighter leading-none mb-4 animate-in zoom-in-50 duration-500">
                        🎉 META <br /> <span className="text-green-400">BATIDA!</span>
                    </h2>
                    <p className="text-emerald-100/70 text-lg font-medium mb-8">
                        Parabéns equipe! <br /> O objetivo de {currentGoal} carros foi alcançado.
                    </p>

                    <button
                        onClick={() => { setVisible(false); setTimeout(onClose, 700); }}
                        className="bg-green-500 hover:bg-green-400 text-slate-900 font-black text-xl px-12 py-5 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg uppercase tracking-widest"
                    >
                        Continuar Produção
                    </button>
                </div>
            </div>
        </div>
    )
}
