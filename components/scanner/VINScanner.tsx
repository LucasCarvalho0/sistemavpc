'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Zap } from 'lucide-react'
import { playBeep, vibrate } from '@/lib/utils'

interface Props { onScan: (vin: string) => void; onClose: () => void }

export default function VINScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanRef = useRef(true)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting')
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    let codeReader: import('@zxing/library').BrowserMultiFormatReader | null = null

    async function start() {
      try {
        const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library')

        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.CODE_39]) // VINs are usually Code 128 or 39

        codeReader = new BrowserMultiFormatReader(hints)

        if (scanRef.current) {
          // continuous scanning
          codeReader.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
            if (result && scanRef.current) {
              const clean = result.getText().replace(/[^A-HJ-NPR-Z0-9]/gi, '').toUpperCase()
              if (clean.length >= 17) {
                scanRef.current = false
                playBeep()
                vibrate([100, 50, 100])
                onScan(clean.slice(0, 17))
                if (codeReader) codeReader.reset()
              }
            }
          }).then(() => {
            if (scanRef.current) setStatus('scanning')
          }).catch(err => {
            // Ignore interruption error which happens on unmount
            if (err.name === 'NotReadableError' || err.message?.includes('interrupted')) {
              return
            }
            if (scanRef.current) {
              setStatus('error')
              setErrMsg(`Erro ao iniciar câmera: ${err.message}`)
            }
          })
        }

      } catch (err) {
        setStatus('error')
        const e = err as Error
        setErrMsg(
          e.name === 'NotAllowedError' ? 'Permissão de câmera negada.' :
            e.name === 'NotFoundError' ? 'Câmera não encontrada.' :
              `Erro: ${e.message}`,
        )
      }
    }

    start()
    return () => {
      scanRef.current = false
      codeReader?.reset()
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
            <X className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-white font-bold">Erro no Scanner</p>
          <p className="text-slate-400 text-sm">{errMsg}</p>
          <button onClick={onClose} className="bg-green-500 text-slate-900 font-bold px-8 py-3 rounded-xl w-full">Fechar</button>
        </div>
      ) : (
        <>
          <div className="scanner-frame">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
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
                <p className="text-slate-500 text-sm mt-1">Detecção automática — menos de 1 segundo</p>
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
