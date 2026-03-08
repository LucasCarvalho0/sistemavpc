import { useEffect, useRef, useState } from 'react'
import { X, Zap, Camera, Lightbulb, LightbulbOff, AlertCircle } from 'lucide-react'
import { playBeep, vibrate, cn } from '@/lib/utils'

interface Props { onScan: (vin: string) => void; onClose: () => void }

/**
 * Scanner VIN ultra-rápido e robusto.
 * - Usa câmera traseira com foco contínuo e HDR (se disponível)
 * - Suporte a Lanterna (Torch) para ambientes de fábrica
 * - Inteligência para ignorar prefixos (S, V, P, I) e extrair VIN de 17 chars
 * - Amplo suporte a formatos: CODE 128, 39, 93, EAN, UPC, DATA MATRIX, PDF417, CODABAR
 */
export default function VINScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scanRef = useRef(true)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting')
  const [errMsg, setErrMsg] = useState('')
  const [torch, setTorch] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const trackRef = useRef<MediaStreamTrack | null>(null)

  const addLog = (msg: string) => {
    console.log(`[SCANNER] ${msg}`)
    setDebugLogs(prev => [...prev.slice(-4), msg])
  }

  useEffect(() => {
    let codeReader: any = null
    let stream: MediaStream | null = null

    async function start() {
      addLog('Iniciando V3 (720p)...')
      try {
        const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library')

        const hints = new Map()
        // Suporte total: 1D, 2D e industrial
        const formats = [
          BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.CODE_93,
          BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.ITF,
          BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODABAR,
          BarcodeFormat.DATA_MATRIX, BarcodeFormat.QR_CODE, BarcodeFormat.PDF_417
        ]
        hints.set(DecodeHintType.POSSIBLE_FORMATS, formats)
        hints.set(DecodeHintType.TRY_HARDER, true)

        codeReader = new BrowserMultiFormatReader(hints, 100)

        // Resolução 720p é mais estável para processamento em tempo real
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            // @ts-ignore
            focusMode: 'continuous'
          }
        }

        addLog('Abrindo câmera...')
        stream = await navigator.mediaDevices.getUserMedia(constraints)
        addLog('Câmera OK')

        const track = stream.getVideoTracks()[0]
        trackRef.current = track

        if (track) {
          const caps: any = track.getCapabilities?.() || {}
          setHasTorch(!!caps.torch)
          const advanced: any = {}
          if (caps.focusMode?.includes('continuous')) advanced.focusMode = 'continuous'
          if (Object.keys(advanced).length > 0) {
            await track.applyConstraints({ advanced: [advanced] } as any).catch(() => { })
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          addLog('Visor Pronto')
        }

        if (scanRef.current && videoRef.current) {
          setStatus('scanning')
          codeReader.decodeFromVideoElementContinuously(videoRef.current, (result: any, err: any) => {
            if (result && scanRef.current) {
              const raw = result.getText().toUpperCase()
              addLog(`Bruto: ${raw.slice(0, 15)}...`)

              // Lógica Smart Clean: remove tudo que não é VIN, pega os últimos 17 chars
              // Isso ignora prefixos como S, V, P, I automaticamente.
              const clean = raw.replace(/[^A-HJ-NPR-Z0-9]/g, '')

              if (clean.length >= 17) {
                // Pega os últimos 17 caracteres (ignora prefixos)
                const finalVin = clean.slice(-17)
                addLog(`Sucesso: ${finalVin}`)

                scanRef.current = false
                playBeep()
                vibrate([100, 50, 100])
                onScan(finalVin)

                if (codeReader) codeReader.reset()
                if (stream) stream.getTracks().forEach(t => t.stop())
              } else if (clean.length > 5) {
                addLog(`Curto: ${clean.length} ch`)
              }
            }
          })
        }
      } catch (err: any) {
        addLog(`Erro: ${err.name}`)
        setErrMsg(err.message || 'Falha ao iniciar')
        setStatus('error')
      }
    }

    start()
    return () => {
      scanRef.current = false
      codeReader?.reset()
      if (stream) stream.getTracks().forEach(t => t.stop())
    }
  }, [onScan])

  const toggleTorch = async () => {
    const next = !torch
    setTorch(next)
    if (trackRef.current) {
      await (trackRef.current as any).applyConstraints({ advanced: [{ torch: next }] }).catch(() => { })
    }
  }

  return (
    <div className="scanner-overlay backdrop-blur-md">
      {/* Debug Console mais legível */}
      <div className="fixed top-2 left-2 z-[60] p-2 bg-black/80 rounded-lg border border-white/10 pointer-events-none">
        <p className="text-[8px] text-slate-500 uppercase font-bold mb-1 tracking-widest">Scanner Debug</p>
        <div className="space-y-0.5">
          {debugLogs.map((log, i) => (
            <div key={i} className="text-[10px] text-green-400 font-mono flex items-center gap-2">
              <span className="opacity-30">[{i}]</span> {log}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-sm px-4 mb-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-green-400" />
          <span className="text-white font-bold text-lg display uppercase tracking-wide">Scanner Industrial</span>
        </div>
        <div className="flex items-center gap-2">
          {hasTorch && (
            <button onClick={toggleTorch} className={cn("p-2.5 rounded-xl border transition-all active:scale-90", torch ? "bg-yellow-400 text-black border-yellow-300" : "bg-slate-800 text-slate-400 border-slate-700")}>
              {torch ? <Lightbulb className="w-5 h-5" /> : <LightbulbOff className="w-5 h-5" />}
            </button>
          )}
          <button onClick={onClose} className="p-2.5 bg-slate-800 text-slate-400 rounded-xl border border-slate-700 active:scale-90 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {status === 'error' ? (
        <div className="text-center px-6 max-w-sm space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-white font-bold text-xl uppercase tracking-wider">Falha Crucial</p>
          <p className="text-slate-400 text-sm leading-relaxed">{errMsg}</p>
          <button onClick={onClose} className="bg-white text-black font-extrabold px-8 py-4 rounded-2xl w-full active:scale-95 transition-all shadow-xl">Voltar para Digitação</button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="scanner-frame relative border-2 border-green-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]" style={{ width: '340px', height: '180px' }}>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
            <div className="absolute inset-0 border-[30px] border-black/60" />

            {/* Linha de scan dinâmica */}
            <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-0.5 bg-green-500/80 shadow-[0_0_20px_rgba(34,197,94,0.8)] animate-pulse" />

            {/* Cantos de foco */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-green-500 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-green-500 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-green-500 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-green-500 rounded-br-lg" />
          </div>

          <div className="mt-10 text-center px-10 space-y-3">
            <p className="text-white font-black text-xl uppercase tracking-tight">Escaneie o Código</p>
            <p className="text-slate-400 text-sm font-medium leading-tight">O sistema extrai o VIN mesmo de etiquetas com letras extras.</p>
            <div className="flex items-center justify-center gap-2 pt-4">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
              <span className="text-[10px] text-green-400/80 font-black uppercase tracking-[0.2em]">Detection AI Active</span>
            </div>
          </div>

          <button onClick={onClose} className="mt-12 px-10 py-4 text-slate-500 hover:text-white border border-slate-800 hover:border-slate-700 bg-slate-900/40 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest active:scale-95">
            Digitar Manualmente
          </button>
        </div>
      )}

      <style jsx global>{`
        .scanner-overlay { position: fixed; inset: 0; z-index: 100; background: black; display: flex; flex-direction: column; align-items: center; justify-content: center; }
      `}</style>
    </div>
  )
}
