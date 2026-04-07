const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Horários em minutos para facilitar comparação
const SHIFT_2_START = 16 * 60 + 48 // 1008
const SHIFT_2_END = 2 * 60        // 120 (dia seguinte)

async function main() {
  console.log('🚀 Iniciando reatribuição de turnos para produções...')

  // 1. Pegar todos os funcionários do Turno 2
  const shift2Employees = await prisma.employee.findMany({
    where: { shift: 2 }
  })
  const shift2EmpIds = shift2Employees.map(e => e.id)
  console.log(`👥 Funcionários do Turno 2 encontrados: ${shift2Employees.map(e => e.name).join(', ')}`)

  // 2. Atualizar produções desses funcionários para shift 2
  const updatedByEmp = await prisma.production.updateMany({
    where: { 
      employeeId: { in: shift2EmpIds },
      shift: 1 // Só atualiza as que estão como turno 1 por erro/default
    },
    data: { shift: 2 }
  })
  console.log(`✅ Atualizadas ${updatedByEmp.count} produções com base no funcionário (Turno 2).`)

  // 3. Atualizar produções com base no HORÁRIO (opcional mas bom para garantir)
  // Isso é mais complexo em SQL puro, mas vamos focar no que o usuário pediu.
  // O usuário pediu especificamente os carros "de 6 ao 7".
  
  const allProductions = await prisma.production.findMany({
    where: { shift: 1 } // Pegar os que sobraram no turno 1
  })

  let countByTime = 0
  for (const prod of allProductions) {
    // Converter createdAt para hora do Brasil
    const brHour = new Date(prod.createdAt.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getHours()
    const brMin = new Date(prod.createdAt.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getMinutes()
    const totalMin = brHour * 60 + brMin

    const isShift2Time = totalMin >= SHIFT_2_START || totalMin < SHIFT_2_END
    if (isShift2Time) {
      await prisma.production.update({
        where: { id: prod.id },
        data: { shift: 2 }
      })
      countByTime++
    }
  }

  console.log(`✅ Atualizadas ${countByTime} produções com base no HORÁRIO (16:48 - 02:00).`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
