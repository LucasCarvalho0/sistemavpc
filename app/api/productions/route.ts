import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getShiftDate } from '@/lib/shiftUtils'
import { broadcast } from '@/lib/wsManager'
import { DAILY_GOAL } from '@/types'

const VALID_VERSIONS = ['L3 (Exclusive)', 'L2 (Advancend)']

function validVIN(vin: string) {
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employeeId')
    const vin = searchParams.get('vin')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (employeeId) where.employeeId = employeeId
    if (vin) where.vin = { contains: vin.toUpperCase() }
    if (startDate || endDate) {
      where.shiftDate = {}
      if (startDate) where.shiftDate.gte = startDate
      if (endDate) where.shiftDate.lte = endDate
    }

    const productions = await prisma.production.findMany({
      where,
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    return NextResponse.json({ data: productions })
  } catch (error: any) {
    console.error('PRODUCTIONS_API_ERROR:', error)
    return NextResponse.json({ message: error.message || 'Erro interno no servidor' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { vin, carVersion, employeeId } = await req.json()

    if (!vin || !carVersion || !employeeId)
      return NextResponse.json({ message: 'VIN, versão e funcionário são obrigatórios' }, { status: 400 })

    const cleanVin = String(vin).toUpperCase().trim()
    if (!validVIN(cleanVin))
      return NextResponse.json({ message: 'VIN inválido (17 caracteres alfanuméricos, sem I/O/Q)' }, { status: 400 })

    if (!VALID_VERSIONS.includes(carVersion))
      return NextResponse.json({ message: 'Versão de carro inválida' }, { status: 400 })

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
    if (!employee?.active)
      return NextResponse.json({ message: 'Funcionário não encontrado ou inativo' }, { status: 400 })

    const shiftDate = getShiftDate()

    const existing = await prisma.production.findUnique({
      where: { vin_shiftDate: { vin: cleanVin, shiftDate } },
    })
    if (existing) {
      return NextResponse.json(
        { message: `Erro: O VIN ${cleanVin} já foi registrado hoje às ${existing.createdAt.toLocaleTimeString('pt-BR')}.` },
        { status: 409 }
      )
    }

    const production = await prisma.production.create({
      data: { vin: cleanVin, carVersion, employeeId, shiftDate },
      include: { employee: true },
    })

    const totalToday = await prisma.production.count({ where: { shiftDate } })
    const config = await prisma.shiftConfig.findUnique({ where: { shiftDate } })
    const currentGoal = config?.goal ?? DAILY_GOAL

    // Real-time broadcasts
    broadcast('production_added', production)

    const ranking = await buildRanking(shiftDate)
    broadcast('ranking_updated', ranking)

    if (totalToday === currentGoal) {
      broadcast('goal_reached', { total: totalToday, shiftDate })
    }

    return NextResponse.json({ data: production }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ message: 'Erro ao registrar produção' }, { status: 500 })
  }
}

async function buildRanking(shiftDate: string) {
  const groups = await prisma.production.groupBy({
    by: ['employeeId'],
    where: { shiftDate },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  })
  const employees = await prisma.employee.findMany({
    where: { id: { in: groups.map((g: { employeeId: string }) => g.employeeId) } },
  })
  return groups.map((g: { employeeId: string; _count: { id: number } }, i: number) => ({
    position: i + 1,
    employee: employees.find((e: { id: string }) => e.id === g.employeeId)!,
    count: g._count.id,
  }))
}
