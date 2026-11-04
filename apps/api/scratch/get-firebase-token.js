const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

async function main() {
  const saPath = path.resolve(__dirname, '../secrets/firebase-service-account.json');
  if (!fs.existsSync(saPath)) {
    console.log('Not found:', saPath);
    return;
  }
  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  const app = admin.initializeApp({
    credential: admin.credential.cert(sa),
    projectId: sa.project_id
  }, 'token-generator');

  const customToken = await app.auth().createCustomToken('6Nh0CNBG5TNaWELUAb47iZgYxPu1');
  console.log('Custom token generated, length:', customToken.length);

  // Read NEXT_PUBLIC_FIREBASE_API_KEY from apps/web/.env
  let apiKey = '';
  const webEnvPath = path.resolve(__dirname, '../../../apps/web/.env');
  if (fs.existsSync(webEnvPath)) {
    const webEnv = fs.readFileSync(webEnvPath, 'utf8');
    const m = webEnv.match(/NEXT_PUBLIC_FIREBASE_API_KEY=["']?([^"'\r\n]+)/);
    if (m) apiKey = m[1];
  }
  if (!apiKey) {
    const rootEnvPath = path.resolve(__dirname, '../../../.env');
    if (fs.existsSync(rootEnvPath)) {
      const rootEnv = fs.readFileSync(rootEnvPath, 'utf8');
      const m = rootEnv.match(/NEXT_PUBLIC_FIREBASE_API_KEY=["']?([^"'\r\n]+)/);
      if (m) apiKey = m[1];
    }
  }

  if (!apiKey) {
    console.log('API key not found');
    return;
  }

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true })
  });
  const data = await res.json();
  if (data.idToken) {
    console.log('ID Token acquired! Length:', data.idToken.length);
    fs.writeFileSync(path.resolve(__dirname, 'demo-id-token.txt'), data.idToken, 'utf8');
  } else {
    console.log('Failed:', data);
  }
}
main().catch(console.error);
