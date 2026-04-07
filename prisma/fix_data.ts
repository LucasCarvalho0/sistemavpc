import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
}).$extends(withAccelerate())

async function main() {
  console.log('Fixing Employee data for unique registration...')
  const employees = await (prisma as any).employee.findMany();
  for (const emp of employees) {
    if (!emp.registration || emp.registration === "") {
        await (prisma as any).employee.update({
            where: { id: emp.id },
            data: { registration: emp.id }
        });
        console.log(`Updated ${emp.name} with registration ${emp.id}`);
    }
  }
}

main().catch(console.log).finally(() => (prisma as any).$disconnect());
