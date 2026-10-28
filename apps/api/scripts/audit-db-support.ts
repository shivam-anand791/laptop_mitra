import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const inquiryCount = await prisma.corporateInquiry.count();
    console.log(`Corporate inquiries in DB: ${inquiryCount}`);
    
    // Check if there are any tables related to support in PostgreSQL
    const tables: any = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log('Tables in PostgreSQL public schema:');
    for (const t of tables) {
      console.log(` - ${t.table_name}`);
    }

    const orderCount = await prisma.order.count();
    console.log(`Total Orders in DB: ${orderCount}`);
    
    // Check orders with returns requested
    const ordersWithReturn: any = await prisma.order.findMany({
      where: {
        notes: { contains: 'Return Requested' }
      },
      select: { id: true, orderNumber: true, status: true, notes: true }
    });
    console.log(`Orders with return requested in notes: ${ordersWithReturn.length}`);

  } catch (err) {
    console.error('Error querying DB:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
