import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'
import 'dotenv/config'

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
}).$extends(withAccelerate()) as any

async function listUsers() {
  try {
    console.log('Listing all employees...')
    const employees = await prisma.employee.findMany()
    console.log(JSON.stringify(employees, null, 2))
  } catch (e) {
    console.error('List failed:', e)
  } finally {
    await prisma.$disconnect()
  }
}

listUsers()
