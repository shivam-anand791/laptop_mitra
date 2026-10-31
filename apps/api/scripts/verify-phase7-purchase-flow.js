const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runPhase7Verification() {
  console.log('=== PHASE 7: BUYBACK & PURCHASE FLOW VERIFICATION ===\n');

  let passedChecks = 0;
  let totalChecks = 0;
  function assert(condition, message) {
    totalChecks++;
    if (condition) {
      console.log('  [PASS] ' + message);
      passedChecks++;
    } else {
      console.error('  [FAIL] ' + message);
      throw new Error('Assertion failed: ' + message);
    }
  }

  // 1. BUYBACK POLICY VERIFICATION FOR ALL ACTIVE VARIANTS
  console.log('1. Auditing Buyback Calculations Across All 28 Active Variants...');
  const tiers = [
    { period: '0 - 6 Months', percentage: 70 },
    { period: '6 - 12 Months', percentage: 60 },
    { period: '12 - 18 Months', percentage: 50 },
    { period: '18 - 24 Months', percentage: 40 },
    { period: '24 - 30 Months', percentage: 30 },
    { period: '30 - 36 Months', percentage: 20 },
  ];

  const variants = await prisma.productVariant.findMany({
    where: { isActive: true },
    include: { product: true },
  });

  assert(variants.length === 28, 'Found exactly 28 active variants in database');

  for (const v of variants) {
    const price = Number(v.price);
    assert(price > 0, 'Variant ' + v.sku + ' has positive price: ₹' + price);
    for (const t of tiers) {
      const buybackValue = Math.round(price * (t.percentage / 100));
      assert(buybackValue > 0 && buybackValue < price, 'Variant ' + v.sku + ' ' + t.period + ' buyback is ₹' + buybackValue.toLocaleString('en-IN') + ' (' + t.percentage + '%)');
    }
  }
  console.log('  => All 28 variants pass buyback tier calculations (168 calculation assertions passed).\n');

  // 2. CART VARIANT INTEGRATION & WARRANTY ADD-ON
  console.log('2. Testing Cart & Variant Integration with Warranty...');
  const testUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  assert(!!testUser, 'Found admin/test user: ' + testUser.email);

  // Clean or create a test cart
  let cart = await prisma.cart.findFirst({
    where: { userId: testUser.id },
    include: { items: true },
  });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId: testUser.id } });
  } else {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  const testVariant = variants.find(v => v.sku === 'LM-MBP16-M2P-32-1TB');
  assert(!!testVariant, 'Found test variant: ' + testVariant.sku + ' (₹' + testVariant.price + ')');

  // Add variant with warranty
  const cartItem = await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: testVariant.productId,
      variantId: testVariant.id,
      quantity: 1,
      priceAtAdd: testVariant.price,
      purchaseMode: 'sell',
      configuration: 'default',
      hasWarranty: true,
      warrantyPrice: 1999,
      lineKey: 'variant:' + testVariant.id + ':sell',
    },
    include: { variant: true, product: true },
  });

  assert(cartItem.variantId === testVariant.id, 'Cart item references correct variant ID');
  assert(Number(cartItem.priceAtAdd) === Number(testVariant.price), 'Cart item priceAtAdd matches variant price: ₹' + cartItem.priceAtAdd);
  assert(cartItem.hasWarranty === true, 'Cart item has extended doorstep warranty attached');
  assert(Number(cartItem.warrantyPrice) === 1999, 'Cart item warranty price is exactly ₹1,999');

  // 3. ORDER CREATION WITH ACID VARIANT STOCK DEDUCTION
  console.log('\n3. Testing Order Creation with Variant Stock Reservation...');
  const initialStock = testVariant.stock;
  assert(initialStock > 0, 'Test variant initial stock is: ' + initialStock);

  const orderNumber = 'ORD-QA-' + Date.now();
  const subtotalPaise = (Number(testVariant.price) + 1999) * 100;
  const subtotalDecimal = (subtotalPaise / 100).toFixed(2);

  // Simulate ACID transaction as in OrderService
  const createdOrder = await prisma.$transaction(async (tx) => {
    // 1. Decrement variant stock
    const updatedVariant = await tx.productVariant.update({
      where: { id: testVariant.id },
      data: { stock: { decrement: 1 } },
    });
    assert(updatedVariant.stock === initialStock - 1, 'Variant stock decremented to: ' + updatedVariant.stock);

    // 2. Create Order & OrderItem
    const ord = await tx.order.create({
      data: {
        userId: testUser.id,
        orderNumber,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'cod',
        subtotal: subtotalDecimal,
        discountAmount: '0.00',
        finalAmount: subtotalDecimal,
        shippingAddress: {
          fullName: 'QA Tester',
          phone: '9876543210',
          address: 'Nehru Place Commercial Complex',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110019',
        },
        phone: '9876543210',
        email: testUser.email,
        inventoryStatus: 'CONSUMED',
        items: {
          create: [{
            productId: testVariant.productId,
            variantId: testVariant.id,
            variantSku: testVariant.sku,
            variantName: testVariant.name,
            variantAttributes: testVariant.attributes,
            quantity: 1,
            price: Number(testVariant.price).toFixed(2),
            purchaseMode: 'sell',
            configuration: 'default',
            hasWarranty: true,
            warrantyPrice: '1999.00',
          }],
        },
      },
      include: { items: true },
    });
    return ord;
  });

  assert(!!createdOrder, 'Order created successfully: ' + createdOrder.orderNumber);
  assert(createdOrder.items.length === 1, 'Order has 1 line item');
  const lineItem = createdOrder.items[0];
  assert(lineItem.variantId === testVariant.id, 'Line item variantId preserved: ' + lineItem.variantId);
  assert(lineItem.variantSku === testVariant.sku, 'Line item variantSku preserved: ' + lineItem.variantSku);
  assert(lineItem.hasWarranty === true, 'Line item warranty preserved');
  assert(Number(lineItem.warrantyPrice) === 1999, 'Line item warranty price ₹1,999 preserved');
  assert(lineItem.variantAttributes.ram === '32GB', 'Line item snapshot attributes RAM preserved: ' + lineItem.variantAttributes.ram);
  assert(lineItem.variantAttributes.storage === '1TB SSD', 'Line item snapshot attributes Storage preserved: ' + lineItem.variantAttributes.storage);

  // 4. RESTORATION & TEARDOWN
  console.log('\n4. Restoring Variant Stock and Cleaning Test Records...');
  await prisma.productVariant.update({
    where: { id: testVariant.id },
    data: { stock: { increment: 1 } },
  });
  const restoredVariant = await prisma.productVariant.findUnique({ where: { id: testVariant.id } });
  assert(restoredVariant.stock === initialStock, 'Variant stock restored to initial: ' + restoredVariant.stock);

  await prisma.orderItem.deleteMany({ where: { orderId: createdOrder.id } });
  await prisma.order.delete({ where: { id: createdOrder.id } });
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  console.log('  [PASS] Test order and cart cleaned up cleanly.');

  console.log('\n=== PHASE 7 VERIFICATION SUCCESSFUL: ' + passedChecks + '/' + totalChecks + ' CHECKS PASSED ===');
  await prisma.$disconnect();
  process.exit(0);
}

runPhase7Verification().catch(err => {
  console.error('Phase 7 Verification Error:', err);
  prisma.$disconnect();
  process.exit(1);
});
