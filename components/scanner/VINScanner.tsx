'use client'

import { useEffect, useRef, useState } from "react"
// @ts-ignore - Quagga types are often incomplete
import Quagga from "quagga"
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from "@zxing/library"
import { X, Zap, Lightbulb, LightbulbOff, AlertCircle, Scan, Terminal, Cpu } from "lucide-react"
import { playBeep, vibrate, cn } from "@/lib/utils"

interface Props {
  onScan: (vin: string) => void
  onClose: () => void
}

/**
 * SCANNER VIN V11 INDUSTRIAL HUD
 * - Motores: ZXing (Multi) + QuaggaJS (Industrial 1D/Code128)
 * - FIX: Desacoplamento de alvo (Quagga -> document.body)
 * - FIX: Locator Ativo (patchSize: medium) para barras finas
 * - Otimização: PURE_BARCODE: false e Regex ISO 3779 v4
 */
export default function VINScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const scanRef = useRef(true)

  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting')
  const [lastScan, setLastScan] = useState("")
  const [torch, setTorch] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [debugMode, setDebugMode] = useState(false)

  useEffect(() => {
    async function startCamera() {
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            // @ts-ignore
            focusMode: 'continuous'
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        streamRef.current = stream

        const track = stream.getVideoTracks()[0]
        const caps: any = track.getCapabilities?.() || {}
        if (caps.torch) setHasTorch(true)

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        setStatus("scanning")

        // Inicia os motores
        startZXing()
        startQuagga()

      } catch (err) {
        setStatus("error")
      }
    }

    function processVin(text: string) {
      if (!scanRef.current) return

      // Limpeza Sugerida: Remove TUDO que não é caractere de VIN válido (Exceto I,O,Q que serão trocados)
      // Nota: Mantemos [A-Z0-9] para depois normalizar O/I/Q
      const clean = text
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")

      if (clean.length < 17) return

      // Pega os últimos 17 (padrão Nissan/Industrial)
      const rawVin = clean.slice(-17)

      // Normalização ISO 3779
      const finalVin = rawVin
        .replace(/O/g, "0")
        .replace(/I/g, "1")
        .replace(/Q/g, "0")

      // Validação final estrita (sem I, O, Q)
      if (/^[A-HJ-NPR-Z0-9]{17}$/.test(finalVin)) {
        scanRef.current = false
        playBeep()
        vibrate([100, 50, 100])
        stopScanner()
        onScan(finalVin)
      }
    }

    function startZXing() {
      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.DATA_MATRIX
      ])
      hints.set(DecodeHintType.TRY_HARDER, true)

      // Ajuste sugerido: PURE_BARCODE false para leitura em ambientes reais
      hints.set(DecodeHintType.PURE_BARCODE, false)

      const reader = new BrowserMultiFormatReader(hints, 50)
      readerRef.current = reader

      reader.decodeFromVideoElementContinuously(
        videoRef.current!,
        (result) => {
          if (result && scanRef.current) {
            const text = result.getText()
            setLastScan(text)
            processVin(text)
          }
        }
      )
    }

    function startQuagga() {
      // Ajuste Sugerido: Target document.body para evitar conflito com elemento <video>
      Quagga.init({
        inputStream: {
          type: "LiveStream",
          target: document.body,
          constraints: {
            facingMode: "environment",
            width: 1920,
            height: 1080
          }
        },
        // Ajuste Sugerido: Locator Ativo para barras finas
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        decoder: {
          readers: [
            "code_128_reader",
            "code_39_reader"
          ],
          multiple: false
        },
        locate: true,
        frequency: 10
      }, function (err: any) {
        if (!err && scanRef.current) {
          // Ocultamos o vídeo extra criado pelo Quagga se ele for pro body
          const quaggaVideo = document.querySelector('.drawingBuffer')?.parentElement?.querySelector('video');
          if (quaggaVideo) quaggaVideo.style.display = 'none';

          Quagga.start()
        }
      })

      Quagga.onDetected((result: any) => {
        if (result && scanRef.current) {
          const text = result.codeResult.code
          setLastScan(text)
          processVin(text)
        }
      })
    }

    function stopScanner() {
      scanRef.current = false
      readerRef.current?.reset()
      try {
        Quagga.stop()
      } catch (e) { }

      // Limpeza do body (se o Quagga tiver deixado algo)
      const buffer = document.querySelector('.drawingBuffer');
      if (buffer) buffer.parentElement?.remove();

      streamRef.current?.getTracks().forEach(track => track.stop())
    }

    startCamera()

    return () => {
      stopScanner()
    }
  }, [onScan])

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const next = !torch
    setTorch(next)
    await (track as any).applyConstraints({
      advanced: [{ torch: next }]
    }).catch(() => { })
  }

  return (
    <div className="scanner-overlay fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* HUD Superior Industrial V11 */}
      <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between bg-gradient-to-b from-black/95 to-transparent z-20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-glow-blue-sm">
            <Scan className="w-7 h-7 text-blue-400" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-white font-black text-sm uppercase tracking-[0.2em] leading-none mb-1">Industrial V11</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[9px] text-blue-400 font-black tracking-widest uppercase italic">Optimized Vision Fix</span>
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
        <div className="text-center space-y-8 px-10 z-20 animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(239,68,68,0.2)]">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <div className="space-y-3">
            <p className="text-white font-black text-2xl uppercase tracking-tighter italic">Erro de Visão</p>
            <p className="text-slate-500 text-sm leading-relaxed">Não foi possível acessar a câmera do dispositivo.</p>
          </div>
          <button onClick={onClose} className="bg-white text-black font-black py-5 px-12 rounded-3xl uppercase text-[10px] tracking-[0.3em] shadow-2xl transition-all">Digitar Manualmente</button>
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-0">
          {/* Câmera */}
          <div className="absolute inset-0 z-0">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
          </div>

          {/* Mira Industrial V11 (Fix Focused Area) */}
          <div className="relative z-10 w-[92%] h-[180px] rounded-[2.5rem] border-2 border-blue-500/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] backdrop-blur-[1px]">
            {/* Linha Laser Laser Scan */}
            <div className="absolute inset-x-8 h-[2px] bg-red-500 shadow-[0_0_30px_rgba(239,68,68,1)] animate-laser-scan" />

            {/* Cantos de Foco High Contrast */}
            <div className="absolute -top-1 -left-1 w-14 h-14 border-t-4 border-l-4 border-white rounded-tl-[2.2rem]" />
            <div className="absolute -top-1 -right-1 w-14 h-14 border-t-4 border-r-4 border-white rounded-tr-[2.2rem]" />
            <div className="absolute -bottom-1 -left-1 w-14 h-14 border-b-4 border-l-4 border-white rounded-bl-[2.2rem]" />
            <div className="absolute -bottom-1 -right-1 w-14 h-14 border-b-4 border-r-4 border-white rounded-br-[2.2rem]" />

            {/* Retículo Central */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <div className="w-12 h-12 border border-white rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              </div>
            </div>

            {/* Info Engine */}
            <div className="absolute -bottom-12 inset-x-0 text-center">
              <div className="inline-flex items-center gap-2 bg-black/70 px-4 py-2 rounded-full border border-white/10 backdrop-blur-xl">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] text-white/90 font-black uppercase tracking-[0.25em]">Vision Engine V11 Fix</span>
              </div>
            </div>
          </div>

          {/* Instruções Dinâmicas */}
          <div className="absolute bottom-28 inset-x-0 text-center px-10 space-y-3 z-20 pointer-events-none">
            <h3 className="text-white font-black text-2xl uppercase italic tracking-tighter">Escaneamento de Chassi</h3>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-[300px] mx-auto">
              Mantenha a etiqueta horizontal e a 20cm de distância. Luz forte é essencial.
            </p>

            {/* Terminal de Diagnóstico */}
            {(debugMode || lastScan) && (
              <div className="mt-8 p-4 bg-black/95 border border-white/10 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[9px] text-blue-400 font-black uppercase tracking-widest">Diagnostic Terminal</span>
                </div>
                <div className="space-y-2 text-left font-mono">
                  <div className="bg-white/5 p-2 rounded-lg flex justify-between items-center border border-white/5">
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Input</span>
                    <span className="text-xs text-green-400 font-bold tracking-wider">{lastScan || 'AWAITING DATA'}</span>
                  </div>
                  {debugMode && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                        <span className="text-[8px] text-slate-500 block uppercase font-bold">Resolução</span>
                        <span className="text-[10px] text-white font-bold italic">1920x1080 FHD</span>
                      </div>
                      <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                        <span className="text-[8px] text-slate-500 block uppercase font-bold">Locator</span>
                        <span className="text-[10px] text-blue-400 font-bold italic underline">Enabled (Medium)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sair Footer */}
          <div className="absolute bottom-8 inset-x-0 px-8 z-20">
            <button onClick={onClose} className="w-full py-4 bg-white/5 text-white/50 border border-white/10 rounded-2xl uppercase text-[10px] font-black tracking-[0.2em] backdrop-blur-md hover:text-white transition-all active:scale-95">
              Fechar Scanner
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes laser {
          0%, 100% { top: 10%; opacity: 0.95; }
          50% { top: 90%; opacity: 0.2; }
        }
        .animate-laser-scan {
          animation: laser 1.8s ease-in-out infinite;
        }
        .shadow-glow-blue-sm {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
        }
        .shadow-glow-yellow {
          box-shadow: 0 0 25px rgba(253, 224, 71, 0.5);
        }
      `}</style>
    </div>
  )
}
