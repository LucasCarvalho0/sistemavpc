import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMonthStart } from '@/lib/shiftUtils'

export async function GET() {
    try {
        const startDate = getMonthStart()

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
    } catch (e) {
        console.error(e)
        return NextResponse.json({ message: 'Erro ao buscar ranking mensal' }, { status: 500 })
    }
}
