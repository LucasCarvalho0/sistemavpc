import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMonthBounds } from '@/lib/shiftUtils'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
  try {
    const session = cookies().get('session')
    const user = session ? JSON.parse(session.value) : null
    const shift = user?.shift ?? 1

    const { searchParams } = new URL(req.url)
    const year = parseInt(searchParams.get('year') ?? '')
    const month = parseInt(searchParams.get('month') ?? '')

    if (!year || !month || month < 1 || month > 12)
      return NextResponse.json({ message: 'Ano e mês inválidos' }, { status: 400 })

    const { startDate, endDate } = getMonthBounds(year, month)
    const productions = await prisma.production.findMany({
      where: { 
        shiftDate: { gte: startDate, lte: endDate },
        employee: { shift }
      },
      include: { employee: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ data: productions })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ message: 'Erro ao gerar relatório' }, { status: 500 })
  }
}
