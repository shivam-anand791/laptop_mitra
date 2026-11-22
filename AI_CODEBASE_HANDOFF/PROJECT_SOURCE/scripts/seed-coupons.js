const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding test coupons into local dev database...');

  const coupons = [
    {
      code: 'WELCOME10',
      name: 'Welcome to LaptopMitra',
      title: 'Welcome to LaptopMitra',
      description: 'Get 10% discount up to ₹2,000 on your first certified laptop order.',
      type: 'percentage',
      value: 10,
      maxDiscountCap: 2000,
      minOrderValue: 10000,
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      firstOrderOnly: true,
      allowedPaymentMethods: 'ANY',
      badgeText: '10% OFF (UP TO ₹2,000)',
      terms: 'Valid on first order only for outright purchase certified laptops. Minimum cart subtotal ₹10,000.',
      highlight: true,
      maxUses: 1000,
      maxUsesPerUser: 1,
    },
    {
      code: 'FLAT1500',
      name: 'Mega Laptop Savings',
      title: 'Mega Laptop Savings',
      description: 'Flat ₹1,500 off on premium refurbished business laptops.',
      type: 'fixed',
      value: 1500,
      minOrderValue: 25000,
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      firstOrderOnly: false,
      allowedPaymentMethods: 'ANY',
      badgeText: 'FLAT ₹1,500 OFF',
      terms: 'Applicable on any order above ₹25,000. Limited period promotional offer.',
      highlight: true,
      maxUses: 500,
      maxUsesPerUser: 2,
    },
    {
      code: 'PREPAID500',
      name: 'Prepaid Express Discount',
      title: 'Prepaid Express Discount',
      description: 'Extra ₹500 discount when you pay online via UPI, Credit/Debit Card or NetBanking.',
      type: 'fixed',
      value: 500,
      minOrderValue: 5000,
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      firstOrderOnly: false,
      allowedPaymentMethods: 'ONLINE_ONLY',
      badgeText: 'EXTRA ₹500 ON PREPAID',
      terms: 'Valid on prepaid online payments only. Not eligible on Cash on Delivery (COD).',
      highlight: false,
      maxUses: 2000,
      maxUsesPerUser: 5,
    },
    {
      code: 'VIPEXCLUSIVE',
      name: 'VIP Member Special',
      title: 'VIP Member Special',
      description: 'Exclusive 20% savings up to ₹5,000 for select valued corporate & priority customers.',
      type: 'percentage',
      value: 20,
      maxDiscountCap: 5000,
      minOrderValue: 30000,
      status: 'ACTIVE',
      visibility: 'TARGETED',
      targetedUserIds: 'user-vip-1,user-vip-2',
      firstOrderOnly: false,
      allowedPaymentMethods: 'ANY',
      badgeText: 'VIP EXCLUSIVE 20% OFF',
      terms: 'Exclusive targeted offer for enrolled VIP customers only. Maximum discount cap ₹5,000.',
      highlight: true,
      maxUses: 50,
      maxUsesPerUser: 1,
    },
  ];

  for (const c of coupons) {
    const existing = await prisma.discountCode.findFirst({
      where: { code: c.code },
    });

    if (existing) {
      await prisma.discountCode.update({
        where: { id: existing.id },
        data: { ...c, updatedAt: new Date() },
      });
      console.log(`Updated coupon: ${c.code}`);
    } else {
      await prisma.discountCode.create({
        data: c,
      });
      console.log(`Created coupon: ${c.code}`);
    }
  }

  const allCoupons = await prisma.discountCode.findMany();
  console.log(`\nSuccessfully seeded ${allCoupons.length} coupons in database:`);
  allCoupons.forEach((ac) => {
    console.log(` - ${ac.code}: ${ac.title} (${ac.badgeText}) [${ac.status}, ${ac.visibility}]`);
  });
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  prisma.$disconnect();
  process.exit(1);
});
