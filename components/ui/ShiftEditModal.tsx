'use client'

import { useState } from 'react'
import { Clock, X, Check, Loader2 } from 'lucide-react'

interface Props {
    currentStart: string
    currentEnd: string
    onSave: (start: string, end: string) => Promise<void>
    onClose: () => void
}

export default function ShiftEditModal({ currentStart, currentEnd, onSave, onClose }: Props) {
    const [start, setStart] = useState(currentStart)
    const [end, setEnd] = useState(currentEnd)
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        try {
            await onSave(start, end)
            onClose()
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl animate-slide-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                            <Clock className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="display font-bold text-white text-lg uppercase tracking-wider">
                                Configurar Turno
                            </h3>
                            <p className="text-xs text-slate-500">Horários do dia atual</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-500 hover:text-white transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Inputs */}
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                            Início do Turno
                        </label>
                        <input
                            type="time"
                            value={start}
                            onChange={e => setStart(e.target.value)}
                            className="w-full h-14 px-4 text-2xl font-mono font-bold text-green-400 bg-slate-800 border border-slate-700 rounded-2xl focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                            Fim do Turno
                        </label>
                        <input
                            type="time"
                            value={end}
                            onChange={e => setEnd(e.target.value)}
                            className="w-full h-14 px-4 text-2xl font-mono font-bold text-red-400 bg-slate-800 border border-slate-700 rounded-2xl focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 transition-all"
                        />
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 h-12 rounded-2xl bg-slate-800 text-slate-400 hover:text-white font-bold uppercase tracking-wide text-sm transition-all hover:bg-slate-700"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 h-12 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-wide text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </div>
        </div>
    )
}
