const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const API_BASE = 'http://127.0.0.1:3001';
const customerToken = fs.readFileSync(path.resolve(__dirname, 'demo-id-token.txt'), 'utf8').trim();

let guestToken = '';

async function getGuestToken() {
  const saPath = path.resolve(__dirname, '../secrets/firebase-service-account.json');
  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  let app;
  try {
    app = admin.app('matrix-guest-app');
  } catch {
    app = admin.initializeApp({
      credential: admin.credential.cert(sa),
      projectId: sa.project_id
    }, 'matrix-guest-app');
  }

  const customToken = await app.auth().createCustomToken(`guest-matrix-${Date.now()}`);

  const webEnv = fs.readFileSync(path.resolve(__dirname, '../../../apps/web/.env'), 'utf8');
  const m = webEnv.match(/NEXT_PUBLIC_FIREBASE_API_KEY=["']?([^"'\r\n]+)/);
  const apiKey = m[1].trim();

  const exchRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true })
  });
  const { idToken } = await exchRes.json();

  // Sync guest user with API
  await fetch(`${API_BASE}/auth/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ name: 'Guest Customer', phone: '9876543210' })
  });

  return idToken;
}

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  let body;
  try {
    body = await res.json();
  } catch (e) {
    body = await res.text();
  }
  return { status: res.status, ok: res.ok, body };
}

async function setCart(items, tokenToUse) {
  const authHeader = tokenToUse ? { 'Authorization': `Bearer ${tokenToUse}` } : {};
  // Clear cart
  await request('/cart', { method: 'DELETE', headers: authHeader });
  // Add items
  for (const item of items) {
    await request('/cart/items', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify(item)
    });
  }
}

async function run() {
  guestToken = await getGuestToken();

  const results = [];

  async function testCase(name, setup) {
    try {
      const tokenToUse = setup.authType === 'guest' ? guestToken : (setup.authType === 'none' ? null : customerToken);
      if (setup.cartItems) {
        await setCart(setup.cartItems, tokenToUse);
      } else if (setup.payload?.cartItems && tokenToUse) {
        // Clear DB cart so payload.cartItems takes effect
        await setCart([], tokenToUse);
      }
      const headers = tokenToUse ? { 'Authorization': `Bearer ${tokenToUse}` } : {};
      const res = await request('/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(setup.payload)
      });
      const passed = res.status === (setup.expectedStatus || 201);
      results.push({
        name,
        pass: passed,
        status: res.status,
        expectedStatus: setup.expectedStatus || 201,
        response: res.body,
        notes: setup.notes
      });
    } catch (err) {
      results.push({
        name,
        pass: false,
        status: 'EXCEPTION',
        response: err.message,
        notes: setup.notes
      });
    }
  }

  const delhiAddress = {
    fullName: 'Demo Anand',
    phone: '9876543210',
    address: '12 Connaught Place',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001'
  };

  const mumbaiAddress = {
    fullName: 'Demo Anand',
    phone: '9876543210',
    address: '10 Marine Drive',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001'
  };

  // 1. Unauthenticated Request (no token) -> Rejection by FirebaseAuthGuard
  await testCase('1. Guest Checkout - Direct without auth token (expected 401)', {
    authType: 'none',
    payload: {
      email: 'guest@example.com',
      phone: '9876543210',
      paymentMethod: 'cod',
      shippingAddress: delhiAddress,
      cartItems: [{ productId: 'prod-macbook-air-m1', quantity: 1 }]
    },
    expectedStatus: 401,
    notes: 'Blocked by FirebaseAuthGuard (guestLogin on frontend required)'
  });

  // 2. Guest Session + COD (Delhi NCR)
  await testCase('2. Guest Checkout - COD (Delhi NCR, outright single item)', {
    authType: 'guest',
    payload: {
      email: 'guestbuyer@example.com',
      phone: '9876543210',
      paymentMethod: 'cod',
      shippingAddress: delhiAddress,
      cartItems: [{ productId: 'prod-macbook-air-m1', quantity: 1, purchaseMode: 'sell' }]
    },
    expectedStatus: 201,
    notes: 'Valid guest anonymous session order via COD'
  });

  // 3. Guest Session + Razorpay (Prepaid, Mumbai)
  await testCase('3. Guest Checkout - Razorpay (Mumbai 400001)', {
    authType: 'guest',
    payload: {
      email: 'guestbuyer@example.com',
      phone: '9876543210',
      paymentMethod: 'razorpay',
      shippingAddress: mumbaiAddress,
      cartItems: [{ productId: 'prod-macbook-air-m1', quantity: 1, purchaseMode: 'sell' }]
    },
    expectedStatus: 201,
    notes: 'Valid guest anonymous session order via Razorpay'
  });

  // 4. Signed-in + COD (Delhi NCR, outright single item)
  await testCase('4. Signed-in Customer + COD (Delhi NCR)', {
    authType: 'customer',
    cartItems: [{ productId: 'prod-macbook-air-m1', quantity: 1, purchaseMode: 'sell' }],
    payload: {
      email: 'demo@gmail.com',
      phone: '9876543210',
      paymentMethod: 'cod',
      shippingAddress: delhiAddress
    },
    expectedStatus: 201,
    notes: 'Valid signed-in COD in Delhi'
  });

  // 5. Signed-in + COD (Non-Delhi, Mumbai 400001)
  await testCase('5. Signed-in Customer + COD (Non-Delhi, Mumbai 400001)', {
    authType: 'customer',
    cartItems: [{ productId: 'prod-macbook-air-m1', quantity: 1, purchaseMode: 'sell' }],
    payload: {
      email: 'demo@gmail.com',
      phone: '9876543210',
      paymentMethod: 'cod',
      shippingAddress: mumbaiAddress
    },
    expectedStatus: 400,
    notes: 'Rejects non-Delhi COD with plain message'
  });

  // 6. Signed-in + Razorpay (Mumbai 400001, single item)
  await testCase('6. Signed-in Customer + Razorpay (Mumbai 400001)', {
    authType: 'customer',
    cartItems: [{ productId: 'prod-macbook-air-m1', quantity: 1, purchaseMode: 'sell' }],
    payload: {
      email: 'demo@gmail.com',
      phone: '9876543210',
      paymentMethod: 'razorpay',
      shippingAddress: mumbaiAddress
    },
    expectedStatus: 201,
    notes: 'Valid signed-in prepaid order to non-Delhi'
  });

  // 7. Signed-in + Razorpay (multi-item, qty > 1)
  await testCase('7. Signed-in Customer + Razorpay (multi-item, qty > 1)', {
    authType: 'customer',
    cartItems: [
      { productId: 'prod-macbook-air-m1', quantity: 2, purchaseMode: 'sell' },
      { productId: 'prod-hp-elitebook-840-g8', quantity: 1, purchaseMode: 'sell' }
    ],
    payload: {
      email: 'demo@gmail.com',
      phone: '9876543210',
      paymentMethod: 'razorpay',
      shippingAddress: delhiAddress
    },
    expectedStatus: 201,
    notes: 'Multiple products and quantities'
  });

  // 8. Signed-in + Coupon (Repeat customer with FLAT1500)
  await testCase('8. Signed-in Customer + Valid Coupon FLAT1500', {
    authType: 'customer',
    cartItems: [{ productId: 'prod-macbook-air-m1', quantity: 1, purchaseMode: 'sell' }],
    payload: {
      email: 'demo@gmail.com',
      phone: '9876543210',
      paymentMethod: 'razorpay',
      discountCode: 'FLAT1500',
      shippingAddress: delhiAddress
    },
    expectedStatus: 201,
    notes: 'Valid recurring discount coupon'
  });

  // 9. Signed-in + Coupon (Invalid FAKE100)
  await testCase('9. Signed-in Customer + Invalid Coupon FAKE100', {
    authType: 'customer',
    cartItems: [{ productId: 'prod-macbook-air-m1', quantity: 1, purchaseMode: 'sell' }],
    payload: {
      email: 'demo@gmail.com',
      phone: '9876543210',
      paymentMethod: 'razorpay',
      discountCode: 'FAKE100',
      shippingAddress: delhiAddress
    },
    expectedStatus: 400,
    notes: 'Invalid coupon code rejection'
  });

  // 10. Signed-in + Self referral code
  await testCase('10. Signed-in Customer + Self referral code', {
    authType: 'customer',
    cartItems: [{ productId: 'prod-macbook-air-m1', quantity: 1, purchaseMode: 'sell' }],
    payload: {
      email: 'demo@gmail.com',
      phone: '9876543210',
      paymentMethod: 'razorpay',
      referralCode: 'mitrademo6579',
      shippingAddress: delhiAddress
    },
    expectedStatus: 400,
    notes: 'Self referral rejection'
  });

  // 11. Signed-in + Warranty add-on
  await testCase('11. Signed-in Customer + Warranty add-on', {
    authType: 'customer',
    cartItems: [{ productId: 'prod-macbook-air-m1', quantity: 1, purchaseMode: 'sell', hasWarranty: true }],
    payload: {
      email: 'demo@gmail.com',
      phone: '9876543210',
      paymentMethod: 'razorpay',
      shippingAddress: delhiAddress
    },
    expectedStatus: 201,
    notes: 'Warranty add-on'
  });

  // 12. Signed-in + Variant option (ASUS ROG 32GB/1TB)
  await testCase('12. Signed-in Customer + Variant option (32GB/1TB)', {
    authType: 'customer',
    cartItems: [{
      productId: 'prod-asus-rog-zephyrus-g14',
      variantId: '3b13ee1f-5621-4198-9673-1e1047c8144a',
      quantity: 1,
      purchaseMode: 'sell'
    }],
    payload: {
      email: 'demo@gmail.com',
      phone: '9876543210',
      paymentMethod: 'razorpay',
      shippingAddress: delhiAddress
    },
    expectedStatus: 201,
    notes: 'Product with variant ID'
  });

  // 13. Signed-in + Rental (MacBook Air, 12 months)
  await testCase('13. Signed-in Customer + Rental (MacBook Air, 12 months)', {
    authType: 'customer',
    cartItems: [{
      productId: 'prod-macbook-air-m1',
      quantity: 1,
      purchaseMode: 'lease',
      tenureMonths: 12
    }],
    payload: {
      email: 'demo@gmail.com',
      phone: '9876543210',
      paymentMethod: 'razorpay',
      shippingAddress: delhiAddress
    },
    expectedStatus: 201,
    notes: 'Valid lease item with approved price'
  });

  // 14. Signed-in + Rental (ThinkPad X1 Carbon, no rental price)
  await testCase('14. Signed-in Customer + Rental (item without approved price)', {
    authType: 'customer',
    payload: {
      email: 'demo@gmail.com',
      phone: '9876543210',
      paymentMethod: 'razorpay',
      shippingAddress: delhiAddress,
      cartItems: [{
        productId: 'prod-thinkpad-x1-carbon-g10',
        quantity: 1,
        purchaseMode: 'lease',
        tenureMonths: 12
      }]
    },
    expectedStatus: 400,
    notes: 'Lease item without approved price'
  });

  // 15. Signed-in + Rental + COD
  await testCase('15. Signed-in Customer + Rental + COD', {
    authType: 'customer',
    payload: {
      email: 'demo@gmail.com',
      phone: '9876543210',
      paymentMethod: 'cod',
      shippingAddress: delhiAddress,
      cartItems: [{
        productId: 'prod-macbook-air-m1',
        quantity: 1,
        purchaseMode: 'lease',
        tenureMonths: 12
      }]
    },
    expectedStatus: 400,
    notes: 'Rental requires AutoPay mandate, COD rejected'
  });

  // 16. Signed-in + Mixed Cart (Buy + Rent together)
  await testCase('16. Signed-in Customer + Mixed Cart (Buy + Rent in same order)', {
    authType: 'customer',
    payload: {
      email: 'demo@gmail.com',
      phone: '9876543210',
      paymentMethod: 'razorpay',
      shippingAddress: delhiAddress,
      cartItems: [
        { productId: 'prod-macbook-air-m1', quantity: 1, purchaseMode: 'sell' },
        { productId: 'prod-macbook-air-m1', quantity: 1, purchaseMode: 'lease', tenureMonths: 12 }
      ]
    },
    expectedStatus: 400,
    notes: 'Mixed buy and rent checkout rejected'
  });

  // 17. Signed-in + Empty DB cart with cartItems in body
  await testCase('17. Signed-in Customer + Empty DB cart with cartItems in body', {
    authType: 'customer',
    cartItems: [], // explicitly empty DB cart
    payload: {
      email: 'demo@gmail.com',
      phone: '9876543210',
      paymentMethod: 'cod',
      shippingAddress: delhiAddress,
      cartItems: [{ productId: 'prod-macbook-air-m1', quantity: 1 }]
    },
    expectedStatus: 201,
    notes: 'Web sends cartItems but DB cart is empty'
  });

  console.log('\n=== COMPREHENSIVE CHECKOUT MATRIX RESULTS ===\n');
  let passCount = 0;
  for (const r of results) {
    if (r.pass) passCount++;
    console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.name}`);
    console.log(`  Status: ${r.status} (expected: ${r.expectedStatus})`);
    console.log(`  Notes: ${r.notes}`);
    if (!r.pass || r.status >= 400) {
      console.log(`  Response:`, JSON.stringify(r.response));
    }
    console.log('');
  }
  console.log(`Summary: ${passCount}/${results.length} PASSED`);

  fs.writeFileSync(path.resolve(__dirname, 'matrix-results.json'), JSON.stringify(results, null, 2), 'utf8');
}

run().catch(console.error);
