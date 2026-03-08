'use client'

import { useState } from 'react'
import { Target, X, ChevronRight, Save } from 'lucide-react'

interface Props {
    currentGoal: number
    onSave: (newGoal: number) => Promise<void>
    onClose: () => void
}

export default function GoalEditModal({ currentGoal, onSave, onClose }: Props) {
    const [goal, setGoal] = useState(currentGoal)
    const [loading, setLoading] = useState(false)

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await onSave(goal)
            onClose()
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-card border border-border rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-xl">
                            <Target className="w-6 h-6 text-blue-400" />
                        </div>
                        <h3 className="display font-bold text-xl text-white uppercase tracking-tight">Alterar Meta</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-8 space-y-8">
                    <div className="space-y-4">
                        <label className="text-sm font-semibold text-slate-400 uppercase tracking-widest block text-center">
                            Meta de Produção (Turno)
                        </label>
                        <div className="flex items-center justify-center gap-6">
                            <button
                                type="button"
                                onClick={() => setGoal(Math.max(1, goal - 10))}
                                className="w-12 h-12 flex items-center justify-center bg-secondary hover:bg-white/10 rounded-2xl text-2xl font-bold text-slate-300 transition-all active:scale-90"
                            >
                                -
                            </button>
                            <input
                                type="number"
                                value={goal}
                                onChange={(e) => setGoal(parseInt(e.target.value) || 1)}
                                className="w-32 bg-transparent text-center stat-num text-7xl text-white focus:outline-none focus:text-blue-400 transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => setGoal(goal + 10)}
                                className="w-12 h-12 flex items-center justify-center bg-secondary hover:bg-white/10 rounded-2xl text-2xl font-bold text-slate-300 transition-all active:scale-90"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="py-4 bg-secondary hover:bg-white/10 text-slate-400 font-bold rounded-2xl transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-glow-blue flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    <span>Salvar</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
