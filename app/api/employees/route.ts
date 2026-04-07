import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { getShiftDate } from '@/lib/shiftUtils'

const MAX = 50

export async function GET() {
  try {
    const session = cookies().get('session')
    const user = session ? JSON.parse(session.value) : null
    const shift = user?.shift || 1
    const shiftDate = getShiftDate()

    const where: any = { 
      shift,
      password: "", // Operadores não têm senha para login
      active: true
    }

    const employees = await prisma.employee.findMany({ 
      where,
      orderBy: { name: 'asc' } 
    })
    return NextResponse.json({ data: employees })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ message: 'Erro ao buscar funcionários', debug: e.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = cookies().get('session')
    const user = session ? JSON.parse(session.value) : null
    const shift = user?.shift ?? 1

    const { name } = await req.json()
    if (!name?.trim()) return NextResponse.json({ message: 'Nome é obrigatório' }, { status: 400 })

    const count = await prisma.employee.count({ where: { shift } })
    if (count >= MAX) return NextResponse.json({ message: `Limite de ${MAX} funcionários por turno atingido` }, { status: 400 })

    const employee = await prisma.employee.create({ 
      data: { 
        name: name.trim(),
        registration: `WORKER-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        shift: shift,
        password: "",
        role: "OPERADOR"
      } 
    })
    return NextResponse.json({ data: employee }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ message: 'Erro ao criar funcionário' }, { status: 500 })
  }
}
