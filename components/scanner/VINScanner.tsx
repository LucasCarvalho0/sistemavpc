import { useEffect, useRef, useState } from 'react'
import { X, Zap, Camera, Lightbulb, LightbulbOff, AlertCircle } from 'lucide-react'
import { playBeep, vibrate, cn } from '@/lib/utils'

interface Props { onScan: (vin: string) => void; onClose: () => void }

/**
 * Scanner VIN ultra-rápido e robusto.
 * - Usa câmera traseira com foco contínuo e HDR (se disponível)
 * - Suporte a Lanterna (Torch) para ambientes de fábrica
 * - Inteligência para ignorar prefixos (S, V, P, I) e extrair VIN de 17 chars
 * - Amplo suporte a formatos: CODE 128, 39, 93, EAN, UPC, DATA MATRIX
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
    setDebugLogs(prev => [...prev.slice(-4), msg]) // show 5 logs
  }

  useEffect(() => {
    let codeReader: any = null
    let stream: MediaStream | null = null

    async function start() {
      addLog('Iniciando scan HD...')
      try {
        const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library')

        const hints = new Map()
        // TODOS os formatos incluindo DATA_MATRIX e QR_CODE para etiquetas industriais
        const formats = [
          BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.CODE_93,
          BarcodeFormat.EAN_13, BarcodeFormat.ITF, BarcodeFormat.UPC_A,
          BarcodeFormat.DATA_MATRIX, BarcodeFormat.QR_CODE
        ]
        hints.set(DecodeHintType.POSSIBLE_FORMATS, formats)
        hints.set(DecodeHintType.TRY_HARDER, true)

        // Reset para 100ms (ultra-rápido)
        codeReader = new BrowserMultiFormatReader(hints, 100)

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            // @ts-ignore
            focusMode: { ideal: 'continuous' }
          }
        }

        addLog('Acessando câmera...')
        stream = await navigator.mediaDevices.getUserMedia(constraints)
        addLog('Câmera Ativa')

        const track = stream.getVideoTracks()[0]
        trackRef.current = track

        if (track) {
          const caps: any = track.getCapabilities?.() || {}
          setHasTorch(!!caps.torch)
          addLog(`Flash: ${!!caps.torch ? 'OK' : 'N/A'}`)

          if (caps.focusMode?.includes('continuous')) {
            await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] } as any).catch(() => { })
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          addLog('Visor OK')
        }

        if (scanRef.current && videoRef.current) {
          setStatus('scanning')
          codeReader.decodeFromVideoElementContinuously(videoRef.current, (result: any) => {
            if (result && scanRef.current) {
              const text = result.getText().toUpperCase()
              addLog(`Lido: ${text.slice(0, 10)}...`) // debug raw read

              // Regex VIN: 17 chars (sem I,O,Q)
              const vinMatch = text.match(/[A-HJ-NPR-Z0-9]{17}/)

              if (vinMatch) {
                const cleanVin = vinMatch[0]
                addLog('VIN OK!')
                scanRef.current = false
                playBeep(); vibrate([100, 50, 100]);
                onScan(cleanVin)
                if (codeReader) codeReader.reset()
                if (stream) stream.getTracks().forEach(t => t.stop())
              } else if (text.length >= 17) {
                // Fallback: se não bateu na regex mas tem 17+ chars, limpa e tenta de novo
                const clean = text.replace(/[^A-HJ-NPR-Z0-9]/g, '')
                if (clean.length >= 17) {
                  addLog('VIN Fallback!')
                  onScan(clean.slice(0, 17))
                  scanRef.current = false
                  playBeep(); vibrate(100);
                  if (codeReader) codeReader.reset()
                  if (stream) stream.getTracks().forEach(t => t.stop())
                }
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
      if (stream) {
        stream.getTracks().forEach(t => t.stop())
        addLog('Stream parado')
      }
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
      {/* Debug Logs Pequenos */}
      <div className="fixed top-2 left-2 z-50 pointer-events-none">
        {debugLogs.map((log, i) => (
          <div key={i} className="text-[9px] text-green-400 bg-black/60 px-2 py-0.5 rounded mb-0.5 font-mono">{log}</div>
        ))}
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
          <p className="text-white font-bold">Falha no Scanner</p>
          <p className="text-slate-400 text-sm leading-relaxed">{errMsg}</p>
          <button onClick={onClose} className="bg-white text-black font-bold px-8 py-3 rounded-2xl w-full active:scale-95 transition-all">Voltar</button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="scanner-frame relative border-2 border-green-500/30 rounded-2xl overflow-hidden shadow-2xl" style={{ width: '340px', height: '180px' }}>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
            <div className="absolute inset-0 border-[20px] border-black/50" />
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-green-500/60 shadow-[0_0_15px_rgba(34,197,94,0.6)] animate-pulse" />
          </div>
          <div className="mt-8 text-center px-10 space-y-2">
            <p className="text-white font-bold text-lg">Centralize o Código de Barras</p>
            <p className="text-slate-400 text-sm leading-tight">O VIN de 17 caracteres será identificado em etiquetas Código 128, DataMatrix ou QR.</p>
          </div>
          <button onClick={onClose} className="mt-12 px-10 py-3 text-slate-500 hover:text-white border border-slate-800 hover:bg-white/5 rounded-2xl transition-all font-bold uppercase text-[10px] tracking-widest active:scale-95">
            Sair do Scanner
          </button>
        </div>
      )}
    </div>
  )
}
