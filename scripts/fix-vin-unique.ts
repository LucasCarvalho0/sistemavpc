/**
 * Script para corrigir o índice único do VIN no banco.
 * Remove o índice composto (vin, shiftDate) e cria um índice único em (vin) apenas.
 *
 * AVISO: Se houver VINs duplicados no banco (mesmo vin, datas diferentes),
 * primeiro remove os registros duplicados mantendo o mais antigo.
 */
import { prisma } from '../lib/prisma'

async function main() {
    console.log('🔍 Verificando VINs duplicados...')

    // Busca VINs que aparecem mais de uma vez
    const allProductions = await prisma.production.findMany({
        select: { id: true, vin: true, shiftDate: true, createdAt: true, employeeId: true },
        orderBy: { createdAt: 'asc' },
    })

    const seen = new Map<string, string>() // vin -> id do primeiro registro
    const toDelete: string[] = []

    for (const prod of allProductions) {
        if (seen.has(prod.vin)) {
            console.log(`  ⚠️  VIN duplicado: ${prod.vin} (id: ${prod.id}) - será removido`)
            toDelete.push(prod.id)
        } else {
            seen.set(prod.vin, prod.id)
        }
    }

    if (toDelete.length > 0) {
        console.log(`\n🗑️  Removendo ${toDelete.length} registro(s) duplicado(s)...`)
        await prisma.production.deleteMany({ where: { id: { in: toDelete } } })
        console.log('✅ Registros duplicados removidos.')
    } else {
        console.log('✅ Nenhum duplicado encontrado.')
    }

    // Agora aplica a migration via SQL raw
    console.log('\n🔧 Aplicando nova constraint única de VIN no banco...')
    await prisma.$executeRawUnsafe(`
    ALTER TABLE productions
    DROP CONSTRAINT IF EXISTS "productions_vin_shiftDate_key";
  `)
    await prisma.$executeRawUnsafe(`
    ALTER TABLE productions
    ADD CONSTRAINT "productions_vin_key" UNIQUE (vin);
  `)
    console.log('✅ Índice único de VIN aplicado com sucesso!')
}

main()
    .catch((e) => {
        console.error('❌ Erro:', e.message)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
