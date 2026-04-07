import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getShiftDate } from '@/lib/shiftUtils'
import { broadcast } from '@/lib/wsManager'
import { DAILY_GOAL } from '@/types'
import { cookies } from 'next/headers'

const VALID_VERSIONS = ['L3 (Exclusive)', 'L2 (Advancend)']

function validVIN(vin: string) {
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)
}

export async function GET(req: Request) {
  try {
    const session = cookies().get('session')
    let user
    try {
      user = session ? JSON.parse(session.value) : null
    } catch (e) {
      user = null
    }
    const shift = user?.shift || 1

    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employeeId')
    const vin = searchParams.get('vin')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = { 
      shift
    }
    if (employeeId) where.employeeId = employeeId
    if (vin) where.vin = { contains: vin.toUpperCase() }
    
    // Regra 11: Manhã vê apenas hoje. Noite vê hoje + histórico.
    if (shift === 1 && !startDate) {
      where.shiftDate = getShiftDate()
    } else if (startDate || endDate) {
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
    const session = cookies().get('session')
    let user
    try {
      user = session ? JSON.parse(session.value) : null
    } catch (e) {
      user = null
    }
    const shift = user?.shift || 1

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
      where: { vin: cleanVin },
      include: { employee: true },
    })
    if (existing) {
      const registeredAt = existing.createdAt.toLocaleDateString('pt-BR')
      const registeredBy = existing.employee?.name ?? 'funcionário desconhecido'
      return NextResponse.json(
        {
          message: `VIN já registrado! O chassi ${cleanVin} foi cadastrado por ${registeredBy} em ${registeredAt}. Não é possível registrá-lo novamente.`,
        },
        { status: 409 }
      )
    }

    const production = await prisma.production.create({
      data: { vin: cleanVin, carVersion, employeeId, shiftDate, shift },
      include: { employee: true },
    })

    // Lógica de total e meta baseada no turno do usuário logado
    const whereCount: any = { 
      shift
    }
    if (shift === 1) whereCount.shiftDate = shiftDate

    const totalToday = await prisma.production.count({ where: whereCount })
    const config = await prisma.shiftConfig.findUnique({ 
      where: { shiftDate } // Nota: se ShiftConfig for global, deixamos assim, ou se for por turno, filtramos por turno.
    })
    const currentGoal = config?.goal ?? DAILY_GOAL

    // Real-time broadcasts
    broadcast('production_added', production)

    const ranking = await buildRanking(shiftDate, shift)
    broadcast('ranking_updated', ranking)

    if (totalToday === currentGoal) {
      broadcast('goal_reached', { total: totalToday, shiftDate, shift })
    }

    return NextResponse.json({ data: production }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ message: 'Erro ao registrar produção' }, { status: 500 })
  }
}

async function buildRanking(shiftDate: string, shift: number) {
  const where: any = { 
    shift
  }
  if (shift === 1) where.shiftDate = shiftDate

  const groups = await prisma.production.groupBy({
    by: ['employeeId'],
    where: where,
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
