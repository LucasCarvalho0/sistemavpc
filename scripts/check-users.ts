import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.employee.findMany({
    where: {
      registration: { in: ['116203', '116221'] }
    }
  })
  console.log('USERS_FOUND:', JSON.stringify(users, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
