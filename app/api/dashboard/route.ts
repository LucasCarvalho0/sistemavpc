import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getShiftDate, getBrazilHour } from '@/lib/shiftUtils'
import { DAILY_GOAL } from '@/types'

export async function GET() {
  try {
    const shiftDate = getShiftDate()

    const [totalToday, recentProductions, allToday, config, versionDataRaw] = await Promise.all([
      prisma.production.count({ where: { shiftDate } }),
      prisma.production.findMany({
        where: { shiftDate },
        include: { employee: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.production.findMany({
        where: { shiftDate },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.shiftConfig.findUnique({ where: { shiftDate } }),
      prisma.production.groupBy({
        by: ['carVersion'],
        where: { shiftDate },
        _count: { _all: true },
        orderBy: { _count: { carVersion: 'desc' } }
      })
    ])

    const goal = config?.goal ?? DAILY_GOAL

    const versionData = versionDataRaw.map((v: any) => ({
      version: v.carVersion as string,
      count: v._count._all as number
    }))

    // Build hourly chart data
    const map = new Map<string, number>()
    allToday.forEach((p: { createdAt: Date }) => {
      const h = getBrazilHour(p.createdAt).toString().padStart(2, '0')
      map.set(h, (map.get(h) ?? 0) + 1)
    })
    let acc = 0
    const hourlyData = Array.from(map.keys())
      .sort()
      .map((hour) => {
        acc += map.get(hour)!
        return { hour, count: map.get(hour)!, accumulated: acc }
      })

    return NextResponse.json({
      data: { totalToday, goal, hourlyData, recentProductions, versionData },
    })
  } catch (e: any) {
    console.error('DASHBOARD_API_ERROR:', e)
    return NextResponse.json({
      message: 'Erro ao buscar estatísticas',
      error: e.message,
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    }, { status: 500 })
  }
}
