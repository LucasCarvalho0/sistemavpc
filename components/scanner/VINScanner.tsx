import { useEffect, useRef, useState } from 'react'
import { X, Zap, Lightbulb, LightbulbOff, AlertCircle } from 'lucide-react'
import { playBeep, vibrate, cn } from '@/lib/utils'

interface Props { onScan: (vin: string) => void; onClose: () => void }

/**
 * SCANNER VIN PROFISSIONAL (V4 - INDUSTRIAL)
 * - Mira de leitura (Aiming Reticle) para alinhamento preciso
 * - ZXing Engine configurado para alta sensibilidade (Code128 especial)
 * - Captura instantânea com Regex industrial /[A-HJ-NPR-Z0-9]{17}/
 * - Foco contínuo e resolução 1080p para barras finas
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
    let codeReader: any = null
    let stream: MediaStream | null = null

    async function start() {
      try {
        const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library')

        const hints = new Map()
        // Formatos industriais críticos (VIN é Code128)
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.DATA_MATRIX,
          BarcodeFormat.QR_CODE
        ])
        hints.set(DecodeHintType.TRY_HARDER, true)
        hints.set(DecodeHintType.ASSUME_GS1, true)

        // Motor ultra-sônico (100ms cycle)
        codeReader = new BrowserMultiFormatReader(hints, 100)

        // Configurações HD para barras finas (conforme sugerido)
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            // @ts-ignore
            aspectRatio: 1.777777778,
            // @ts-ignore
            frameRate: { min: 20, ideal: 30 }
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
            await track.applyConstraints({ advanced: [advanced] } as any).catch(() => { })
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        if (scanRef.current && videoRef.current) {
          setStatus('scanning')

          codeReader.decodeFromVideoElementContinuously(videoRef.current, (result: any) => {
            if (result && scanRef.current) {
              const text = result.getText().toUpperCase()

              // REGEX PROFISSIONAL: Detecta qualquer sequência de 17 caracteres VIN válida
              const vinMatch = text.match(/[A-HJ-NPR-Z0-9]{17}/)

              if (vinMatch) {
                const finalVin = vinMatch[0]
                scanRef.current = false // Travar leitura

                // Feedback Instantâneo
                playBeep()
                vibrate([50, 30, 50])

                // Sair e enviar
                onScan(finalVin)
                if (codeReader) codeReader.reset()
                if (stream) stream.getTracks().forEach(t => t.stop())
              }
            }
          })
        }
      } catch (err: any) {
        if (!scanRef.current) return
        setStatus('error')
        setErrMsg(err.name === 'NotAllowedError' ? 'Permissão de câmera negada.' : err.message)
      }
    }

    start()
    return () => {
      scanRef.current = false
      if (codeReader) codeReader.reset()
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
    <div className="scanner-overlay fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
            <Zap className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-white font-black text-xs uppercase tracking-[0.2em]">Scanner V4</h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase">Nissan Pattern Active</p>
          </div>
        </div>

        <div className="flex gap-2">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={cn(
                "p-3 rounded-2xl border transition-all active:scale-90",
                torch ? "bg-yellow-400 text-black border-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.4)]" : "bg-slate-900 text-slate-500 border-slate-800"
              )}
            >
              {torch ? <Lightbulb className="w-5 h-5" /> : <LightbulbOff className="w-5 h-5" />}
            </button>
          )}
          <button onClick={onClose} className="p-3 bg-slate-900 text-slate-500 rounded-2xl border border-slate-800 active:scale-90 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {status === 'error' ? (
        <div className="text-center space-y-6 max-w-xs">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <div className="space-y-2">
            <p className="text-white font-black text-xl uppercase tracking-wider">Falha Crucial</p>
            <p className="text-slate-500 text-sm leading-relaxed">{errMsg}</p>
          </div>
          <button onClick={onClose} className="bg-white text-black font-black py-4 rounded-2xl w-full active:scale-95 transition-all shadow-xl uppercase text-xs tracking-widest">Digitar Manualmente</button>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full">
          {/* Mira Industrial */}
          <div className="relative w-full max-w-sm aspect-[3/2] rounded-[2.5rem] border-2 border-white/5 overflow-hidden shadow-2xl">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />

            {/* Overlay de Sombra */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Área de Foco (Abertura na Sombra) */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[85%] h-[40%] bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] rounded-2xl border border-white/20" />
            </div>

            {/* Retículo (Aiming Reticle) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[85%] h-[40%] relative">
                {/* Cantos da Mira */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-2xl" />

                {/* Linha de Verificação Central */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse" />

                {/* Indicadores de Centro */}
                <div className="absolute left-1/2 top-0 -translate-x-1/2 w-4 h-[2px] bg-blue-500/50" />
                <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-4 h-[2px] bg-blue-500/50" />
              </div>
            </div>

            {status === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-blue-400 font-black text-[10px] uppercase tracking-widest animate-pulse">Iniciando Lógica Industrial...</p>
              </div>
            )}
          </div>

          <div className="mt-12 text-center space-y-4 px-8">
            <h3 className="text-white font-black text-2xl uppercase tracking-tighter italic">Alinhe o Código</h3>
            <p className="text-slate-400 text-xs font-medium leading-relaxed">Posicione as barras finas dentro da mira azul. O VIN será capturado instantaneamente.</p>

            <div className="flex items-center justify-center gap-3 pt-4">
              <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                <span className="text-[10px] text-green-500 font-black uppercase tracking-widest">Auto-Focus Continuous</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-16 px-12 py-4 bg-slate-900 text-slate-500 hover:text-white border border-slate-800 rounded-3xl transition-all font-black uppercase text-[10px] tracking-widest active:scale-95"
          >
            Digitar Manualmente
          </button>
        </div>
      )}
    </div>
  )
}
