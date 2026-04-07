import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getShiftDate } from '@/lib/shiftUtils'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = cookies().get('session')
    const user = session ? JSON.parse(session.value) : null
    const shift = user?.shift || 1
    const shiftDate = getShiftDate()

    const whereClause: any = { shift }
    if (shift === 1) {
      whereClause.shiftDate = shiftDate
    }

    const groups = await prisma.production.groupBy({
      by: ['employeeId'],
      where: whereClause,
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
