import { prisma } from '@/lib/prisma'
import { getShiftDate } from '@/lib/shiftUtils'

async function debugDashboard() {
  try {
    const shiftDate = getShiftDate()
    const shift = 2 // Lucas test
    
    console.log(`DEBUG: Testing shiftDate=${shiftDate}, shift=${shift}`)

    const whereClause: any = { 
      shift
    }
    
    // Test the count
    const count = await prisma.production.count({ where: whereClause })
    console.log('Count:', count)

    // Test the groupBy for versionData
    const versionDataRaw = await prisma.production.groupBy({
      by: ['carVersion'],
      where: whereClause,
      _count: { _all: true },
      orderBy: { _count: { carVersion: 'desc' } }
    })
    console.log('VersionDataRaw:', versionDataRaw)

    // Test the groupBy for ranking
    const rankingRaw = await prisma.production.groupBy({
      by: ['employeeId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    })
    console.log('RankingRaw:', rankingRaw)

    console.log('--- ALL OK ---')
  } catch (e: any) {
    console.error('--- DASHBOARD DEBUG ERROR ---')
    console.error(e)
  }
}

debugDashboard().finally(() => prisma.$disconnect())
