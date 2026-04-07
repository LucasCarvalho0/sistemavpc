import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'
import 'dotenv/config'

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
}).$extends(withAccelerate()) as any

async function main() {
  console.log('--- Move ALL history to Shift 2 ---')
  
  // 1. Move all existing productions that are currently Shift 1 to Shift 2
  // Because "O primeiro turno não tem nada, mas o segundo turno já tem tudo"
  const res = await prisma.production.updateMany({
    where: { shift: 1 },
    data: { shift: 2 }
  })
  
  console.log(`Successfully moved ${res.count} records to Shift 2.`)

  // 2. Summary
  const s1 = await prisma.production.count({ where: { shift: 1 } })
  const s2 = await prisma.production.count({ where: { shift: 2 } })
  console.log(`Final Totals: Shift 1 = ${s1}, Shift 2 = ${s2}`)
}

main().finally(() => prisma.$disconnect())
