const { PrismaClient } = require('@prisma/client')

async function main() {
    console.log('Starting JS diagnostic...')
    const prisma = new PrismaClient()
    try {
        console.log('Attempting $connect...')
        await prisma.$connect()
        console.log('Connected!')

        console.log('Employees count...')
        const count = await prisma.employee.count()
        console.log('Count:', count)

    } catch (e) {
        console.error('JS_DIAG_FAILURE:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main().catch(err => {
    console.error('CRITICAL_JS_DIAG_FAILURE:', err)
})
