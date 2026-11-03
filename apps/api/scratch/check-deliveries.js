const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const deliveries = await prisma.delivery.findMany({
    include: { order: true }
  });
  console.log('Deliveries count:', deliveries.length);
  for (const d of deliveries) {
    console.log(`Order ${d.order.orderNumber} (id: ${d.orderId}) - status: ${d.status}, deliveredAt: ${d.deliveredAt}, tracking: ${d.trackingNumber}, carrier: ${d.carrier}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());

