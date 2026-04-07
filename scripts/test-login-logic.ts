import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'
import 'dotenv/config'

// Mocking nowInBrazil logic from lib/shiftUtils.ts
const TZ = 'America/Sao_Paulo'
function nowInBrazil(date: Date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date)

    const get = (type: string) => {
      const p = parts.find(p => p.type === type)
      return p ? p.value : '0'
    }

    return {
      year: parseInt(get('year')),
      month: parseInt(get('month')),
      day: parseInt(get('day')),
      hour: parseInt(get('hour')),
      minute: parseInt(get('minute')),
      second: parseInt(get('second')),
    }
  } catch (error) {
    console.error('Error in nowInBrazil:', error)
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
    }
  }
}

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
}).$extends(withAccelerate()) as any

async function simulateLogin() {
  const registration = '116221'
  const password = 'Mudar@116221'

  try {
    console.log('--- Step 1: Find Employee ---')
    const employee = await prisma.employee.findUnique({
      where: { registration },
    })
    
    if (!employee) {
      console.log('Employee not found')
      return
    }
    console.log('Employee found:', employee.name, 'Shift:', employee.shift)

    if (employee.password !== password) {
      console.log('Invalid password')
      return
    }

    console.log('--- Step 2: Time Check ---')
    const br = nowInBrazil()
    console.log('Brazil Time:', br)
    
    const currentTimeMinutes = br.hour * 60 + br.minute
    console.log('Current Minutes:', currentTimeMinutes)

    if (employee.shift === 1) {
      const start = 6 * 60
      const end = 16 * 60 + 48
      console.log(`Shift 1 Check: ${start} <= ${currentTimeMinutes} <= ${end}`)
    } else if (employee.shift === 2) {
      const start = 16 * 60 + 48
      const end = 2 * 60
      const isAllowed = currentTimeMinutes >= start || currentTimeMinutes < end
      console.log(`Shift 2 Check: ${currentTimeMinutes} >= ${start} || ${currentTimeMinutes} < ${end} => ${isAllowed}`)
    }

    console.log('--- Step 3: Success Simulation Done ---')
  } catch (error: any) {
    console.error('CRITICAL LOGIN ERROR SIMULATED:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

simulateLogin()
