import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getShiftDate } from '@/lib/shiftUtils'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const shiftDate = getShiftDate()
        console.log(`[GOAL_GET] shiftDate: ${shiftDate}`)
        let config = await prisma.shiftConfig.findUnique({ where: { shiftDate } })

        if (!config) {
            config = await prisma.shiftConfig.create({
                data: { shiftDate, goal: 100 }
            })
        }

        return NextResponse.json({ data: config })
    } catch (error) {
        console.error('Error fetching goal:', error)
        return NextResponse.json({ message: 'Erro ao buscar meta' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const { goal } = await req.json()
        if (typeof goal !== 'number' || goal < 1) {
            return NextResponse.json({ message: 'Meta inválida' }, { status: 400 })
        }

        const shiftDate = getShiftDate()
        console.log(`[GOAL_POST] shiftDate: ${shiftDate}, newGoal: ${goal}`)
        const config = await prisma.shiftConfig.upsert({
            where: { shiftDate },
            update: { goal },
            create: { shiftDate, goal }
        })

        return NextResponse.json({ data: config })
    } catch (error: any) {
        console.error('GOAL_API_ERROR:', error)
        return NextResponse.json({ message: error.message || 'Erro ao atualizar meta' }, { status: 500 })
    }
}
