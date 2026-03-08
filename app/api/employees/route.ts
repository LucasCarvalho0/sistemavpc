import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const MAX = 20

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json({ data: employees })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ message: 'Erro ao buscar funcionários' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json()
    if (!name?.trim()) return NextResponse.json({ message: 'Nome é obrigatório' }, { status: 400 })

    const count = await prisma.employee.count()
    if (count >= MAX) return NextResponse.json({ message: `Limite de ${MAX} funcionários atingido` }, { status: 400 })

    const employee = await prisma.employee.create({ data: { name: name.trim() } })
    return NextResponse.json({ data: employee }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ message: 'Erro ao criar funcionário' }, { status: 500 })
  }
}
