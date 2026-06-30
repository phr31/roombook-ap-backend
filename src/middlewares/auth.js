import '../config/firebase.js';
import { getAuth } from 'firebase-admin/auth';

export default async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  try {
    const decoded = await getAuth().verifyIdToken(header.slice(7));
    req.user = { uid: decoded.uid, email: decoded.email || '' };
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
}
