'use client'

import { useEffect, useState } from 'react'
import { Search, Download, Filter, FileText } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form'
import { formatDate, formatTime } from '@/lib/utils'
import type { Production } from '@/types'

export default function HistoryPage() {
  const { employees, fetchEmployees } = useAppStore()
  const [productions, setProductions] = useState<Production[]>([])
  const [loading, setLoading] = useState(true)
  const [filterEmp, setFilterEmp] = useState('all')
  const [filterVin, setFilterVin] = useState('')
  const [reportMonth, setReportMonth] = useState(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filterEmp !== 'all') p.set('employeeId', filterEmp)
    if (filterVin.length >= 3) p.set('vin', filterVin)
    fetch(`/api/productions?${p}`)
      .then(r => r.json())
      .then(r => setProductions(r.data || []))
      .catch(e => {
        console.error(e)
        setProductions([])
      })
      .finally(() => setLoading(false))
  }, [filterEmp, filterVin])

  const exportCSV = (rows: Production[], filename: string) => {
    const h = ['VIN', 'Funcionário', 'Versão', 'Data', 'Hora']
    const csv = [h, ...rows.map(p => [p.vin, p.employee?.name ?? '', p.carVersion, formatDate(p.createdAt), formatTime(p.createdAt)])].map(r => r.join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename })
    a.click()
  }

  const monthlyReport = async () => {
    const [y, m] = reportMonth.split('-')
    const r = await fetch(`/api/reports/monthly?year=${y}&month=${m}`).then(r => r.json())
    exportCSV(r.data, `relatorio-${reportMonth}.csv`)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display font-extrabold text-2xl md:text-3xl text-white uppercase tracking-tight">Histórico de Produção</h1>
          <p className="text-slate-400 text-sm mt-0.5">{productions?.length || 0} registros</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCSV(productions, `producao-${new Date().toISOString().split('T')[0]}.csv`)} className="flex items-center gap-2">
          <Download className="w-4 h-4" /><span className="hidden sm:inline">CSV</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3 text-sm text-slate-300">
          <Filter className="w-4 h-4 text-slate-400" />Filtros
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input placeholder="Buscar por VIN..." value={filterVin} onChange={e => setFilterVin(e.target.value.toUpperCase())} className="pl-10 vin uppercase" maxLength={17} />
          </div>
          <Select value={filterEmp} onValueChange={setFilterEmp}>
            <SelectTrigger><SelectValue placeholder="Filtrar por funcionário" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os funcionários</SelectItem>
              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Monthly report */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Relatório Mensal</span>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <div className="space-y-1">
            <Label>Mês</Label>
            <Input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} min="2026-03" className="w-44" />
          </div>
          <Button variant="outline" onClick={monthlyReport} className="flex items-center gap-2 self-end">
            <Download className="w-4 h-4" />Baixar CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="text-center py-10 text-slate-500">Carregando...</div>
        ) : productions.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-border">
                  {['VIN', 'Funcionário', 'Versão', 'Data', 'Hora'].map(h => (
                    <th key={h} className={`text-left px-4 md:px-0 py-3 font-medium ${h === 'Versão' ? 'hidden sm:table-cell' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {productions.map(p => (
                  <tr key={p.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 md:px-0 py-3"><span className="vin text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-lg">{p.vin}</span></td>
                    <td className="px-4 md:px-0 py-3 text-sm text-white font-medium">{p.employee?.name ?? '—'}</td>
                    <td className="px-4 md:px-0 py-3 text-sm text-slate-400 hidden sm:table-cell">{p.carVersion}</td>
                    <td className="px-4 md:px-0 py-3 text-sm text-slate-400 font-mono">{formatDate(p.createdAt)}</td>
                    <td className="px-4 md:px-0 py-3 text-sm text-slate-400 font-mono">{formatTime(p.createdAt)}</td>
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
