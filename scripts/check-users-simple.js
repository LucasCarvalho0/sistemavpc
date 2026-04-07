const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const registrations = ['116203', '116221']
  const users = await prisma.employee.findMany({
    where: {
      registration: { in: registrations }
    }
  })
  
  console.log('--- USERS IN DATABASE ---')
  users.forEach(u => {
    console.log(`Name: ${u.name}, Registration: ${u.registration}, Shift: ${u.shift}, Role: ${u.role}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
