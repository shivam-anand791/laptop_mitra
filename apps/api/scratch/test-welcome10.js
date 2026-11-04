const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

async function testWelcome10() {
  const saPath = path.resolve(__dirname, '../secrets/firebase-service-account.json');
  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  const app = admin.initializeApp({
    credential: admin.credential.cert(sa),
    projectId: sa.project_id
  }, 'welcome10-gen');

  const uid = `first-time-user-${Date.now()}`;
  const customToken = await app.auth().createCustomToken(uid);

  const webEnv = fs.readFileSync(path.resolve(__dirname, '../../../apps/web/.env'), 'utf8');
  const m = webEnv.match(/NEXT_PUBLIC_FIREBASE_API_KEY=["']?([^"'\r\n]+)/);
  const apiKey = m[1].trim();

  const exchRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true })
  });
  const { idToken } = await exchRes.json();

  // Sync first-time user
  await fetch('http://127.0.0.1:3001/auth/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
    body: JSON.stringify({ name: 'First Time Buyer', phone: '9123456789' })
  });

  // Place order with WELCOME10
  const orderRes = await fetch('http://127.0.0.1:3001/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
    body: JSON.stringify({
      email: 'firsttimer@example.com',
      phone: '9123456789',
      paymentMethod: 'razorpay',
      discountCode: 'WELCOME10',
      shippingAddress: {
        fullName: 'First Time Buyer',
        phone: '9123456789',
        address: '10 Connaught Place',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001'
      },
      cartItems: [{
        productId: 'prod-macbook-air-m1',
        quantity: 1,
        purchaseMode: 'sell'
      }]
    })
  });

  const orderData = await orderRes.json();
  console.log('WELCOME10 first order status:', orderRes.status);
  console.log('Discount amount:', orderData.discountAmount, 'Final amount:', orderData.finalAmount);
}

testWelcome10().catch(console.error);

