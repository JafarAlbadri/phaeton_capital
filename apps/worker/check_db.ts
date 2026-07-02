import { PrismaClient } from '@phaeton/db';
const prisma = new PrismaClient();
async function main() {
    const unh = await prisma.financialHistory.findMany({ where: { ticker: 'UNH' } });
    console.log(JSON.stringify(unh, null, 2));
}
main();
