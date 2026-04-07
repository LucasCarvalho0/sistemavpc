import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
    try {
        const session = cookies().get('session')
        const user = session ? JSON.parse(session.value) : null
        const shift = user?.shift ?? 1

        const { searchParams } = new URL(req.url)
        const start = searchParams.get('start')
        const end = searchParams.get('end')

        if (!start || !end) {
            return NextResponse.json({ message: 'Datas de início e fim são obrigatórias' }, { status: 400 })
        }

        const productions = await prisma.production.findMany({
            where: {
                shiftDate: {
                    gte: start,
                    lte: end,
                },
                employee: { shift }
            },
            include: { employee: true },
            orderBy: { createdAt: 'asc' },
        })

        return NextResponse.json({ data: productions })
    } catch (e) {
        console.error('RANGE_REPORT_ERROR:', e)
        return NextResponse.json({ message: 'Erro ao gerar relatório por período' }, { status: 500 })
    }
}
