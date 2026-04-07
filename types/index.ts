export interface Employee {
  id: string
  name: string
  registration: string
  shift: number
  active: boolean
  createdAt: string
}

export interface Production {
  id: string
  vin: string
  carVersion: string
  employeeId: string
  employee?: Employee
  shiftDate: string
  createdAt: string
}

export interface HourlyData {
  hour: string
  count: number
  accumulated: number
}

export interface VersionData {
  version: string
  count: number
}

export interface DashboardStats {
  totalToday: number
  goal: number
  hourlyData: HourlyData[]
  recentProductions: Production[]
  versionData: VersionData[]
  ranking: RankingEntry[]
  shiftStart?: string
  shiftEnd?: string
  shift?: number
}

export interface ShiftConfig {
  id: string
  shiftDate: string
  shift: number
  goal: number
  shiftStart?: string | null
  shiftEnd?: string | null
  createdAt: string
  updatedAt: string
}

export interface RankingEntry {
  position: number
  employee: Employee
  count: number
}

export interface QuarterlyEntry {
  employee: Employee
  total: number
}

export const CAR_VERSIONS = ['L3 (Exclusive)', 'L2 (Advancend)'] as const
export type CarVersion = typeof CAR_VERSIONS[number]

export const DAILY_GOAL = 100

export const SHIFT_CONFIGS = {
  1: {
    start: '06:00',
    end: '16:48',
    extra: '19:00',
    resetHour: 0, // 00:00
  },
  2: {
    start: '16:48',
    end: '02:00',
    extra: '04:00',
    resetHour: 5, // 05:00
  }
} as const

// Legacy defaults for backward compatibility if needed in UI
export const SHIFT_START = SHIFT_CONFIGS[1].start
export const SHIFT_END = SHIFT_CONFIGS[1].end
