import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMonthStart } from '@/lib/shiftUtils'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const session = cookies().get('session')
        let user
        try {
            user = session ? JSON.parse(session.value) : null
        } catch (e) {
            user = null
        }
        
        const shift = user?.shift ?? 1
        const startDate = getMonthStart()

        const groups = await prisma.production.groupBy({
            by: ['employeeId'],
            where: { 
                shiftDate: { gte: startDate },
                employee: { shift }
            },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
        })

        const employeeIds = groups.map((g: any) => g.employeeId).filter(Boolean)
        const employees = await prisma.employee.findMany({
            where: { id: { in: employeeIds } },
        })

        const data = groups.map((g: any) => {
            const emp = employees.find((e: any) => e.id === g.employeeId)
            return {
                employee: emp || { name: 'Desconhecido', registration: '?' },
                total: g._count.id,
            }
        })

        return NextResponse.json({ data })
    } catch (e: any) {
        console.error('MONTHLY_STATS_ERROR:', e)
        return NextResponse.json({ message: 'Erro ao buscar ranking mensal', debug: e.message }, { status: 500 })
    }
}
