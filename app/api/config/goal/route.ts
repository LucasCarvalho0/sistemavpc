import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getShiftDate } from '@/lib/shiftUtils'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const cookieStore = cookies()
        const sessionCookie = cookieStore.get('session')
        if (!sessionCookie) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
        const session = JSON.parse(sessionCookie.value)
        const shift = session.shift

        const shiftDate = getShiftDate(new Date(), shift)
        console.log(`[GOAL_GET] shiftDate: ${shiftDate}, shift: ${shift}`)
        
        let config = await prisma.shiftConfig.findUnique({ 
            where: { shiftDate_shift: { shiftDate, shift } } 
        })

        if (!config) {
            config = await prisma.shiftConfig.create({
                data: { shiftDate, shift, goal: 100 }
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

        const cookieStore = cookies()
        const sessionCookie = cookieStore.get('session')
        if (!sessionCookie) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
        const session = JSON.parse(sessionCookie.value)
        const shift = session.shift

        const shiftDate = getShiftDate(new Date(), shift)
        console.log(`[GOAL_POST] shiftDate: ${shiftDate}, shift: ${shift}, newGoal: ${goal}`)
        const config = await prisma.shiftConfig.upsert({
            where: { shiftDate_shift: { shiftDate, shift } },
            update: { goal },
            create: { shiftDate, shift, goal }
        })

        return NextResponse.json({ data: config })
    } catch (error: any) {
        console.error('GOAL_API_ERROR:', error)
        return NextResponse.json({ message: error.message || 'Erro ao atualizar meta' }, { status: 500 })
    }
}
