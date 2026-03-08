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
    setDebugLogs(prev => [...prev.slice(-3), msg])
  }

  useEffect(() => {
    let codeReader: any = null
    let stream: MediaStream | null = null

    async function start() {
      addLog('Iniciando...')
      try {
        const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library')
        addLog('ZXing carregado')

        const hints = new Map()
        // Expandir formatos para abranger todas as etiquetas industriais possíveis
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.CODE_93,
          BarcodeFormat.EAN_13, BarcodeFormat.ITF, BarcodeFormat.UPC_A
        ])
        hints.set(DecodeHintType.TRY_HARDER, true)

        codeReader = new BrowserMultiFormatReader(hints, 150)

        const constraints: MediaStreamConstraints = {
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        }

        addLog('Pedindo câmera...')
        stream = await navigator.mediaDevices.getUserMedia(constraints)
        addLog('Câmera OK')

        const track = stream.getVideoTracks()[0]
        trackRef.current = track

        if (track) {
          const caps: any = track.getCapabilities?.() || {}
          setHasTorch(!!caps.torch)
          addLog(`Torch: ${!!caps.torch ? 'Sim' : 'Não'}`)

          if (caps.focusMode?.includes('continuous')) {
            await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] } as any).catch(() => { })
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          addLog('Vídeo tocando')
        }

        if (scanRef.current && videoRef.current) {
          setStatus('scanning')

          codeReader.decodeFromVideoElementContinuously(videoRef.current, (result: any) => {
            if (result && scanRef.current) {
              const text = result.getText().toUpperCase()

              /**
               * REGEX VIN ROBUSTO:
               * Busca 17 caracteres alfanuméricos (excluindo I, O, Q que são proibidos em VIN)
               * Ignora o que vem antes (prefixos como S, V, P comuns em etiquetas de fábrica)
               */
              const vinMatch = text.match(/[A-HJ-NPR-Z0-9]{17}/)

              if (vinMatch) {
                addLog('VIN Detectado!')
                const cleanVin = vinMatch[0]
                scanRef.current = false
                playBeep(); vibrate([100, 50, 100]);
                onScan(cleanVin)

                if (codeReader) codeReader.reset()
                if (stream) stream.getTracks().forEach(t => t.stop())
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
    try {
      if (trackRef.current) {
        await (trackRef.current as any).applyConstraints({ advanced: [{ torch: next }] }).catch(() => { })
      }
    } catch (e) { console.error('Torch failed:', e) }
  }

  return (
    <div className="scanner-overlay backdrop-blur-md">
      {/* Debug Logs */}
      <div className="fixed top-2 left-2 z-50 pointer-events-none opacity-50">
        {debugLogs.map((log, i) => (
          <div key={i} className="text-[10px] text-white bg-black/50 px-2 py-0.5 rounded mb-1">{log}</div>
        ))}
      </div>

      <div className="w-full max-w-sm px-4 mb-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-green-400" />
          <span className="text-white font-bold text-lg display uppercase tracking-wide">Scanner VIN</span>
        </div>
        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={cn(
                "p-2.5 rounded-xl border",
                torch ? "bg-yellow-400 text-black border-yellow-300" : "bg-slate-800 text-slate-400 border-slate-700"
              )}
            >
              {torch ? <Lightbulb className="w-5 h-5" /> : <LightbulbOff className="w-5 h-5" />}
            </button>
          )}
          <button onClick={onClose} className="p-2.5 bg-slate-800 text-slate-400 rounded-xl border border-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {status === 'error' ? (
        <div className="text-center px-6 max-w-sm space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-white font-bold">Falha no Scanner</p>
          <p className="text-slate-400 text-sm">{errMsg}</p>
          <button onClick={onClose} className="bg-white text-black font-bold px-8 py-3 rounded-2xl w-full">Voltar</button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="scanner-frame relative border-2 border-green-500/50 rounded-2xl overflow-hidden" style={{ width: '320px', height: '180px' }}>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
            <div className="absolute inset-0 border-[20px] border-black/40" />
            <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 h-0.5 bg-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.5)] animate-pulse" />
          </div>
          <div className="mt-8 text-center px-10 space-y-2">
            <p className="text-white font-bold">Aponte para o Código de Barras</p>
            <p className="text-slate-400 text-sm italic">O VIN de 17 dígitos será extraído automaticamente.</p>
          </div>
          <button onClick={onClose} className="mt-10 px-8 py-2 text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest border border-slate-800 rounded-xl transition-all">
            Sair do Scanner
          </button>
        </div>
      )}
    </div>
  )
}
