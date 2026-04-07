import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'
import 'dotenv/config'

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
}).$extends(withAccelerate()) as any

async function main() {
  console.log('--- Shift 2 History Backfill ---')
  
  // 1. Get all productions
  const ps = await prisma.production.findMany({
    include: { employee: true }
  })
  
  console.log(`Found ${ps.length} productions to check.`)
  
  let updated = 0
  for (const pr of ps) {
    if (pr.shift !== pr.employee.shift) {
      await prisma.production.update({
        where: { id: pr.id },
        data: { shift: pr.employee.shift }
      })
      updated++
    }
  }
  
  console.log(`Updated ${updated} records to match their employee's shift.`)

  // 2. Summary
  const s1 = await prisma.production.count({ where: { shift: 1 } })
  const s2 = await prisma.production.count({ where: { shift: 2 } })
  console.log(`Final Totals: Shift 1 = ${s1}, Shift 2 = ${s2}`)
}

main().finally(() => prisma.$disconnect())
