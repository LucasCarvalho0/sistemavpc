import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getShiftDate } from '@/lib/shiftUtils'
import { SHIFT_START, SHIFT_END } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const shiftDate = getShiftDate()
        console.log(`[SHIFT_GET] shiftDate: ${shiftDate}`)
        let config = await prisma.shiftConfig.findUnique({ where: { shiftDate } })

        if (!config) {
            config = await prisma.shiftConfig.create({
                data: { shiftDate, goal: 100 }
            })
        }

        return NextResponse.json({
            data: {
                ...config,
                shiftStart: config.shiftStart ?? SHIFT_START,
                shiftEnd: config.shiftEnd ?? SHIFT_END,
            }
        })
    } catch (error) {
        console.error('Error fetching shift config:', error)
        return NextResponse.json({ message: 'Erro ao buscar configuração de turno' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const { shiftStart, shiftEnd } = await req.json()

        if (!shiftStart || !shiftEnd) {
            return NextResponse.json({ message: 'Horários de início e fim são obrigatórios' }, { status: 400 })
        }

        // Validate HH:MM format
        const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d)$/
        if (!timeRegex.test(shiftStart) || !timeRegex.test(shiftEnd)) {
            return NextResponse.json({ message: 'Formato de horário inválido (use HH:MM)' }, { status: 400 })
        }

        const shiftDate = getShiftDate()
        const config = await prisma.shiftConfig.upsert({
            where: { shiftDate },
            update: { shiftStart, shiftEnd },
            create: { shiftDate, goal: 100, shiftStart, shiftEnd }
        })

        return NextResponse.json({ data: config })
    } catch (error: any) {
        console.error('SHIFT_API_ERROR:', error)
        return NextResponse.json({ message: error.message || 'Erro ao atualizar turno' }, { status: 500 })
    }
}
