import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { readFileSync } from 'fs';
import { resolve } from 'path';

if (getApps().length === 0) {
  let credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    credential = cert(JSON.parse(json));
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const resolved = resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    credential = cert(JSON.parse(readFileSync(resolved, 'utf8')));
  } else {
    throw new Error(
      'Firebase credentials not configured. ' +
      'Set FIREBASE_SERVICE_ACCOUNT_BASE64 or FIREBASE_SERVICE_ACCOUNT_PATH in .env'
    );
  }

  initializeApp({ credential });
}
