'use client'

import { useEffect, useRef, useState } from "react"
// Usamos @zxing/library para o leitor pois a API de 'continuously' é mais estável e completa
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from "@zxing/library"
import { X, Zap, Lightbulb, LightbulbOff, AlertCircle, Scan, Terminal } from "lucide-react"
import { playBeep, vibrate, cn } from "@/lib/utils"

interface Props {
  onScan: (vin: string) => void
  onClose: () => void
}

/**
 * SCANNER VIN V7 INDUSTRIAL (PRO PATTERN)
 * - Motor: @zxing/library (Configuração de Alta Precisão)
 * - Otimização: Code 128 e Code 39 (Padrão Automotivo)
 * - Mira: Industrial Vision com Retículo e Laser Scan
 * - Inteligência: Normalização ISO 3779 (O->0, I->1, Q->0)
 */
export default function VINScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting')
  const [lastScan, setLastScan] = useState("")
  const [torch, setTorch] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [debugMode, setDebugMode] = useState(false)

  useEffect(() => {
    async function startScanner() {
      const hints = new Map()
      // Formatos específicos para VIN automotivo
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.DATA_MATRIX
      ])
      hints.set(DecodeHintType.TRY_HARDER, true)

      // Inicialização do leitor
      const reader = new BrowserMultiFormatReader(hints)
      readerRef.current = reader

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          // @ts-ignore
          focusMode: 'continuous'
        }
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        streamRef.current = stream

        const track = stream.getVideoTracks()[0]
        const caps: any = track.getCapabilities?.() || {}
        if (caps.torch) setHasTorch(true)

        // Forçar foco contínuo se disponível
        const advanced: any = {}
        if (caps.focusMode?.includes('continuous')) advanced.focusMode = 'continuous'
        if (Object.keys(advanced).length > 0) {
          await track.applyConstraints({ advanced: [advanced] } as any).catch(() => { })
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        setStatus("scanning")

        // decodeFromVideoElementContinuously está disponível no @zxing/library
        reader.decodeFromVideoElementContinuously(
          videoRef.current!,
          (result, err) => {
            if (result) {
              const text = result.getText().toUpperCase()
              setLastScan(text)

              // REGEX NISSAN/AUTOMOTIVA: Captura os 17 caracteres
              const vinMatch = text.match(/[A-HJ-NPR-Z0-9]{17}/)
              if (!vinMatch) {
                // Tenta limpar se tiver lixo (prefixos S, V, P)
                const clean = text.replace(/[^A-HJ-NPR-Z0-9]/g, '')
                if (clean.length >= 17) {
                  processVin(clean.slice(-17))
                }
                return
              }

              processVin(vinMatch[0])
            }
          }
        )
      } catch (err) {
        setStatus("error")
      }
    }

    function processVin(vin: string) {
      // NORMALIZAÇÃO DE CARACTERES (O->0, I->1, Q->0)
      const normalized = vin
        .replace(/O/g, "0")
        .replace(/I/g, "1")
        .replace(/Q/g, "0")

      if (/^[A-HJ-NPR-Z0-9]{17}$/.test(normalized)) {
        playBeep()
        vibrate([100, 50, 100])

        // Limpeza de recursos
        readerRef.current?.reset()
        streamRef.current?.getTracks().forEach(t => t.stop())

        onScan(normalized)
      }
    }

    startScanner()
    return () => {
      readerRef.current?.reset()
      streamRef.current?.getTracks().forEach(t => t.stop())
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
      {/* HUD Superior (Premium Design) */}
      <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between bg-gradient-to-b from-black/95 to-transparent z-20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-glow-blue-sm">
            <Scan className="w-7 h-7 text-blue-400" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-white font-black text-sm uppercase tracking-[0.2em] leading-none mb-1">Industrial V7</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[9px] text-blue-400/80 uppercase font-black tracking-widest">Vision System Active</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2.5">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={cn(
                "p-3.5 rounded-2xl border transition-all active:scale-90",
                torch ? "bg-yellow-400 text-black border-yellow-300 shadow-glow-yellow" : "bg-white/5 text-white/40 border-white/10"
              )}
            >
              {torch ? <Lightbulb className="w-6 h-6" /> : <LightbulbOff className="w-6 h-6" />}
            </button>
          )}
          <button
            onClick={() => setDebugMode(!debugMode)}
            className={cn(
              "p-3.5 rounded-2xl border transition-all active:scale-90",
              debugMode ? "bg-blue-600 text-white border-blue-400" : "bg-white/5 text-white/40 border-white/10"
            )}
          >
            <Terminal className="w-6 h-6" />
          </button>
          <button
            onClick={onClose}
            className="p-3.5 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 active:scale-90 transition-all hover:bg-red-500 hover:text-white"
          >
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
            <p className="text-white font-black text-2xl uppercase tracking-tighter italic">Erro de Hardware</p>
            <p className="text-slate-500 text-sm leading-relaxed">Não foi possível acessar a câmera traseira do dispositivo.</p>
          </div>
          <button onClick={onClose} className="bg-white text-black font-black py-5 px-12 rounded-3xl uppercase text-[10px] tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all">Digitar Manualmente</button>
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-0">
          {/* Câmera Traseira */}
          <div className="absolute inset-0 z-0">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            {/* Overlay de Sombra */}
            <div className="absolute inset-0 bg-black/40" />
          </div>

          {/* Mira Industrial (Aiming Reticle) */}
          <div className="relative z-10 w-[92%] max-w-sm h-[180px] rounded-[2.5rem] border-2 border-white/10 flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] backdrop-blur-[1px]">
            {/* Linha Laser (Scan Animation) */}
            <div className="absolute inset-x-8 h-[2px] bg-red-500/80 shadow-[0_0_20px_rgba(239,68,68,1)] animate-laser-scan" />

            {/* Cantos de Foco (High Contrast) */}
            <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-3xl shadow-glow-blue-sm" />
            <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-3xl shadow-glow-blue-sm" />
            <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-3xl shadow-glow-blue-sm" />
            <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-3xl shadow-glow-blue-sm" />

            {/* Retículo de Centro */}
            <div className="w-8 h-8 border border-white/20 rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
            </div>

            {/* Status Indicador no Quadro */}
            <div className="absolute -bottom-12 inset-x-0 text-center">
              <span className="text-[10px] text-white/60 font-black uppercase tracking-[0.3em] bg-black/60 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                {status === 'starting' ? 'Inicializando Sensor...' : 'Aguardando VIN'}
              </span>
            </div>
          </div>

          {/* Texto de Ajuda e Debug */}
          <div className="absolute bottom-24 inset-x-0 text-center px-10 space-y-4 z-20 pointer-events-none">
            <h3 className="text-white font-black text-2xl uppercase italic tracking-tighter">Posicionamento Industrial</h3>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-[280px] mx-auto">
              Mantenha o código a 15-20cm de distância. O sistema extrai o VIN de 17 dígitos automaticamente.
            </p>

            {/* Debug Console */}
            {(debugMode || lastScan) && (
              <div className="mt-8 p-4 bg-black/80 border border-white/10 rounded-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <Terminal className="w-3 h-3 text-blue-400" />
                  <span className="text-[9px] text-blue-400 font-black uppercase tracking-widest">Terminal de Visão</span>
                </div>
                <div className="flex flex-col gap-1 text-left font-mono">
                  <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Último Scan</span>
                    <span className="text-[11px] text-green-400 font-bold tracking-wider">{lastScan || '---'}</span>
                  </div>
                  {debugMode && (
                    <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                      <span className="text-[9px] text-slate-500 uppercase font-bold">Status Sensor</span>
                      <span className="text-[10px] text-blue-400 font-bold">@zxing/library v7</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Botão Sair Trasparente */}
          <div className="absolute bottom-8 inset-x-0 px-8 z-20">
            <button
              onClick={onClose}
              className="w-full py-4 bg-white/5 text-white/50 border border-white/10 rounded-2xl uppercase text-[10px] font-black tracking-[0.2em] backdrop-blur-md hover:text-white transition-all active:scale-95"
            >
              Cancelar Operação
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes laser {
          0%, 100% { top: 15%; opacity: 0.8; }
          50% { top: 85%; opacity: 0.2; }
        }
        .animate-laser-scan {
          animation: laser 1.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
