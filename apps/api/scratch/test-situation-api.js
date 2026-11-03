const fetch = globalThis.fetch || require('node-fetch');

async function test() {
  // Login demo user
  const loginRes = await fetch('http://127.0.0.1:3001/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@gmail.com', password: 'Password@123' }) // or Asdfg@12
  });
  let token;
  const loginData = await loginRes.json();
  if (loginData.accessToken) {
    token = loginData.accessToken;
  } else {
    // try Asdfg@12
    const loginRes2 = await fetch('http://127.0.0.1:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@gmail.com', password: 'Asdfg@12' })
    });
    const d2 = await loginRes2.json();
    token = d2.accessToken;
  }
  console.log('Got token:', !!token);

  const sitRes = await fetch('http://127.0.0.1:3001/support/items/92c17874-4c7d-42b0-8604-b81dcae899cb/situation', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const situation = await sitRes.json();
  console.log('Situation response:');
  console.log('situationTitle:', situation.situationTitle);
  console.log('situation:', situation.situation);
  console.log('actions:', JSON.stringify(situation.actions, null, 2));
}
test().catch(console.error);

