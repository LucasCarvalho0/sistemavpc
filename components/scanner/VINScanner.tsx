'use client'

import { useEffect, useRef, useState } from "react"
// @ts-ignore - Quagga types are often incomplete
import Quagga from "quagga"
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from "@zxing/library"
import Tesseract from "tesseract.js"
import { X, Zap, Lightbulb, LightbulbOff, AlertCircle, Scan, Terminal, Cpu, BrainCircuit } from "lucide-react"
import { playBeep, vibrate, cn } from "@/lib/utils"

interface Props {
  onScan: (vin: string) => void
  onClose: () => void
}

/**
 * SCANNER VIN V12 AI VISION (NÍVEL MONTADORA)
 * - Motores: ZXing + QuaggaJS + Tesseract.js (IA/OCR)
 * - Funcionalidade: Lê barcode E VIN gravado no metal (chassi)
 * - Resolução: 1080p FHD para precisão de OCR
 * - HUD: Vision Lab HUD com modo AI e Retículo de Chassi
 */
export default function VINScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const scanRef = useRef(true)
  const ocrIntervalRef = useRef<NodeJS.Timeout | null>(null)

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

        // Inicia o TRIO de motores
        startZXing()
        startQuagga()
        startOCRLoop()

      } catch (err) {
        setStatus("error")
      }
    }

    function normalizeVin(text: string) {
      if (!text) return null

      const clean = text
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")

      if (clean.length < 17) return null

      // Pega os últimos 17 (padrão Nissan/Industrial)
      const rawVin = clean.slice(-17)

      // Normalização ISO 3779 (O->0, I->1, Q->0)
      const vin = rawVin
        .replace(/O/g, "0")
        .replace(/I/g, "1")
        .replace(/Q/g, "0")

      if (/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
        return vin
      }
      return null
    }

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
        BarcodeFormat.DATA_MATRIX
      ])
      hints.set(DecodeHintType.TRY_HARDER, true)
      hints.set(DecodeHintType.PURE_BARCODE, false)

      const reader = new BrowserMultiFormatReader(hints, 150)
      readerRef.current = reader

      reader.decodeFromVideoElementContinuously(
        videoRef.current!,
        (result) => {
          if (result && scanRef.current) {
            const text = result.getText()
            setLastScan(text)
            handleResult(text)
          }
        }
      )
    }

    function startQuagga() {
      Quagga.init({
        inputStream: {
          type: "LiveStream",
          target: document.body, // Desacoplado para evitar conflito de vídeo
          constraints: {
            facingMode: "environment",
            width: 1920,
            height: 1080
          }
        },
        locator: {
          patchSize: "large", // Aumentado conforme V12
          halfSample: true
        },
        decoder: {
          readers: ["code_128_reader", "code_39_reader"],
          multiple: false
        },
        locate: true,
        frequency: 10
      }, function (err: any) {
        if (!err && scanRef.current) {
          const qVideo = document.querySelector('.drawingBuffer')?.parentElement?.querySelector('video');
          if (qVideo) qVideo.style.display = 'none';
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
        if (!scanRef.current || !videoRef.current || !canvasRef.current || isAiProcessing) return

        try {
          setIsAiProcessing(true)
          const canvas = canvasRef.current
          const ctx = canvas.getContext("2d")
          if (!ctx) return

          canvas.width = videoRef.current.videoWidth
          canvas.height = videoRef.current.videoHeight
          ctx.drawImage(videoRef.current, 0, 0)

          const image = canvas.toDataURL("image/png")

          const result = await Tesseract.recognize(
            image,
            "eng",
            { logger: () => { } }
          )

          if (scanRef.current) {
            const text = result.data.text
            const vin = normalizeVin(text)
            if (vin) {
              handleResult(vin)
            }
          }
        } catch (e) {
          console.error("OCR Error:", e)
        } finally {
          setIsAiProcessing(false)
        }
      }, 3000) // Loop de 3 segundos para não pesar no celular
    }

    function stopScanner() {
      scanRef.current = false
      if (ocrIntervalRef.current) clearInterval(ocrIntervalRef.current)
      readerRef.current?.reset()
      try { Quagga.stop() } catch { }

      const buffer = document.querySelector('.drawingBuffer');
      if (buffer) buffer.parentElement?.remove();

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
      {/* HUD Superior V12 AI */}
      <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between bg-gradient-to-b from-black/95 to-transparent z-20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            <BrainCircuit className="w-7 h-7 text-purple-400" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-white font-black text-sm uppercase tracking-[0.2em] leading-none mb-1">Industrial V12</h2>
            <div className="flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isAiProcessing ? "bg-purple-500" : "bg-green-500")} />
              <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase">
                {isAiProcessing ? 'AI Processing...' : 'AI Vision Active'}
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
          <button onClick={() => setDebugMode(!debugMode)} className={cn("p-3.5 rounded-2xl border transition-all active:scale-90", debugMode ? "bg-blue-600 text-white border-blue-400" : "bg-white/5 text-white/40 border-white/10")}>
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
          <p className="text-white font-black text-xl uppercase italic tracking-tighter">Hardware Error</p>
          <button onClick={onClose} className="bg-white text-black font-black py-4 px-10 rounded-2xl uppercase text-[10px] tracking-widest">Digitar VIN</button>
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-0">
          {/* Câmera Traseira */}
          <div className="absolute inset-0 z-0">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Mira AI Vision (Chassi + Barcode) */}
          <div className="relative z-10 w-[92%] h-[200px] rounded-[3rem] border-2 border-purple-500/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] backdrop-blur-[1px]">
            {/* Linha Laser Scan (AI Mode) */}
            <div className="absolute inset-x-10 h-[2px] bg-purple-500 shadow-[0_0_30px_rgba(168,85,247,1)] animate-laser-scan blur-[0.5px]" />

            {/* Cantos de Foco Premium */}
            <div className="absolute -top-1 -left-1 w-16 h-16 border-t-4 border-l-4 border-white rounded-tl-[3rem]" />
            <div className="absolute -top-1 -right-1 w-16 h-16 border-t-4 border-r-4 border-white rounded-tr-[3rem]" />
            <div className="absolute -bottom-1 -left-1 w-16 h-16 border-b-4 border-l-4 border-white rounded-bl-[3rem]" />
            <div className="absolute -bottom-1 -right-1 w-16 h-16 border-b-4 border-r-4 border-white rounded-br-[3rem]" />

            {/* Status do Motor no Centro */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={cn("w-12 h-12 border border-white/20 rounded-full flex items-center justify-center transition-all duration-1000", isAiProcessing ? "scale-125 border-purple-500" : "scale-100")}>
                <Cpu className={cn("w-5 h-5 transition-colors", isAiProcessing ? "text-purple-400" : "text-white/20")} />
              </div>
            </div>

            {/* Labels de Identificação */}
            <div className="absolute -bottom-14 inset-x-0 flex justify-center gap-3">
              <span className="text-[10px] text-white/80 font-black bg-black/80 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-xl uppercase tracking-widest">Barcode Engine</span>
              <span className="text-[10px] text-purple-400 font-black bg-purple-500/10 px-4 py-2 rounded-xl border border-purple-500/20 backdrop-blur-xl uppercase tracking-widest">OCR AI Engine</span>
            </div>
          </div>

          {/* Instruções e Terminal */}
          <div className="absolute bottom-28 inset-x-0 text-center px-10 space-y-4 z-20 pointer-events-none">
            <h3 className="text-white font-black text-2xl uppercase italic tracking-tighter">Visão Computacional V12</h3>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-[320px] mx-auto">
              Aponte para o código de barras ou para o VIN gravado no metal. A IA irá reconstruir os dados.
            </p>

            {/* Terminal de Diagnóstico */}
            {(debugMode || lastScan) && (
              <div className="mt-8 p-4 bg-black/95 border border-white/10 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  <span className="text-[10px] text-purple-400 font-black uppercase tracking-widest">V12 AI Analytics</span>
                </div>
                <div className="space-y-3 font-mono">
                  <div className="bg-white/5 p-3 rounded-2xl flex justify-between items-center border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Raw Data</span>
                    <span className="text-sm text-green-400 font-bold tracking-tight">{lastScan || 'PENDING...'}</span>
                  </div>
                  {debugMode && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                        <span className="text-[9px] text-slate-500 block uppercase font-bold">OCR Status</span>
                        <span className="text-[11px] text-white font-black">{isAiProcessing ? 'ANALYIZING' : 'IDLE'}</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                        <span className="text-[9px] text-slate-500 block uppercase font-bold">Res FHD</span>
                        <span className="text-[11px] text-purple-400 font-black">1920x1080</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer UI */}
          <div className="absolute bottom-8 inset-x-8 z-20">
            <button onClick={onClose} className="w-full py-5 bg-white/5 text-white/50 border border-white/10 rounded-[2rem] uppercase text-[11px] font-black tracking-[0.3em] backdrop-blur-xl hover:text-white transition-all active:scale-95">
              Encerrar AI Scan
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes laser {
          0%, 100% { top: 15%; opacity: 0.9; }
          50% { top: 85%; opacity: 0.15; }
        }
        .animate-laser-scan {
          animation: laser 2.2s ease-in-out infinite;
        }
        .shadow-glow-yellow {
          box-shadow: 0 0 25px rgba(253, 224, 71, 0.4);
        }
      `}</style>
    </div>
  )
}
