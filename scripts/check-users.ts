import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'
import 'dotenv/config'

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL
}).$extends(withAccelerate())

async function main() {
  try {
    const employees = await prisma.employee.findMany()
    console.log('Employees found:', employees.length)
    employees.forEach(emp => {
      console.log(`- ${emp.name} (${emp.registration}): "${emp.password}" | Shift: ${emp.shift} | Role: ${emp.role}`)
    })
  } catch (error) {
    console.error('Error querying employees:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
