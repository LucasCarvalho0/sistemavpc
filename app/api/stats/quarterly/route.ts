import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getQuarterStart } from '@/lib/shiftUtils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const startDate = getQuarterStart()

    const groups = await prisma.production.groupBy({
      by: ['employeeId'],
      where: { shiftDate: { gte: startDate } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })

    const employees = await prisma.employee.findMany({
      where: { id: { in: groups.map((g: { employeeId: string }) => g.employeeId) } },
    })

    const data = groups.map((g: { employeeId: string; _count: { id: number } }) => ({
      employee: employees.find((e: { id: string }) => e.id === g.employeeId)!,
      total: g._count.id,
    }))

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('QUARTERLY_STATS_API_ERROR:', error)
    return NextResponse.json({ message: error.message || 'Erro ao buscar estatísticas trimestrais' }, { status: 500 })
  }
}
