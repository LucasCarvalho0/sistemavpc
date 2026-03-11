import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getShiftDate } from '@/lib/shiftUtils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const shiftDate = getShiftDate()

    const groups = await prisma.production.groupBy({
      by: ['employeeId'],
      where: { shiftDate },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })

    const employees = await prisma.employee.findMany({
      where: { id: { in: groups.map((g: { employeeId: string }) => g.employeeId) } },
    })

    const data = groups.map((g: { employeeId: string; _count: { id: number } }, i: number) => ({
      position: i + 1,
      employee: employees.find((e: { id: string }) => e.id === g.employeeId)!,
      count: g._count.id,
    }))

    return NextResponse.json({ data })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ message: 'Erro ao buscar ranking' }, { status: 500 })
  }
}
