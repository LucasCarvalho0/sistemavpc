require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

async function test() {
    const prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error']
    })

    try {
        console.log('Testing connection with Prisma 5...')
        const emps = await prisma.employee.findMany()
        console.log('Employees found:', emps.length)
        if (emps.length > 0) {
            console.log('First employee:', emps[0].name)
        }
    } catch (err) {
        console.error('Connection failed:', err)
    } finally {
        await prisma.$disconnect()
    }
}

test()
