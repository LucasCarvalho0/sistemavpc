import { useEffect, useRef, useState } from 'react'
import { X, Zap, Lightbulb, LightbulbOff, AlertCircle, Scan, Terminal } from 'lucide-react'
import { playBeep, vibrate, cn } from '@/lib/utils'

interface Props { onScan: (vin: string) => void; onClose: () => void }

/**
 * SCANNER VIN V6 - DIAGNOSTIC & SPEED PRO
 * - Otimizado para CODE 128 (Barras finas do setor automotivo)
 * - Resolução SD (640x480) forced: Processamento ultra-rápido para 1D
 * - Advanced Error Logging: Mostra o que está atrapalhando a leitura
 * - Normalização de VIN: Tratamento de caracteres ambíguos (0/O, 1/I)
 */
export default function VINScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scanRef = useRef(true)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting')
  const [errMsg, setErrMsg] = useState('')
  const [torch, setTorch] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [lastDetection, setLastDetection] = useState<string>('')
  const [debugMode, setDebugMode] = useState(false)
  const [scanErrors, setScanErrors] = useState<string[]>([])
  const trackRef = useRef<MediaStreamTrack | null>(null)

  const addError = (msg: string) => {
    setScanErrors(prev => [...prev.slice(-2), msg])
  }

  useEffect(() => {
    let codeReader: any = null
    let stream: MediaStream | null = null

    async function start() {
      try {
        const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library')

        const hints = new Map()
        // Prioridade absoluta para 1D e Automotivo
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.DATA_MATRIX
        ])
        hints.set(DecodeHintType.TRY_HARDER, true)

        codeReader = new BrowserMultiFormatReader(hints, 150) // 150ms para reduzir carga da CPU

        // SD (640x480) é DRASTICAMENTE mais rápido para ler Code 128 que HD
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 640 },
            height: { ideal: 480 },
            // @ts-ignore
            focusMode: 'continuous'
          }
        }

        stream = await navigator.mediaDevices.getUserMedia(constraints)
        const track = stream.getVideoTracks()[0]
        trackRef.current = track

        if (track) {
          const caps: any = track.getCapabilities?.() || {}
          setHasTorch(!!caps.torch)
          const advanced: any = {}
          // @ts-ignore
          if (caps.focusMode?.includes('continuous')) advanced.focusMode = 'continuous'
          if (Object.keys(advanced).length > 0) {
            await track.applyConstraints({ advanced: [advanced] } as any).catch(e => addError('Focus error'))
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        if (scanRef.current && videoRef.current) {
          setStatus('scanning')

          codeReader.decodeFromVideoElementContinuously(videoRef.current, (result: any, err: any) => {
            if (result && scanRef.current) {
              const text = result.getText().toUpperCase().trim()
              setLastDetection(text)

              // Lógica de Extração Nissan/Industrial
              // Busca os 17 caracteres do VIN, ignorando qualquer prefixo (S, V, P, etc.)
              const vinPattern = /[A-Z0-9]{17,18}/
              const match = text.match(vinPattern)

              if (match) {
                let rawVin = match[0].slice(0, 17)

                // Normalização: Scanners ópticos erram muito 0/O e 1/I em fontes industriais
                const finalVin = rawVin
                  .replace(/O/g, '0') // Letra O -> Número 0
                  .replace(/I/g, '1') // Letra I -> Número 1
                  .replace(/Q/g, '0') // Letra Q -> Número 0 (comum em erro de dot matrix)

                // Validação Final (ISO 3779)
                if (/^[A-HJ-NPR-Z0-9]{17}$/.test(finalVin)) {
                  scanRef.current = false
                  playBeep()
                  vibrate([100, 50, 100])
                  onScan(finalVin)

                  if (codeReader) codeReader.reset()
                  if (stream) stream.getTracks().forEach(t => t.stop())
                }
              }
            }
            if (err && !result && debugMode) {
              // Só loga erros raros, não os de "not found"
              if (err.name !== 'NotFoundException') {
                addError(err.name)
              }
            }
          })
        }
      } catch (err: any) {
        if (!scanRef.current) return
        setStatus('error')
        setErrMsg(err.message || 'Câmera ocupada ou indisponível.')
      }
    }

    start()
    return () => {
      scanRef.current = false
      if (codeReader) codeReader.reset()
      if (stream) stream.getTracks().forEach(t => t.stop())
    }
  }, [onScan, debugMode])

  const toggleTorch = async () => {
    const next = !torch
    setTorch(next)
    if (trackRef.current) {
      await (trackRef.current as any).applyConstraints({ advanced: [{ torch: next }] }).catch(() => { })
    }
  }

  return (
    <div className="scanner-overlay fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-0">
      {/* Barra de Status Topo */}
      <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between bg-gradient-to-b from-black/90 to-transparent z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Scan className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-white font-black text-xs uppercase tracking-[0.2em] leading-none mb-1">Scanner Industrial</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">V6 Active</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {hasTorch && (
            <button onClick={toggleTorch} className={cn("p-3.5 rounded-2xl border transition-all active:scale-90", torch ? "bg-yellow-400 text-black border-yellow-300 shadow-glow-yellow" : "bg-white/5 text-white/40 border-white/10")}>
              {torch ? <Lightbulb className="w-6 h-6" /> : <LightbulbOff className="w-6 h-6" />}
            </button>
          )}
          <button onClick={() => setDebugMode(!debugMode)} className={cn("p-3.5 rounded-2xl border transition-all active:scale-90", debugMode ? "bg-blue-500 text-white border-blue-400" : "bg-white/5 text-white/40 border-white/10")}>
            <Terminal className="w-6 h-6" />
          </button>
          <button onClick={onClose} className="p-3.5 bg-white/5 text-white/40 rounded-2xl border border-white/10 active:scale-90 transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {status === 'error' ? (
        <div className="text-center space-y-8 px-10 z-20">
          <div className="w-24 h-24 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto shadow-2xl">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <div className="space-y-3">
            <p className="text-white font-black text-2xl uppercase tracking-tighter italic">Falha no Sensor</p>
            <p className="text-slate-500 text-sm leading-relaxed">{errMsg}</p>
          </div>
          <button onClick={onClose} className="bg-white text-black font-black py-5 px-12 rounded-3xl uppercase text-[10px] tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all">Digitar Manualmente</button>
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          {/* Câmera */}
          <div className="absolute inset-0 z-0 scale-110">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
          </div>

          {/* Mira de Alta Precisão (Nissan/Toyota Style) */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
            {/* O "Buraco" de leitura (Formatado para 1D Code 128) */}
            <div className="w-[92%] h-[160px] rounded-3xl border-2 border-blue-500/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] relative">

              {/* Linha de Varredura Laser */}
              <div className="absolute inset-x-0 h-0.5 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,1)] animate-laser-scan blur-[1px]" />

              {/* Cantos de Foco Brancos (High Contrast) */}
              <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-3xl" />
              <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-3xl" />
              <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-3xl" />
              <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-3xl" />

              {/* Centralizadores */}
              <div className="absolute left-1/2 -top-4 -translate-x-1/2 w-0.5 h-8 bg-blue-500/50" />
              <div className="absolute left-1/2 -bottom-4 -translate-x-1/2 w-0.5 h-8 bg-blue-500/50" />

              {/* Dica no Topo */}
              <div className="absolute -top-10 left-0 right-0 text-center">
                <span className="text-[10px] text-white/80 font-black uppercase tracking-[0.2em] bg-blue-600 px-3 py-1 rounded-full border border-blue-400 shadow-lg">Centralize as Barras</span>
              </div>
            </div>

            {/* Texto de Ajuda Dinâmico */}
            <div className="mt-20 text-center px-10 transition-all">
              <p className="text-white font-black text-2xl uppercase italic tracking-tighter mb-1 shadow-black/80 shadow-sm">Escaneie o Chassi</p>
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest max-w-[250px] mx-auto leading-relaxed">Posicione a etiqueta a 15cm da câmera. O sistema detecta VIN no modo contínuo.</p>
            </div>

            {/* Debug console (se ativo) */}
            {debugMode && (
              <div className="absolute top-24 left-6 right-6 p-4 bg-black/90 border border-white/10 rounded-2xl backdrop-blur-xl z-50">
                <p className="text-[10px] text-blue-400 font-bold uppercase mb-2 flex items-center gap-2">
                  <Terminal className="w-3 h-3" /> Diagnostics Mode
                </p>
                <div className="space-y-1 font-mono text-[9px]">
                  <p className="text-slate-400">Stream: {videoRef.current?.videoWidth}x{videoRef.current?.videoHeight}</p>
                  <p className="text-green-400">Last Read: {lastDetection || 'no data'}</p>
                  <div className="pt-2 border-t border-white/5">
                    {scanErrors.map((e, i) => <p key={i} className="text-red-400">Error: {e}</p>)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer UI */}
          <div className="absolute bottom-12 inset-x-0 flex flex-col items-center gap-4 z-20">
            <button onClick={onClose} className="px-12 py-4 bg-white/5 text-white/50 border border-white/10 rounded-2xl uppercase text-[9px] font-black tracking-[0.2em] backdrop-blur-md hover:text-white hover:bg-white/10 hover:border-white/20 transition-all active:scale-95">
              Sair do Scanner
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes laser {
          0%, 100% { top: 5%; opacity: 0.8; }
          50% { top: 95%; opacity: 0.3; }
        }
        .animate-laser-scan {
          animation: laser 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
