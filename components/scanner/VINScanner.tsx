import { useEffect, useRef, useState } from 'react'
import { X, Zap, Lightbulb, LightbulbOff, AlertCircle, Scan } from 'lucide-react'
import { playBeep, vibrate, cn } from '@/lib/utils'

interface Props { onScan: (vin: string) => void; onClose: () => void }

/**
 * SCANNER VIN V5 - INDUSTRIAL PRO
 * - Otimizado para CODE 128 (VIN longo e fino)
 * - Character Repair: Converte automaticamente O->0, I->1, Q->0
 * - Mira Proporcionada: Área de leitura estendida horizontalmente
 * - Resolução 720p: Equilíbrio ideal entre processamento e detalhe
 */
export default function VINScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scanRef = useRef(true)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting')
  const [errMsg, setErrMsg] = useState('')
  const [torch, setTorch] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [lastRead, setLastRead] = useState('')
  const trackRef = useRef<MediaStreamTrack | null>(null)

  useEffect(() => {
    let codeReader: any = null
    let stream: MediaStream | null = null

    async function start() {
      try {
        const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library')

        const hints = new Map()
        // Prioridade total para Code 128 (VIN industrial)
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_93,
          BarcodeFormat.DATA_MATRIX,
          BarcodeFormat.EAN_13,
          BarcodeFormat.ITF
        ])
        hints.set(DecodeHintType.TRY_HARDER, true)

        codeReader = new BrowserMultiFormatReader(hints, 100)

        // Resolução 720p é o "ponto doce" para evitar lag de processamento em 100ms
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
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
              const raw = result.getText().toUpperCase().trim()
              setLastRead(raw)

              // 1. Regex Permissiva: Captura qualquer sequência de 17 ou 18 chars (A-Z, 0-9)
              const vinMatch = raw.match(/[A-Z0-9]{17,18}/)

              if (vinMatch) {
                let candidate = vinMatch[0].slice(0, 17) // Pega os primeiros 17

                // 2. Character Repair: Converte erros comuns de sensores
                // ISO VIN não tem I, O, Q. Scanners às vezes confundem.
                const repaired = candidate
                  .replace(/O/g, '0') // Oscar -> Zero
                  .replace(/I/g, '1') // India -> One
                  .replace(/Q/g, '0') // Quebec -> Zero

                // 3. Validação Final
                if (/^[A-HJ-NPR-Z0-9]{17}$/.test(repaired)) {
                  scanRef.current = false
                  playBeep()
                  vibrate([100, 50, 100])
                  onScan(repaired)

                  if (codeReader) codeReader.reset()
                  if (stream) stream.getTracks().forEach(t => t.stop())
                }
              }
            }
          })
        }
      } catch (err: any) {
        if (!scanRef.current) return
        setStatus('error')
        setErrMsg(err.message || 'Falha ao iniciar sensor')
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
    <div className="scanner-overlay fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Header Industrial */}
      <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Scan className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-white font-black text-sm uppercase tracking-widest">Scanner V5</h2>
            <p className="text-blue-400/60 text-[10px] uppercase font-black tracking-tighter">Precision Logic Active</p>
          </div>
        </div>

        <div className="flex gap-2">
          {hasTorch && (
            <button onClick={toggleTorch} className={cn("p-3.5 rounded-2xl border transition-all active:scale-90", torch ? "bg-yellow-400 text-black border-yellow-300" : "bg-white/5 text-white/40 border-white/10")}>
              {torch ? <Lightbulb className="w-6 h-6" /> : <LightbulbOff className="w-6 h-6" />}
            </button>
          )}
          <button onClick={onClose} className="p-3.5 bg-white/5 text-white/40 rounded-2xl border border-white/10 active:scale-90 transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {status === 'error' ? (
        <div className="text-center space-y-6 px-10">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <p className="text-white font-black text-xl uppercase italic tracking-tighter">{errMsg}</p>
          <button onClick={onClose} className="bg-white text-black font-black py-4 px-10 rounded-2xl uppercase text-[10px] tracking-[0.2em]">Voltar</button>
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          {/* Visor de Câmera */}
          <div className="absolute inset-0 z-0">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
          </div>

          {/* Overlay de Máscara (Mira mais larga para Code 128) */}
          <div className="absolute inset-0 z-1 flex items-center justify-center">
            {/* O "buraco" da mira */}
            <div className="w-[90%] h-[180px] rounded-3xl border-2 border-blue-500/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] relative overflow-hidden">
              {/* Linha de Scan Dinâmica */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-scan-line" />

              {/* Cantos de Mira */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-white/80 rounded-tl-xl" />
                <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-white/80 rounded-tr-xl" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-white/80 rounded-bl-xl" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-white/80 rounded-br-xl" />
              </div>

              {/* Status de Leitura no Visor */}
              <div className="absolute bottom-4 inset-x-0 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] text-white/60 font-black uppercase tracking-widest">Aguardando Barcode...</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Informativo */}
          <div className="absolute bottom-20 inset-x-0 px-10 text-center z-10 pointer-events-none">
            <p className="text-white font-black text-2xl uppercase italic tracking-tighter mb-2">Centralize o Código</p>
            <p className="text-white/40 text-xs font-medium">Capture as barras horizontais. O sistema irá converter o VIN automaticamente.</p>

            {/* Debug (Apenas para ajudar se falhar) */}
            {lastRead && (
              <div className="mt-8 p-3 bg-black/40 border border-white/10 rounded-xl backdrop-blur-md animate-in fade-in zoom-in duration-300">
                <p className="text-[8px] text-white/30 uppercase font-bold tracking-widest mb-1">Detectado</p>
                <p className="text-xs text-blue-400 font-mono font-bold break-all lowercase italic tracking-wider">{lastRead}</p>
              </div>
            )}
          </div>

          <button onClick={onClose} className="absolute bottom-8 px-10 py-3 bg-white/10 text-white/50 border border-white/10 rounded-2xl uppercase text-[9px] font-black tracking-[0.2em] backdrop-blur-md hover:text-white transition-all active:scale-95 z-10">
            Sair do modo scanner
          </button>
        </div>
      )}

      <style jsx global>{`
        @keyframes scan {
          0%, 100% { top: 10%; }
          50% { top: 90%; }
        }
        .animate-scan-line {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
