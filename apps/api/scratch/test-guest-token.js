const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

async function testGuest() {
  const saPath = path.resolve(__dirname, '../secrets/firebase-service-account.json');
  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  const app = admin.initializeApp({
    credential: admin.credential.cert(sa),
    projectId: sa.project_id
  }, 'guest-token-gen-2');

  const guestUid = `guest-${Date.now()}`;
  const customToken = await app.auth().createCustomToken(guestUid);

  let apiKey = '';
  const webEnv = fs.readFileSync(path.resolve(__dirname, '../../../apps/web/.env'), 'utf8');
  const m = webEnv.match(/NEXT_PUBLIC_FIREBASE_API_KEY=["']?([^"'\r\n]+)/);
  if (m) apiKey = m[1].trim();

  const exchRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true })
  });
  const exchData = await exchRes.json();
  const idToken = exchData.idToken;
  console.log('Guest ID token acquired, length:', idToken?.length);
  if (!idToken) {
    console.log('exchData error:', exchData);
    return;
  }

  // Sync guest user with API
  const syncRes = await fetch('http://127.0.0.1:3001/auth/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ name: 'Guest Shopper', phone: '9876543210' })
  });
  const syncData = await syncRes.json();
  console.log('Sync result: status', syncRes.status, 'user role:', syncData?.user?.role || syncData?.role);

  // Now place order as guest!
  const orderRes = await fetch('http://127.0.0.1:3001/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({
      email: 'guestcustomer@example.com',
      phone: '9876543210',
      paymentMethod: 'cod',
      shippingAddress: {
        fullName: 'Guest Customer',
        phone: '9876543210',
        address: '15 Barakhamba Road',
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
  console.log('Guest order status:', orderRes.status);
  console.log('Guest order response:', orderRes.status === 201 ? `SUCCESS! Order #${orderData.orderNumber}` : orderData);
}

testGuest().catch(console.error);
