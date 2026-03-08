'use client'

import { useState } from 'react'
import { Users, Plus, Edit2, Trash2, Power, Check, X } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'

const MAX = 20

export default function EmployeesPage() {
  const { employees, createEmployee, updateEmployee, deleteEmployee } = useAppStore()
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const add = async () => {
    const n = newName.trim()
    if (!n) return
    if (employees.length >= MAX) { toast({ title: 'Limite atingido', description: `Máximo ${MAX}`, variant: 'destructive' }); return }
    setCreating(true)
    try {
      await createEmployee(n); setNewName(''); toast({ title: '✅ Funcionário adicionado', variant: 'success' })
    } catch (e) { toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' })
    } finally { setCreating(false) }
  }

  const save = async (id: string) => {
    const n = editName.trim(); if (!n) return
    try { await updateEmployee(id, { name: n }); setEditId(null); toast({ title: '✅ Atualizado', variant: 'success' })
    } catch (e) { toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' }) }
  }

  const toggle = async (id: string, active: boolean) => {
    try { await updateEmployee(id, { active: !active }); toast({ title: active ? '⚠️ Desativado' : '✅ Ativado', variant: active ? 'default' : 'success' })
    } catch (e) { toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' }) }
  }

  const del = async (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return
    try { await deleteEmployee(id); toast({ title: '🗑️ Excluído' })
    } catch (e) { toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' }) }
  }

  const active = employees.filter(e => e.active).length

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="display font-extrabold text-2xl md:text-3xl text-white uppercase tracking-tight">Gestão de Funcionários</h1>
        <p className="text-slate-400 text-sm mt-0.5">{employees.length}/{MAX} cadastrados · {active} ativos</p>
      </div>

      {/* Add */}
      <div className="card">
        <h3 className="display font-bold text-base text-white uppercase tracking-wide mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-green-400" />Novo Funcionário
        </h3>
        <div className="flex gap-3">
          <Input placeholder="Nome do funcionário" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} maxLength={50} disabled={employees.length >= MAX} />
          <Button onClick={add} disabled={!newName.trim() || creating || employees.length >= MAX} size="lg" className="shrink-0">
            {creating ? '...' : 'Adicionar'}
          </Button>
        </div>
        {employees.length >= MAX && <p className="text-amber-400 text-xs mt-2">Limite de {MAX} funcionários atingido</p>}
      </div>

      {/* List */}
      <div className="card">
        <h3 className="display font-bold text-base text-white uppercase tracking-wide mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />Funcionários
        </h3>
        {employees.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Nenhum funcionário cadastrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {employees.map(emp => (
              <div key={emp.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${emp.active ? 'bg-secondary/50 border-border' : 'bg-red-500/5 border-red-500/20 opacity-60'}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${emp.active ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-500'}`}>
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  {editId === emp.id ? (
                    <div className="flex gap-2">
                      <Input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(emp.id); if (e.key === 'Escape') setEditId(null) }} className="h-8 text-sm" autoFocus />
                      <button onClick={() => save(emp.id)} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div>
                      <p className={`font-medium truncate ${emp.active ? 'text-white' : 'text-slate-400'}`}>{emp.name}</p>
                      {!emp.active && <p className="text-xs text-red-400">Inativo</p>}
                    </div>
                  )}
                </div>
                {editId !== emp.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setEditId(emp.id); setEditName(emp.name) }} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => toggle(emp.id, emp.active)} className={`p-2 rounded-lg transition-all ${emp.active ? 'text-amber-400 hover:bg-amber-500/10' : 'text-green-400 hover:bg-green-500/10'}`}><Power className="w-4 h-4" /></button>
                    <button onClick={() => del(emp.id, emp.name)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
