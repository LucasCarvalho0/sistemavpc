import { PrismaClient } from '@prisma/client'

async function main() {
    const prisma = new PrismaClient()
    try {
        console.log('Attempting $connect()...')
        await prisma.$connect()
        console.log('Connected successfully!')

        console.log('Querying version...')
        const result = await prisma.$queryRaw`SELECT version();`
        console.log('Database Version:', result)

        process.exit(0)
    } catch (e) {
        console.error('DIAGNOSTIC_FAILURE:', e)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

main()
