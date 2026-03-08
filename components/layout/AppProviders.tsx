'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/stores/appStore'

// Thin provider that boots global data and the WebSocket listener
export default function AppProviders({ children }: { children: React.ReactNode }) {
  const { fetchEmployees, fetchDashboardStats, fetchRanking, updateFromWebSocket } = useAppStore()

  // Initial data fetch
  useEffect(() => {
    fetchEmployees()
    fetchDashboardStats()
    fetchRanking()
  }, [fetchEmployees, fetchDashboardStats, fetchRanking])

  // WebSocket real-time updates
  useEffect(() => {
    const WS_URL =
      process.env.NEXT_PUBLIC_WS_URL ??
      (typeof window !== 'undefined'
        ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
        : 'ws://localhost:3000/ws')

    let ws: WebSocket
    let retryTimer: ReturnType<typeof setTimeout>

    function connect() {
      ws = new WebSocket(WS_URL)

      ws.onmessage = (e) => {
        try {
          const { type, data } = JSON.parse(e.data)
          updateFromWebSocket(type, data)
        } catch { /* ignore */ }
      }

      ws.onclose = () => {
        retryTimer = setTimeout(connect, 3000)
      }
    }

    connect()
    return () => {
      clearTimeout(retryTimer)
      ws?.close()
    }
  }, [updateFromWebSocket])

  return <>{children}</>
}
