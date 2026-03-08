import { create } from 'zustand'
import type { Employee, Production, RankingEntry, DashboardStats, ShiftConfig } from '@/types'
import { SHIFT_START, SHIFT_END } from '@/types'

interface AppStore {
  employees: Employee[]
  productions: Production[]
  ranking: RankingEntry[]
  dashboardStats: DashboardStats | null
  shiftConfig: ShiftConfig | null
  goalReached: boolean
  isLoading: boolean

  fetchEmployees: () => Promise<void>
  fetchProductions: (filters?: { employeeId?: string; vin?: string }) => Promise<void>
  fetchRanking: () => Promise<void>
  fetchDashboardStats: () => Promise<void>
  fetchShiftConfig: () => Promise<void>
  addProduction: (d: { vin: string; carVersion: string; employeeId: string }) => Promise<Production>
  createEmployee: (name: string) => Promise<void>
  updateEmployee: (id: string, data: { name?: string; active?: boolean }) => Promise<void>
  deleteEmployee: (id: string) => Promise<void>
  updateGoal: (newGoal: number) => Promise<void>
  updateShiftConfig: (shiftStart: string, shiftEnd: string) => Promise<void>
  setGoalReached: (v: boolean) => void
  updateFromWebSocket: (type: string, data: unknown) => void
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...init })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro desconhecido' }))
    throw new Error(err.message ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const useAppStore = create<AppStore>((set, get) => ({
  employees: [],
  productions: [],
  ranking: [],
  dashboardStats: null,
  shiftConfig: null,
  goalReached: false,
  isLoading: false,

  fetchEmployees: async () => {
    const r = await apiFetch<{ data: Employee[] }>('/api/employees')
    set({ employees: r.data || [] })
  },

  fetchProductions: async (filters) => {
    set({ isLoading: true })
    const params = new URLSearchParams()
    if (filters?.employeeId) params.set('employeeId', filters.employeeId)
    if (filters?.vin) params.set('vin', filters.vin)
    const r = await apiFetch<{ data: Production[] }>(`/api/productions?${params}`)
    set({ productions: r.data || [], isLoading: false })
  },

  fetchRanking: async () => {
    const r = await apiFetch<{ data: RankingEntry[] }>('/api/ranking')
    set({ ranking: r.data || [] })
  },

  fetchDashboardStats: async () => {
    const r = await apiFetch<{ data: DashboardStats }>('/api/dashboard')
    set({ dashboardStats: r.data || null })
    if (r.data.totalToday >= r.data.goal) set({ goalReached: true })
  },

  fetchShiftConfig: async () => {
    const r = await apiFetch<{ data: ShiftConfig }>('/api/config/shift')
    set({ shiftConfig: r.data || null })
  },

  addProduction: async (data) => {
    const r = await apiFetch<{ data: Production }>('/api/productions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    const prod = r.data

    // Optimistic update — atualiza o dashboard imediatamente sem esperar nova request
    set(s => {
      if (!s.dashboardStats) return s
      const currentHour = new Date().getHours().toString().padStart(2, '0')
      const existingHour = s.dashboardStats.hourlyData.find(h => h.hour === currentHour)
      let hourlyData = s.dashboardStats.hourlyData
      if (existingHour) {
        hourlyData = hourlyData.map(h =>
          h.hour === currentHour
            ? { ...h, count: h.count + 1, accumulated: h.accumulated + 1 }
            : h
        )
      } else {
        const lastAcc = hourlyData[hourlyData.length - 1]?.accumulated ?? 0
        hourlyData = [...hourlyData, { hour: currentHour, count: 1, accumulated: lastAcc + 1 }]
      }
      const newTotal = s.dashboardStats.totalToday + 1
      const newGoalReached = newTotal >= s.dashboardStats.goal
      return {
        dashboardStats: {
          ...s.dashboardStats,
          totalToday: newTotal,
          hourlyData,
          recentProductions: [prod, ...s.dashboardStats.recentProductions.slice(0, 19)],
        },
        goalReached: newGoalReached,
      }
    })

    // Atualiza ranking em background
    get().fetchRanking()
    return prod
  },

  createEmployee: async (name) => {
    const r = await apiFetch<{ data: Employee }>('/api/employees', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    set(s => ({ employees: [...s.employees, r.data] }))
  },

  updateEmployee: async (id, data) => {
    const r = await apiFetch<{ data: Employee }>(`/api/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    set(s => ({ employees: s.employees.map(e => e.id === id ? r.data : e) }))
  },

  deleteEmployee: async (id) => {
    await apiFetch(`/api/employees/${id}`, { method: 'DELETE' })
    set(s => ({ employees: s.employees.filter(e => e.id !== id) }))
  },

  updateGoal: async (newGoal) => {
    const r = await apiFetch<{ data: { goal: number } }>('/api/config/goal', {
      method: 'POST',
      body: JSON.stringify({ goal: newGoal }),
    })
    set(s => ({
      dashboardStats: s.dashboardStats ? { ...s.dashboardStats, goal: r.data.goal } : null,
      goalReached: s.dashboardStats ? s.dashboardStats.totalToday >= r.data.goal : false
    }))
  },

  updateShiftConfig: async (shiftStart, shiftEnd) => {
    const r = await apiFetch<{ data: ShiftConfig }>('/api/config/shift', {
      method: 'POST',
      body: JSON.stringify({ shiftStart, shiftEnd }),
    })
    set(s => ({
      shiftConfig: r.data,
      dashboardStats: s.dashboardStats
        ? { ...s.dashboardStats, shiftStart: r.data.shiftStart ?? SHIFT_START, shiftEnd: r.data.shiftEnd ?? SHIFT_END }
        : null,
    }))
  },

  setGoalReached: (v) => set({ goalReached: v }),

  updateFromWebSocket: (type, data) => {
    if (type === 'production_added') {
      const prod = data as Production
      set(s => {
        if (s.productions.some(p => p.id === prod.id)) return s
        return {
          productions: [prod, ...s.productions],
          dashboardStats: s.dashboardStats
            ? {
              ...s.dashboardStats,
              totalToday: s.dashboardStats.totalToday + 1,
              recentProductions: [prod, ...s.dashboardStats.recentProductions.slice(0, 9)],
            }
            : null,
        }
      })
    }
    if (type === 'ranking_updated') set({ ranking: data as RankingEntry[] })
    if (type === 'goal_reached') set({ goalReached: true })
    if (type === 'shift_reset') set({ goalReached: false, productions: [] })
  },
}))
