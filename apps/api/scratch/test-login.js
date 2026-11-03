const fetch = globalThis.fetch || require('node-fetch');

async function test() {
  const loginRes = await fetch('http://127.0.0.1:3001/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@gmail.com', password: 'Password@123' })
  });
  console.log('Status:', loginRes.status);
  const data = await loginRes.json();
  console.log('Login res:', data);
}
test().catch(console.error);

