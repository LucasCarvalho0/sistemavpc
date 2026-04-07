import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getShiftDate } from '@/lib/shiftUtils'
import { SHIFT_START, SHIFT_END, SHIFT_CONFIGS } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const cookieStore = cookies()
        const sessionCookie = cookieStore.get('session')
        if (!sessionCookie) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
        const session = JSON.parse(sessionCookie.value)
        const shift = session.shift

        const shiftDate = getShiftDate(new Date(), shift)
        console.log(`[SHIFT_GET] shiftDate: ${shiftDate}, shift: ${shift}`)
        
        let config = await prisma.shiftConfig.findUnique({ 
            where: { shiftDate_shift: { shiftDate, shift } } 
        })

        if (!config) {
            const defaults = SHIFT_CONFIGS[shift as keyof typeof SHIFT_CONFIGS]
            config = await prisma.shiftConfig.create({
                data: { 
                    shiftDate, 
                    shift,
                    goal: 100,
                    shiftStart: defaults?.start ?? SHIFT_START,
                    shiftEnd: defaults?.end ?? SHIFT_END
                }
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

        const cookieStore = cookies()
        const sessionCookie = cookieStore.get('session')
        if (!sessionCookie) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
        const session = JSON.parse(sessionCookie.value)
        const shift = session.shift

        const shiftDate = getShiftDate(new Date(), shift)
        const config = await prisma.shiftConfig.upsert({
            where: { shiftDate_shift: { shiftDate, shift } },
            update: { shiftStart, shiftEnd },
            create: { shiftDate, shift, goal: 100, shiftStart, shiftEnd }
        })

        return NextResponse.json({ data: config })
    } catch (error: any) {
        console.error('SHIFT_API_ERROR:', error)
        return NextResponse.json({ message: error.message || 'Erro ao atualizar turno' }, { status: 500 })
    }
}
