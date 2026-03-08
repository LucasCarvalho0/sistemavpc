export interface Employee {
  id: string
  name: string
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
  shiftStart?: string
  shiftEnd?: string
}

export interface ShiftConfig {
  id: string
  shiftDate: string
  goal: number
  shiftStart: string | null
  shiftEnd: string | null
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
export const SHIFT_START = '16:48'
export const SHIFT_END = '02:00'
export const SHIFT_OVERTIME_END = '04:00'
export const SHIFT_RESET_TIME = '05:00'
