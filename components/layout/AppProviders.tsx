'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/stores/appStore'

// Thin provider that boots global data and the SSE listener
export default function AppProviders({ children }: { children: React.ReactNode }) {
  const { fetchEmployees, fetchDashboardStats, fetchRanking, updateFromWebSocket } = useAppStore()

  // Initial data fetch
  useEffect(() => {
    fetchEmployees()
    fetchDashboardStats()
    fetchRanking()
  }, [fetchEmployees, fetchDashboardStats, fetchRanking])

  // SSE real-time updates (substitui WebSocket)
  useEffect(() => {
    let es: EventSource
    let retryTimer: ReturnType<typeof setTimeout>

    function connect() {
      es = new EventSource('/api/events')

      es.onmessage = (e) => {
        try {
          const { type, data } = JSON.parse(e.data)
          if (type !== 'connected') {
            updateFromWebSocket(type, data)
          }
        } catch { /* ignora mensagens malformadas */ }
      }

      // EventSource reconecta automaticamente, mas caso seja erro fatal:
      es.onerror = () => {
        es.close()
        retryTimer = setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      clearTimeout(retryTimer)
      es?.close()
    }
  }, [updateFromWebSocket])

  return <>{children}</>
}
