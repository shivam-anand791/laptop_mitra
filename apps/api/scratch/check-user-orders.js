const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'demo@gmail.com' },
    include: {
      businessProfile: true,
      orders: {
        include: {
          items: {
            include: {
              product: true,
              buybackRequests: true,
              leaseContract: true,
            }
          },
          deliveries: true,
          returnRequests: {
            include: { items: true }
          },
          orderChangeRequests: true,
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  console.log('User ID:', user?.id);
  console.log('Business profile:', user?.businessProfile ? { company: user.businessProfile.companyName, priority: user.businessProfile.priorityEnabled } : null);
  console.log('Total Orders:', user?.orders.length);
  for (const o of (user?.orders || [])) {
    console.log(`Order #${o.orderNumber} (id: ${o.id}) - Status: ${o.status}, Payment: ${o.paymentStatus}, Items: ${o.items.length}, Deliveries: ${o.deliveries.length}, Returns: ${o.returnRequests.length}, Changes: ${o.orderChangeRequests.length}`);
    for (const it of o.items) {
      console.log(`  Item ${it.id}: ${it.product?.name || 'Unnamed'}, Mode: ${it.purchaseMode}, Price: ${it.price}, Status: ${it.status}, Buybacks: ${it.buybackRequests.length}, Lease: ${!!it.leaseContract}`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
