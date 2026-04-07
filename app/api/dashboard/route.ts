import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getShiftDate, getBrazilHour } from '@/lib/shiftUtils'
import { DAILY_GOAL, SHIFT_START, SHIFT_END } from '@/types'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = cookies().get('session')
    let user
    try {
      user = session ? JSON.parse(session.value) : null
    } catch (e: any) {
      console.error('DASHBOARD_SESSION_PARSE_ERROR:', e)
      user = null
    }

    const shiftDate = getShiftDate()
    const shift = user?.shift ?? 1

    // AUTO-FIX: Corrigir produções que ficaram no Turno 1 mas pertencem a funcionários do Turno 2
    if (shift === 2) {
      const shift2Employees = await prisma.employee.findMany({ where: { shift: 2 }, select: { id: true } })
      const shift2Ids = shift2Employees.map((e: { id: string }) => e.id)
      await prisma.production.updateMany({
        where: { 
          employeeId: { in: shift2Ids },
          shift: 1 
        },
        data: { shift: 2 }
      })
    }
    
    // Regra 7/8: Manhã (Shift 1) = Apenas Hoje. Noite (Shift 2) = Todo o Histórico.
    const whereClause: any = { 
      shift
    }
    
    if (shift === 1) {
      whereClause.shiftDate = shiftDate
    }

    console.log(`DASHBOARD_FETCH: shiftDate=${shiftDate}, shift=${shift}`)

    const [
      totalToday,
      recentProductions,
      allToday,
      config,
      versionDataRaw,
      rankingRaw
    ] = await Promise.all([
      prisma.production.count({ where: whereClause }),
      prisma.production.findMany({
        where: whereClause,
        include: { employee: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.production.findMany({
        where: whereClause,
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.shiftConfig.findUnique({ where: { shiftDate } }),
      prisma.production.groupBy({
        by: ['carVersion'],
        where: whereClause,
        _count: { carVersion: true },
        orderBy: { _count: { carVersion: 'desc' } }
      }),
      prisma.production.groupBy({
        by: ['employeeId'],
        where: whereClause,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      })
    ])

    const goal = config?.goal ?? DAILY_GOAL

    // Map ranking data safely
    const employeeIds = rankingRaw.map((g: any) => g.employeeId).filter(Boolean)
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } }
    })

    const ranking = rankingRaw.map((g: any, i: number) => {
      const emp = employees.find((e: any) => e.id === g.employeeId)
      return {
        position: i + 1,
        employee: emp || { name: 'Desconhecido', registration: '?' },
        count: g._count.id
      }
    })

    const versionData = versionDataRaw.map((v: any) => ({
      version: (v.carVersion as string) || 'Não informada',
      count: v._count.carVersion as number
    }))

    // Build hourly chart data
    const map = new Map<string, number>()
    allToday.forEach((p: { createdAt: Date }) => {
      try {
        const h = getBrazilHour(p.createdAt).toString().padStart(2, '0')
        map.set(h, (map.get(h) ?? 0) + 1)
      } catch (err) {
        console.error('Error calculating hour:', err)
      }
    })

    let acc = 0
    const hourlyData = Array.from(map.keys())
      .sort()
      .map((hour) => {
        acc += map.get(hour)!
        return { hour, count: map.get(hour)!, accumulated: acc }
      })

    return NextResponse.json({
      data: {
        totalToday,
        goal,
        hourlyData,
        recentProductions,
        versionData,
        ranking,
        shiftStart: config?.shiftStart ?? SHIFT_START,
        shiftEnd: config?.shiftEnd ?? SHIFT_END,
      },
    })
  } catch (e: any) {
    console.error('DASHBOARD_API_ERROR:', e)
    return NextResponse.json({
      message: 'Erro ao buscar estatísticas do dashboard',
      debug: e.message,
    }, { status: 500 })
  }
}
