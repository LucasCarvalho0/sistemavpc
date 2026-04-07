const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const counts = await prisma.production.groupBy({
    by: ['shift', 'shiftDate'],
    _count: { id: true }
  })
  console.log('--- PRODUCTION COUNTS ---')
  console.log(JSON.stringify(counts, null, 2))

  const employees = await prisma.employee.findMany({
    where: { shift: 2 }
  })
  console.log('--- SHIFT 2 EMPLOYEES ---')
  console.log(employees.map(e => e.name).join(', '))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
