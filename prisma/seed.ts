import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
}).$extends(withAccelerate()) as any

async function main() {
  console.log('🌱 Seeding database with user credentials...')

  const users = [
    // Shift 1 (Anna, Fabiano)
    { name: 'Anna', registration: '116203', shift: 1, role: 'ADMINISTRATIVO', password: 'Mudar@116203' },
    { name: 'Fabiano', registration: '116248', shift: 1, role: 'LIDER', password: 'Mudar@116248' },
    
    // Shift 2 (Lucas, Janaina, Augusto)
    { name: 'Lucas Carvalho', registration: '116221', shift: 2, role: 'ADMINISTRATIVO', password: 'Mudar@116221' },
    { name: 'Janaina Mendes', registration: '116265', shift: 2, role: 'LIDER', password: 'Mudar@116265' },
    { name: 'JOSE AUGUSTO', registration: '499277', shift: 2, role: 'CONFERENTE', password: 'Mudar@499277' },
  ]

  for (const user of users) {
    await prisma.employee.upsert({
      where: { registration: user.registration },
      create: { 
        name: user.name, 
        registration: user.registration, 
        password: user.password, 
        shift: user.shift, 
        role: user.role,
        active: true 
      },
      update: { 
        name: user.name, 
        password: user.password, 
        shift: user.shift, 
        role: user.role,
        active: true 
      },
    })
    console.log(`  ✓ ${user.name} (${user.registration}) - ${user.role} (Turno ${user.shift})`)
  }

  // Sample Line Workers for Shift 2 (Shift 1 starts empty as requested)
  console.log('\n🌱 Adding sample Shift 2 line workers...')
  const shift2Workers = ['Breno', 'Augusto', 'Jonathan', 'Fabiola', 'Valber', 'Rodrigo Santos']
  for (const name of shift2Workers) {
    await prisma.employee.upsert({
      where: { registration: `worker-2-${name.toLowerCase().replace(/\s+/g, '-')}` },
      create: { 
        name, 
        registration: `worker-2-${name.toLowerCase().replace(/\s+/g, '-')}`, 
        password: "", 
        shift: 2, 
        role: "OPERADOR",
        active: true 
      },
      update: { active: true, shift: 2 },
    })
  }

  console.log('✅ Done')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
