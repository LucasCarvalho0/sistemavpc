import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'
import 'dotenv/config'

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL
}).$extends(withAccelerate())

async function main() {
  const users = await prisma.employee.findMany({
    where: { 
      registration: { in: ['116203', '116248'] } 
    }
  })
  
  console.log('--- Shift 1 Users ---')
  users.forEach(u => {
    console.log(`- Registration: [${u.registration}] (Type: ${typeof u.registration})`)
    console.log(`  Password: [${u.password}] (Length: ${u.password.length})`)
    console.log(`  Name: [${u.name}]`)
    console.log(`  Shift: [${u.shift}]`)
  })
  await prisma.$disconnect()
}

main()
