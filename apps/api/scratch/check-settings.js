const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const discounts = await prisma.discountCode.findMany();
  console.log('DiscountCodes count:', discounts.length);
  for (const d of discounts) {
    console.log(`DiscountCode ${d.code}: type=${d.type}, value=${d.value}, active=${d.isActive}`);
  }

  const sysSettings = await prisma.systemSetting.findMany();
  console.log('SystemSettings count:', sysSettings.length);
  for (const s of sysSettings) {
    console.log(`SystemSetting ${s.key}=${s.value}`);
  }

  const support = await prisma.supportSettings.findFirst();
  console.log('SupportSettings:', support ? { returnWindowDays: support.returnWindowDays, warrantyDays: support.standardWarrantyDays } : null);

  const buyback = await prisma.buybackSettings.findFirst();
  console.log('BuybackSettings:', buyback ? { enabled: buyback.enabled } : null);

  const service = await prisma.serviceSettings.findFirst();
  console.log('ServiceSettings:', service ? { enabled: service.serviceEnabled } : null);
}
main().catch(console.error).finally(() => prisma.$disconnect());
