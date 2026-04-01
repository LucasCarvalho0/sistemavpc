import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { name, active } = await req.json()
    const data: { name?: string; active?: boolean } = {}
    if (name !== undefined) data.name = String(name).trim()
    if (active !== undefined) data.active = Boolean(active)

    const employee = await prisma.employee.update({ where: { id: params.id }, data })
    return NextResponse.json({ data: employee })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ message: 'Erro ao atualizar funcionário' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    // Exclusão definitiva: remove o funcionário E todas as suas produções
    await prisma.$transaction([
      prisma.production.deleteMany({ where: { employeeId: params.id } }),
      prisma.employee.delete({ where: { id: params.id } })
    ])

    return NextResponse.json({ success: true, message: 'Funcionário e histórico excluídos permanentemente' })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ message: 'Erro ao excluir funcionário permanentemente' }, { status: 500 })
  }
}
