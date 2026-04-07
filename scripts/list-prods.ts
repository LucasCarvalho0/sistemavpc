import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
  const prods = await prisma.production.findMany({
    include: { employee: true },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  console.log('--- Current Productions ---')
  prods.forEach(p => {
    console.log(`[${p.shiftDate}] VIN: ${p.vin} | Employee: ${p.employee.name} | Shift: ${p.employee.shift}`)
  })

  const shift1Counts = await prisma.production.count({ where: { employee: { shift: 1 } } })
  const shift2Counts = await prisma.production.count({ where: { employee: { shift: 2 } } })

  console.log(`\nTotals: Shift 1 = ${shift1Counts}, Shift 2 = ${shift2Counts}`)
}

main().finally(() => prisma.$disconnect())
