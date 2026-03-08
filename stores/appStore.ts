import { create } from 'zustand'
import type { Employee, Production, RankingEntry, DashboardStats } from '@/types'

interface AppStore {
  employees: Employee[]
  productions: Production[]
  ranking: RankingEntry[]
  dashboardStats: DashboardStats | null
  goalReached: boolean
  isLoading: boolean

  fetchEmployees: () => Promise<void>
  fetchProductions: (filters?: { employeeId?: string; vin?: string }) => Promise<void>
  fetchRanking: () => Promise<void>
  fetchDashboardStats: () => Promise<void>
  addProduction: (d: { vin: string; carVersion: string; employeeId: string }) => Promise<Production>
  createEmployee: (name: string) => Promise<void>
  updateEmployee: (id: string, data: { name?: string; active?: boolean }) => Promise<void>
  deleteEmployee: (id: string) => Promise<void>
  updateGoal: (newGoal: number) => Promise<void>
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

  addProduction: async (data) => {
    const r = await apiFetch<{ data: Production }>('/api/productions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    get().fetchDashboardStats()
    get().fetchRanking()
    return r.data
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
