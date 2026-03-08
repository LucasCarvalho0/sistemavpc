import { useEffect, useRef, useState } from 'react'
import { X, Zap, Camera, Lightbulb, LightbulbOff } from 'lucide-react'
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
  const trackRef = useRef<MediaStreamTrack | null>(null)

  useEffect(() => {
    let codeReader: import('@zxing/library').BrowserMultiFormatReader | null = null
    let stream: MediaStream | null = null

    async function start() {
      try {
        const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library')

        const hints = new Map()
        // Expandir formatos para abranger todas as etiquetas industriais possíveis
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_93,
          BarcodeFormat.CODABAR,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.ITF,
          BarcodeFormat.UPC_A,
          BarcodeFormat.DATA_MATRIX,
        ])
        hints.set(DecodeHintType.TRY_HARDER, true)

        codeReader = new BrowserMultiFormatReader(hints, 100)

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            // @ts-ignore
            focusMode: { ideal: 'continuous' },
          },
        }

        stream = await navigator.mediaDevices.getUserMedia(constraints)
        const track = stream.getVideoTracks()[0]
        trackRef.current = track

        if (track) {
          try {
            // @ts-ignore
            const caps = track.getCapabilities?.()
            // @ts-ignore
            setHasTorch(!!caps?.torch)

            if (caps) {
              const advanced: any = {}
              // @ts-ignore
              if (caps.focusMode?.includes('continuous')) advanced.focusMode = 'continuous'
              // @ts-ignore
              if (caps.whiteBalanceMode?.includes('continuous')) advanced.whiteBalanceMode = 'continuous'

              if (Object.keys(advanced).length > 0) {
                await track.applyConstraints({ advanced: [advanced] })
              }
            }
          } catch (e) { console.warn('Constraints error:', e) }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        if (scanRef.current && videoRef.current) {
          setStatus('scanning')

          codeReader.decodeFromVideoElementContinuously(videoRef.current, (result) => {
            if (result && scanRef.current) {
              const text = result.getText().toUpperCase()

              /**
               * REGEX VIN ROBUSTO:
               * Busca 17 caracteres alfanuméricos (excluindo I, O, Q que são proibidos em VIN)
               * Ignora o que vem antes (prefixos como S, V, P comuns em etiquetas de fábrica)
               */
              const vinMatch = text.match(/[A-HJ-NPR-Z0-9]{17}/)

              if (vinMatch && scanRef.current) {
                const cleanVin = vinMatch[0]
                scanRef.current = false
                playBeep()
                vibrate([100, 50, 100])
                onScan(cleanVin)

                if (codeReader) codeReader.reset()
                if (stream) stream.getTracks().forEach(t => t.stop())
              }
            }
          })
        }
      } catch (err) {
        if (!scanRef.current) return
        setStatus('error')
        const e = err as Error
        setErrMsg(e.name === 'NotAllowedError' ? 'Sem permissão de câmera.' : `Falha: ${e.message}`)
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
    const newTorch = !torch
    setTorch(newTorch)
    try {
      if (trackRef.current) {
        // @ts-ignore
        await trackRef.current.applyConstraints({ advanced: [{ torch: newTorch }] })
      }
    } catch (e) { console.error('Torch failed:', e) }
  }

  return (
    <div className="scanner-overlay backdrop-blur-md">
      <div className="w-full max-w-sm px-4 mb-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Zap className="w-5 h-5 text-green-400" />
          </div>
          <span className="text-white font-bold text-lg display uppercase tracking-wide">Scanner Industrial</span>
        </div>
        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={cn(
                "p-2.5 rounded-xl border transition-all active:scale-90",
                torch ? "bg-yellow-400 text-black border-yellow-300 shadow-glow-yellow" : "bg-slate-800 text-slate-400 border-slate-700"
              )}
            >
              {torch ? <Lightbulb className="w-5 h-5" /> : <LightbulbOff className="w-5 h-5" />}
            </button>
          )}
          <button onClick={onClose} className="p-2.5 bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-700 active:scale-90 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {status === 'error' ? (
        <div className="text-center px-6 max-w-sm space-y-4 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
            <Camera className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-white font-bold">Erro no Scanner</p>
          <p className="text-slate-400 text-sm leading-relaxed">{errMsg}</p>
          <button onClick={onClose} className="bg-white text-slate-900 font-bold px-8 py-3 rounded-2xl w-full active:scale-95 transition-all">Fechar</button>
        </div>
      ) : (
        <div className="flex flex-col items-center animate-in fade-in duration-500">
          <div className="scanner-frame shadow-2xl">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
            {status === 'scanning' && <div className="scanner-line" />}
            <div className="sc-corner sc-tl border-green-400" />
            <div className="sc-corner sc-tr border-green-400" />
            <div className="sc-corner sc-bl border-green-400" />
            <div className="sc-corner sc-br border-green-400" />

            {/* Guide area for barcode */}
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-1 border-t border-dashed border-white/30" />
          </div>

          <div className="mt-8 text-center px-10">
            {status === 'starting' ? (
              <div className="flex items-center gap-3 text-slate-400">
                <div className="w-4 h-4 border-2 border-slate-600 border-t-green-400 rounded-full animate-spin" />
                <p>Otimizando câmera...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-white font-bold text-lg">Centralize o Código de Barras</p>
                <p className="text-slate-400 text-sm">O VIN será detectado automaticamente de etiquetas industriais.</p>
                <p className="text-green-400 text-[10px] font-black uppercase tracking-[0.2em] pt-4 animate-pulse">
                  Detectando AI/VIN Pattern Active
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="mt-12 px-10 py-3 text-slate-500 hover:text-white border border-slate-800 hover:bg-white/5 rounded-2xl transition-all font-bold uppercase text-[10px] tracking-widest"
          >
            Sair do Scanner
          </button>
        </div>
      )}

      <style jsx global>{`
        .sc-corner { border-width: 4px !important; width: 30px !important; height: 30px !important; }
        .scanner-frame { width: 340px !important; height: 180px !important; }
        .shadow-glow-yellow { box-shadow: 0 0 15px rgba(250, 204, 21, 0.4); }
      `}</style>
    </div>
  )
}

