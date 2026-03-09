'use client'

import { useEffect, useRef, useState } from "react"
// @ts-ignore
import Quagga from "quagga"
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from "@zxing/library"
import Tesseract from "tesseract.js"
import { X, Lightbulb, LightbulbOff, AlertCircle, Terminal, BrainCircuit } from "lucide-react"
import { playBeep, vibrate, cn } from "@/lib/utils"

interface Props {
  onScan: (vin: string) => void
  onClose: () => void
}

/**
 * SCANNER VIN V16 INDUSTRIAL FIXES
 * - FIX BUG 1: handleResult always passes through normalizeVin
 * - FIX BUG 2: Canvas rotation dimensions & offsets (90°/270°)
 * - FIX BUG 3: isAiProcessingRef to avoid interval race conditions
 */
export default function VINScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const scanRef = useRef(true)
  const ocrIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isAiProcessingRef = useRef(false) // FIX BUG 3: ref para evitar race condition

  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting')
  const [lastScan, setLastScan] = useState("")
  const [torch, setTorch] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [isAiProcessing, setIsAiProcessing] = useState(false)

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            // @ts-ignore
            focusMode: 'continuous'
          }
        })
        streamRef.current = stream

        const track = stream.getVideoTracks()[0]
        const caps: any = track.getCapabilities?.() || {}
        if (caps.torch) setHasTorch(true)

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        setStatus("scanning")
        startZXing()
        startQuagga()
        startOCRLoop()

      } catch (err) {
        setStatus("error")
      }
    }

    function normalizeVin(text: string): string | null {
      if (!text) return null
      const clean = text.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "")
      if (clean.length < 17) return null

      for (let i = 0; i <= clean.length - 17; i++) {
        const candidate = clean.slice(i, i + 17)
        if (/^[A-HJ-NPR-Z0-9]{17}$/.test(candidate)) {
          return candidate
        }
      }
      return null
    }

    // FIX BUG 1: Sempre passa pelo normalizeVin, sem bypass para strings de 17 chars
    function handleResult(text: string) {
      if (!scanRef.current) return

      const vin = normalizeVin(text)
      if (!vin) return

      scanRef.current = false
      playBeep()
      vibrate([100, 50, 100])
      stopScanner()
      onScan(vin)
    }

    function startZXing() {
      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.PDF_417,
      ])
      hints.set(DecodeHintType.TRY_HARDER, true)
      hints.set(DecodeHintType.PURE_BARCODE, false)

      const reader = new BrowserMultiFormatReader(hints, 100)
      readerRef.current = reader

      reader.decodeFromVideoElementContinuously(videoRef.current!, (result) => {
        if (result && scanRef.current) {
          const text = result.getText()
          setLastScan(text)
          handleResult(text)
        }
      })
    }

    function startQuagga() {
      Quagga.init({
        inputStream: {
          type: "LiveStream",
          target: videoRef.current!,
          constraints: { facingMode: "environment", width: 1920, height: 1080 }
        },
        locator: { patchSize: "large", halfSample: false },
        decoder: { readers: ["code_128_reader", "code_39_reader"], multiple: false },
        locate: true,
        frequency: 15
      }, function (err: any) {
        if (!err && scanRef.current) {
          const drawingCanvas = document.querySelector('.drawingBuffer') as HTMLCanvasElement
          if (drawingCanvas) drawingCanvas.style.display = 'none'
          Quagga.start()
        }
      })

      Quagga.onDetected((res: any) => {
        if (res && scanRef.current) {
          const text = res.codeResult.code
          setLastScan(text)
          handleResult(text)
        }
      })
    }

    async function startOCRLoop() {
      ocrIntervalRef.current = setInterval(async () => {
        // FIX BUG 3: usa ref em vez de state
        if (!scanRef.current || !videoRef.current || !canvasRef.current || isAiProcessingRef.current) return

        isAiProcessingRef.current = true
        setIsAiProcessing(true)

        try {
          const video = videoRef.current
          const canvas = canvasRef.current
          const ctx = canvas.getContext("2d")
          if (!ctx) return

          const vw = video.videoWidth
          const vh = video.videoHeight

          const rotations = [0, 90, 270]

          for (const angle of rotations) {
            if (!scanRef.current) break

            if (angle === 0) {
              canvas.width = 640
              canvas.height = Math.round(vh * (640 / vw))
              ctx.drawImage(video, 0, 0, vw, vh, 0, 0, canvas.width, canvas.height)
            } else {
              // FIX BUG 2: dimensões e offsets corretos para rotação 90°/270°
              canvas.width = Math.round(vh * (640 / vw))
              canvas.height = Math.round(vw * (canvas.width / vh))
              ctx.save()
              ctx.translate(canvas.width / 2, canvas.height / 2)
              ctx.rotate((angle * Math.PI) / 180)
              ctx.drawImage(
                video,
                -canvas.height / 2,
                -canvas.width / 2,
                canvas.height,
                canvas.width
              )
              ctx.restore()
            }

            const image = canvas.toDataURL("image/png")
            const result = await Tesseract.recognize(image, "eng", {
              // @ts-ignore
              tessedit_char_whitelist: "ABCDEFGHJKLMNPRSTUVWXYZ0123456789",
              // @ts-ignore
              tessedit_pageseg_mode: "6"
            })

            const text = result.data.text
            const vin = normalizeVin(text)
            if (vin && scanRef.current) {
              handleResult(vin)
              return
            }
          }
        } catch (e) {
          console.error("OCR Error:", e)
        } finally {
          isAiProcessingRef.current = false
          setIsAiProcessing(false)
        }
      }, 1500)
    }

    function stopScanner() {
      scanRef.current = false
      if (ocrIntervalRef.current) clearInterval(ocrIntervalRef.current)
      readerRef.current?.reset()
      try { Quagga.stop() } catch { }
      const buffer = document.querySelector('.drawingBuffer')
      if (buffer) buffer.parentElement?.remove()
      streamRef.current?.getTracks().forEach(t => t.stop())
    }

    startCamera()
    return () => stopScanner()
  }, [onScan])

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const next = !torch
    setTorch(next)
    await (track as any).applyConstraints({ advanced: [{ torch: next }] }).catch(() => { })
  }

  return (
    <div className="scanner-overlay fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between bg-gradient-to-b from-black/95 to-transparent z-20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.4)]">
            <BrainCircuit className="w-7 h-7 text-purple-400" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-white font-black text-xs uppercase tracking-[0.25em] leading-none mb-1">Industrial V16</h2>
            <div className="flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isAiProcessing ? "bg-purple-500 shadow-glow-purple" : "bg-green-500 shadow-glow-green")} />
              <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase italic">
                {isAiProcessing ? 'AI Processing Engine' : 'AI Vision Ready'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2.5">
          {hasTorch && (
            <button onClick={toggleTorch} className={cn("p-3.5 rounded-2xl border transition-all active:scale-90", torch ? "bg-yellow-400 text-black border-yellow-300 shadow-glow-yellow" : "bg-white/5 text-white/40 border-white/10")}>
              {torch ? <Lightbulb className="w-6 h-6" /> : <LightbulbOff className="w-6 h-6" />}
            </button>
          )}
          <button onClick={() => setDebugMode(!debugMode)} className={cn("p-3.5 rounded-2xl border transition-all active:scale-90", debugMode ? "bg-purple-600 text-white border-purple-400" : "bg-white/5 text-white/40 border-white/10")}>
            <Terminal className="w-6 h-6" />
          </button>
          <button onClick={onClose} className="p-3.5 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 active:scale-90 transition-all hover:bg-red-500 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {status === 'error' ? (
        <div className="text-center space-y-8 px-10 z-20">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <p className="text-white font-black text-xl uppercase italic tracking-tighter">Hardware Fault</p>
          <button onClick={onClose} className="bg-white text-black font-black py-5 px-10 rounded-2xl uppercase text-[10px] tracking-widest shadow-2xl">Voltar para Registro</button>
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-0">
          <div className="absolute inset-0 z-0">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="relative z-10 w-[94%] max-w-sm h-[180px] rounded-[3rem] border-2 border-purple-500/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] backdrop-blur-[1px]">
            <div className="absolute inset-x-12 h-[3px] bg-purple-500 shadow-[0_0_35px_rgba(168,85,247,1)] animate-laser-scan blur-[0.3px]" />
            <div className="absolute -top-1 -left-1 w-16 h-16 border-t-4 border-l-4 border-white rounded-tl-[3rem]" />
            <div className="absolute -top-1 -right-1 w-16 h-16 border-t-4 border-r-4 border-white rounded-tr-[3rem]" />
            <div className="absolute -bottom-1 -left-1 w-16 h-16 border-b-4 border-l-4 border-white rounded-bl-[3rem]" />
            <div className="absolute -bottom-1 -right-1 w-16 h-16 border-b-4 border-r-4 border-white rounded-br-[3rem]" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={cn("w-14 h-14 border border-white/10 rounded-full flex items-center justify-center transition-all duration-700", isAiProcessing ? "scale-115 border-purple-500/50" : "scale-100")}>
                <div className={cn("w-1.5 h-1.5 rounded-full shadow-lg transition-colors", isAiProcessing ? "bg-purple-500 shadow-purple-500/50" : "bg-red-500 shadow-red-500/50")} />
              </div>
            </div>
            <div className="absolute -bottom-16 inset-x-0 flex justify-center gap-3">
              <span className="text-[9px] text-white/90 font-black bg-white/5 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-2xl uppercase tracking-[0.2em]">Barcode Engine</span>
              <span className="text-[9px] text-purple-400 font-black bg-purple-500/10 px-4 py-2 rounded-xl border border-purple-500/20 backdrop-blur-2xl uppercase tracking-[0.2em]">AI OCR Engine</span>
            </div>
          </div>

          <div className="absolute bottom-32 inset-x-0 text-center px-10 space-y-4 z-20 pointer-events-none">
            <h3 className="text-white font-black text-3xl uppercase italic tracking-tighter drop-shadow-lg">Aponte para o VIN</h3>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed max-w-[320px] mx-auto">
              Mantenha o código horizontal a 20cm da lente. A IA detecta barcode e números gravados em 1080p.
            </p>

            {(debugMode || lastScan) && (
              <div className="mt-8 p-5 bg-black/95 border border-white/10 rounded-[2.5rem] shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-500">
                <div className="flex items-center gap-3 mb-4">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  <span className="text-[10px] text-purple-400 font-black uppercase tracking-[0.3em]">AI Stream Diagnostics</span>
                </div>
                <div className="space-y-3 font-mono">
                  <div className="bg-white/5 p-4 rounded-2xl flex justify-between items-center border border-white/5 shadow-inner">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Raw Output</span>
                    <span className="text-sm text-green-400 font-bold tracking-tight">{lastScan || 'SEARCHING...'}</span>
                  </div>
                  {debugMode && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                        <span className="text-[8px] text-slate-500 block uppercase font-bold mb-1">OCR Load</span>
                        <span className="text-[10px] text-white font-black italic">{isAiProcessing ? 'HIGH' : 'LOW'}</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                        <span className="text-[8px] text-slate-500 block uppercase font-bold mb-1">Resolution</span>
                        <span className="text-[10px] text-purple-400 font-black italic underline tracking-tighter">1920x1080 FHD</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="absolute bottom-8 inset-x-8 z-20">
            <button onClick={onClose} className="w-full py-5 bg-white/5 text-white/50 border border-white/10 rounded-[2rem] uppercase text-[11px] font-black tracking-[0.3em] backdrop-blur-2xl hover:text-white hover:bg-white/10 transition-all active:scale-95 shadow-xl">
              Encerrar Scanner
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes laser {
          0%, 100% { top: 10%; opacity: 0.95; }
          50% { top: 90%; opacity: 0.2; }
        }
        .animate-laser-scan { animation: laser 1.9s ease-in-out infinite; }
        .shadow-glow-purple { box-shadow: 0 0 15px rgba(168, 85, 247, 0.5); }
        .shadow-glow-green { box-shadow: 0 0 15px rgba(34, 197, 94, 0.4); }
        .shadow-glow-yellow { box-shadow: 0 0 25px rgba(253, 224, 71, 0.5); }
      `}</style>
    </div>
  )
}
