'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ScanLine, Save, CheckCircle, AlertCircle, Loader2, Car, Ban } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import VINScanner from '@/components/scanner/VINScanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form'
import { toast } from '@/components/ui/toaster'
import { playSuccess, vibrate } from '@/lib/utils'
import { CAR_VERSIONS } from '@/types'

const schema = z.object({
  employeeId: z.string().min(1, 'Selecione um funcionário'),
  carVersion: z.string().min(1, 'Selecione a versão'),
  vin: z
    .string()
    .length(17, 'VIN deve ter exatamente 17 caracteres')
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/i, 'VIN inválido — sem I, O ou Q'),
})
type FormData = z.infer<typeof schema>

interface VinConflict {
  employeeName: string
  time: string
}

export default function RegisterPage() {
  const { employees, addProduction } = useAppStore()
  const [showScanner, setShowScanner] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lastVin, setLastVin] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [vinConflict, setVinConflict] = useState<VinConflict | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const active = employees.filter(e => e.active)

  const { register, handleSubmit, setValue, watch, reset, setError, clearErrors, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  const vin = watch('vin', '')
  const vinLen = vin?.length ?? 0

  // Verificação em tempo real do VIN — sem I, O, Q, 17 chars
  const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/i

  const checkVin = useCallback(async (rawVin: string) => {
    const v = rawVin.toUpperCase().trim()
    if (v.length !== 17 || !VIN_PATTERN.test(v)) {
      setVinConflict(null)
      return
    }
    setChecking(true)
    try {
      const res = await fetch(`/api/productions?vin=${encodeURIComponent(v)}`)
      const data = await res.json()
      const productions: any[] = data.data ?? []
      if (productions.length > 0) {
        const first = productions[0]
        const employeeName = first.employee?.name ?? 'Funcionário desconhecido'
        const time = new Date(first.createdAt).toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        })
        setVinConflict({ employeeName, time })
        setError('vin', { type: 'manual', message: `VIN já registrado por ${employeeName} em ${time}` })
      } else {
        setVinConflict(null)
        clearErrors('vin')
      }
    } catch {
      setVinConflict(null)
    } finally {
      setChecking(false)
    }
  }, [setError, clearErrors])

  // Debounce ao digitar
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setVinConflict(null)
    if (vinLen === 17) {
      debounceRef.current = setTimeout(() => checkVin(vin), 400)
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [vin, vinLen, checkVin])

  const onScan = (v: string) => {
    setValue('vin', v, { shouldValidate: true })
    setShowScanner(false)
    toast({ title: '✅ VIN Escaneado', description: v, variant: 'success' })
    // Verificar imediatamente ao escanear
    checkVin(v)
  }

  const onSubmit = async (data: FormData) => {
    // Bloquear envio se VIN já registrado
    if (vinConflict) {
      toast({
        title: '🚫 VIN já registrado!',
        description: `Este chassi já foi processado por ${vinConflict.employeeName}`,
        variant: 'destructive'
      })
      return
    }
    setSubmitting(true)
    try {
      await addProduction({ vin: data.vin.toUpperCase(), carVersion: data.carVersion, employeeId: data.employeeId })
      playSuccess()
      vibrate([100, 50, 200])
      setLastVin(data.vin.toUpperCase())
      setVinConflict(null)
      reset()
      toast({ title: '🚗 Produção Registrada!', description: `VIN: ${data.vin.toUpperCase()}`, variant: 'success' })
    } catch (err: any) {
      const msg = (err as Error).message
      // Mostrar erro no campo se for conflito de VIN
      if (msg.toLowerCase().includes('vin') || msg.toLowerCase().includes('registrado')) {
        setError('vin', { type: 'manual', message: msg })
      }
      toast({ title: 'Erro ao salvar', description: msg, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const vinBlocked = !!vinConflict
  const vinOk = vinLen === 17 && !errors.vin && !vinConflict && !checking

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 md:p-8 flex flex-col items-center justify-center animate-fade-in">
      {showScanner && <VINScanner onScan={onScan} onClose={() => setShowScanner(false)} />}

      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4 shadow-glow-blue animate-pulse-slow">
            <Car className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="display font-black text-3xl md:text-4xl text-white uppercase tracking-tighter leading-none mb-2">Registrar Montagem</h1>
          <p className="text-slate-400 font-medium">Controle de qualidade e montagem de mídia</p>
        </div>

        {lastVin && (
          <div className="mb-8 p-5 bg-green-500/10 border border-green-400/30 rounded-2xl flex items-center justify-between shadow-glow-green animate-slide-up">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-green-400 font-bold uppercase tracking-widest text-[10px]">Último Registro Sucesso</p>
                <p className="vin text-green-100 font-mono text-lg">{lastVin}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-green-500/20 mx-2" />
            <div className="text-right">
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Horário</p>
              <p className="text-white font-mono text-sm">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employee */}
            <div className="space-y-3">
              <Label className="uppercase tracking-widest text-[10px] font-bold text-slate-500 ml-1">Funcionário Responsável</Label>
              <Select onValueChange={v => setValue('employeeId', v, { shouldValidate: true })}>
                <SelectTrigger className={`h-14 rounded-2xl bg-slate-900/50 border-slate-800 transition-all hover:border-slate-700 focus:ring-blue-500/20 ${errors.employeeId ? 'border-red-500/50' : ''}`}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {active.length === 0
                    ? <div className="p-4 text-sm text-slate-400 text-center italic">Carregando funcionários...</div>
                    : active.map(e => <SelectItem key={e.id} value={e.id} className="focus:bg-blue-500/10 focus:text-blue-400 cursor-pointer">{e.name}</SelectItem>)
                  }
                </SelectContent>
              </Select>
              {errors.employeeId && <p className="text-red-400 text-[10px] font-bold uppercase flex items-center gap-1.5 ml-1"><AlertCircle className="w-3 h-3" />{errors.employeeId.message}</p>}
            </div>

            {/* Version */}
            <div className="space-y-3">
              <Label className="uppercase tracking-widest text-[10px] font-bold text-slate-500 ml-1">Versão do Veículo</Label>
              <Select onValueChange={v => setValue('carVersion', v, { shouldValidate: true })}>
                <SelectTrigger className={`h-14 rounded-2xl bg-slate-900/50 border-slate-800 transition-all hover:border-slate-700 focus:ring-blue-500/20 ${errors.carVersion ? 'border-red-500/50' : ''}`}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {CAR_VERSIONS.map(v => (
                    <SelectItem key={v} value={v} className="focus:bg-blue-500/10 focus:text-blue-400 cursor-pointer">
                      <span className="flex items-center gap-2">{v}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.carVersion && <p className="text-red-400 text-[10px] font-bold uppercase flex items-center gap-1.5 ml-1"><AlertCircle className="w-3 h-3" />{errors.carVersion.message}</p>}
            </div>
          </div>

          {/* VIN */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between ml-1">
              <Label className="uppercase tracking-widest text-[10px] font-bold text-slate-500">Número do Chassi (VIN)</Label>
              <span className={`text-[10px] font-bold font-mono tracking-widest ${vinOk ? 'text-green-400' : vinBlocked ? 'text-red-400' : 'text-slate-600'}`}>
                {vinLen} <span className="opacity-40">/</span> 17
              </span>
            </div>
            <div className="relative group">
              <Input
                {...register('vin')}
                placeholder="DIGITE OU ESCANEIE O VIN"
                maxLength={17}
                className={`h-16 text-xl md:text-2xl font-mono uppercase tracking-[0.2em] rounded-2xl bg-slate-900/50 border-slate-800 transition-all group-hover:border-slate-700 focus:ring-4 pr-14
                  ${vinBlocked
                    ? 'border-red-500/70 bg-red-500/[0.04] focus:ring-red-500/10'
                    : vinOk
                      ? 'border-green-500/50 bg-green-500/[0.02] focus:ring-green-500/10'
                      : errors.vin
                        ? 'border-red-500/50 bg-red-500/[0.02] focus:ring-red-500/10'
                        : 'focus:ring-blue-500/10'
                  }`}
                onChange={e => setValue('vin', e.target.value.toUpperCase(), { shouldValidate: true })}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {checking ? (
                  <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                ) : vinBlocked ? (
                  <Ban className="w-6 h-6 text-red-500 animate-in zoom-in duration-300" />
                ) : vinOk ? (
                  <CheckCircle className="w-6 h-6 text-green-400 animate-in zoom-in duration-300" />
                ) : (
                  <ScanLine className={`w-6 h-6 text-slate-700 transition-colors ${vinLen > 0 ? 'text-blue-500/50' : ''}`} />
                )}
              </div>
            </div>

            {/* Erro de VIN duplicado — bem destacado */}
            {vinBlocked && vinConflict && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/40 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                <Ban className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-black uppercase text-xs tracking-widest">VIN já registrado!</p>
                  <p className="text-red-300 text-sm mt-0.5">
                    Este chassi foi processado por <strong>{vinConflict.employeeName}</strong> em {vinConflict.time}.
                    Não é possível registrar novamente.
                  </p>
                </div>
              </div>
            )}

            {/* Erro de formato */}
            {errors.vin && !vinBlocked && (
              <p className="text-red-400 text-[10px] font-bold uppercase flex items-center gap-1.5 ml-1">
                <AlertCircle className="w-3 h-3" />{errors.vin.message}
              </p>
            )}

            {/* Character boxes */}
            <div className="flex justify-between gap-1.5 mt-2">
              {Array.from({ length: 17 }, (_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-10 flex items-center justify-center rounded-lg text-sm font-mono font-bold border transition-all duration-300 ${i < vinLen
                      ? vinBlocked
                        ? 'bg-red-500/20 border-red-500/40 text-red-300 scale-110 z-10'
                        : 'bg-blue-500/20 border-blue-500/40 text-blue-300 shadow-glow-blue-sm scale-110 z-10'
                      : 'bg-slate-900 border-slate-800 text-slate-700'
                    }`}
                >
                  {vin?.[i] ?? ''}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-6">
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="group relative h-16 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-px font-bold transition-all hover:scale-[1.02] hover:shadow-glow-blue active:scale-95"
            >
              <div className="flex h-full w-full items-center justify-center gap-3 rounded-[15px] bg-slate-950/20 transition-colors group-hover:bg-slate-950/10">
                <ScanLine className="w-7 h-7 text-white" />
                <span className="text-xl text-white uppercase tracking-wider">Scanner VIN</span>
              </div>
            </button>

            <Button
              type="submit"
              size="xl"
              disabled={submitting || vinBlocked || checking}
              className={`h-20 w-full rounded-2xl text-xl uppercase tracking-[0.15em] font-black transition-all hover:scale-[1.01] active:scale-95 ${vinBlocked
                  ? 'bg-red-900/50 text-red-400 cursor-not-allowed border border-red-500/30'
                  : vinOk
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-glow-green'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
            >
              {submitting ? (
                <><Loader2 className="w-6 h-6 mr-3 animate-spin" />Processando...</>
              ) : vinBlocked ? (
                <><Ban className="w-6 h-6 mr-3" />VIN Bloqueado</>
              ) : checking ? (
                <><Loader2 className="w-6 h-6 mr-3 animate-spin" />Verificando...</>
              ) : (
                <><Save className="w-6 h-6 mr-3" />Salvar Produção</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
