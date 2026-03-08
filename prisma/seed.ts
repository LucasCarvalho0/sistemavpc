import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const names = ['Augusto', 'Breno', 'Jonathan', 'Fabiola', 'Valber']

  for (const name of names) {
    const emp = await prisma.employee.upsert({
      where: { id: `seed-${name.toLowerCase()}` },
      create: { id: `seed-${name.toLowerCase()}`, name, active: true },
      update: { name, active: true },
    })
    console.log(`  ✓ ${emp.name}`)
  }

  console.log('✅ Done')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
