'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Zap, Camera } from 'lucide-react'
import { playBeep, vibrate } from '@/lib/utils'

interface Props { onScan: (vin: string) => void; onClose: () => void }

/**
 * Scanner VIN ultra-rápido.
 * - Usa câmera traseira com foco contínuo
 * - Escaneia a cada ~100ms para leitura instantânea
 * - Suporta CODE_128, CODE_39, DATA_MATRIX (formatos comuns de VIN automotivo)
 * - Aplica constraint de resolução HD para melhor leitura
 */
export default function VINScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scanRef = useRef(true)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting')
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    let codeReader: import('@zxing/library').BrowserMultiFormatReader | null = null
    let stream: MediaStream | null = null

    async function start() {
      try {
        const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library')

        const hints = new Map()
        // Formatos VIN automotivos — CODE_128 (mais comum), CODE_39, ITF, DATA_MATRIX
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.ITF,
          BarcodeFormat.DATA_MATRIX,
          BarcodeFormat.QR_CODE,
        ])
        hints.set(DecodeHintType.TRY_HARDER, true)

        // Intervalo de scan mais rápido: 100ms em vez do padrão ~500ms
        codeReader = new BrowserMultiFormatReader(hints, 100)

        // Solicitar câmera traseira com foco automático e resolução HD
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            // @ts-ignore - focusMode é suportado em dispositivos modernos
            focusMode: { ideal: 'continuous' },
          },
        }

        // Iniciar câmera manualmente para ter controle sobre constraints
        stream = await navigator.mediaDevices.getUserMedia(constraints)

        // Tentar ativar autofocus contínuo e torch (lanterna)
        const track = stream.getVideoTracks()[0]
        if (track) {
          try {
            // @ts-ignore - advanced constraints
            const capabilities = track.getCapabilities?.()
            if (capabilities) {
              const advancedConstraints: any = {}
              // @ts-ignore
              if (capabilities.focusMode?.includes('continuous')) {
                advancedConstraints.focusMode = 'continuous'
              }
              if (Object.keys(advancedConstraints).length > 0) {
                // @ts-ignore
                await track.applyConstraints({ advanced: [advancedConstraints] })
              }
            }
          } catch { /* nem todos dispositivos suportam */ }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        if (scanRef.current && videoRef.current) {
          setStatus('scanning')

          // Scan contínuo com callback
          codeReader.decodeFromVideoElementContinuously(videoRef.current, (result, err) => {
            if (result && scanRef.current) {
              const rawText = result.getText()
              // Limpar caracteres inválidos de VIN
              const clean = rawText.replace(/[^A-HJ-NPR-Z0-9]/gi, '').toUpperCase()

              if (clean.length >= 17) {
                scanRef.current = false
                playBeep()
                vibrate([100, 50, 100])
                onScan(clean.slice(0, 17))

                // Parar câmera e reader
                if (codeReader) codeReader.reset()
                if (stream) stream.getTracks().forEach(t => t.stop())
              }
            }
          })
        }

      } catch (err) {
        if (!scanRef.current) return // Ignorar erros pós-desmontagem
        setStatus('error')
        const e = err as Error
        setErrMsg(
          e.name === 'NotAllowedError' ? 'Permissão de câmera negada. Libere o acesso nas configurações do navegador.' :
            e.name === 'NotFoundError' ? 'Nenhuma câmera encontrada neste dispositivo.' :
              e.name === 'NotReadableError' ? 'Câmera em uso por outro aplicativo.' :
                `Erro: ${e.message}`,
        )
      }
    }

    start()
    return () => {
      scanRef.current = false
      codeReader?.reset()
      if (stream) stream.getTracks().forEach(t => t.stop())
    }
  }, [onScan])

  return (
    <div className="scanner-overlay">
      <div className="w-full max-w-sm px-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-green-400" />
          <span className="text-white font-bold text-lg display uppercase tracking-wide">Scanner VIN</span>
        </div>
        <button onClick={onClose} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-700">
          <X className="w-5 h-5" />
        </button>
      </div>

      {status === 'error' ? (
        <div className="text-center px-6 max-w-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
            <Camera className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-white font-bold">Erro no Scanner</p>
          <p className="text-slate-400 text-sm">{errMsg}</p>
          <button onClick={onClose} className="bg-green-500 text-slate-900 font-bold px-8 py-3 rounded-xl w-full">Fechar</button>
        </div>
      ) : (
        <>
          <div className="scanner-frame">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
            {status === 'scanning' && <div className="scanner-line" />}
            <div className="sc-corner sc-tl" />
            <div className="sc-corner sc-tr" />
            <div className="sc-corner sc-bl" />
            <div className="sc-corner sc-br" />
          </div>

          <div className="mt-6 text-center px-6">
            {status === 'starting'
              ? <p className="text-slate-400">Iniciando câmera...</p>
              : <>
                <p className="text-white font-medium">Aponte para o código de barras do VIN</p>
                <p className="text-green-400 text-sm mt-1 font-bold animate-pulse">⚡ Leitura ultra-rápida ativa</p>
              </>
            }
          </div>
          <button onClick={onClose} className="mt-8 px-8 py-3 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-xl transition-all font-medium">
            Cancelar
          </button>
        </>
      )}
    </div>
  )
}
