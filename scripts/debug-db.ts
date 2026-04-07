import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'
import 'dotenv/config'

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
}).$extends(withAccelerate()) as any

async function test() {
  try {
    console.log('Testing connection...')
    const count = await prisma.employee.count()
    console.log('Employee count:', count)

    const registration = '116221' // Lucas
    const employee = await prisma.employee.findUnique({
      where: { registration },
    })
    console.log('Employee found:', employee)
    
    if (employee) {
        console.log('Shift:', employee.shift)
    }
  } catch (e) {
    console.error('Test failed:', e)
  } finally {
    await prisma.$disconnect()
  }
}

test()
