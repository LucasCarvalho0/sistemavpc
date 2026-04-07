'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Car, Lock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const [registration, setRegistration] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const [showConfirm, setShowConfirm] = useState<{ message: string } | null>(null)

  const handleLogin = async (e?: React.FormEvent, confirmShiftEnd: boolean = false) => {
    if (e) e.preventDefault()
    setIsLoading(true)
    setError('')
    setShowConfirm(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration, password, confirmShiftEnd }),
      })

      const data = await res.json()

      if (data.needsConfirmation) {
        setShowConfirm({ message: data.message })
        setIsLoading(false)
        return
      }

      if (!res.ok) {
        throw new Error(data.message || 'Erro ao entrar')
      }

      // Sucesso! Redireciona baseado no turno conforme regra 10
      if (data.user.shift === 1) {
        router.push('/dashboard-manha')
      } else {
        router.push('/dashboard-noite')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl text-center space-y-6 animate-scale-in">
             <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                <AlertCircle className="w-8 h-8 text-blue-400" />
             </div>
             <h2 className="text-xl font-black text-white uppercase tracking-tight">Aviso de Turno</h2>
             <p className="text-slate-400 text-sm leading-relaxed">{showConfirm.message}</p>
             <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleLogin(undefined, true)}
                  className="py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest transition-all"
                >
                  Sim, Continuar
                </button>
                <button 
                  onClick={() => setShowConfirm(null)}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold uppercase text-xs tracking-widest transition-all"
                >
                  Não, Voltar
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Background decor (Animated gradients) */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse-slow" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse-slow delay-700" />
      
      <div className="w-full max-w-[420px] relative z-10 animate-fade-in">
        {/* Logo/Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-glow-blue mb-4">
            <Car className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter text-center">
            Automotive <span className="text-blue-400">VPC</span>
          </h1>
          <p className="text-slate-500 text-sm mt-2 uppercase tracking-widest font-bold">Sistema de Produção</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-[2rem] pointer-events-none" />
          
          <form onSubmit={handleLogin} className="space-y-6 relative">
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs uppercase font-black tracking-widest text-slate-400 ml-1">Matrícula</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  type="text"
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-slate-950/80 border border-white/5 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all text-lg font-medium"
                  placeholder="Seu número ID"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase font-black tracking-widest text-slate-400 ml-1">Senha</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-slate-950/80 border border-white/5 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all text-lg font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full group py-4 px-6 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-glow-blue flex items-center justify-center gap-2",
                isLoading ? "cursor-not-allowed" : "hover:scale-[1.02] active:scale-95"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-slate-600 text-xs mt-8 uppercase tracking-widest font-bold">
          &copy; {new Date().getFullYear()} VPC Automotive Systems
        </p>
      </div>
    </div>
  )
}
