import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    try {
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
