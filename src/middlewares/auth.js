import '../config/firebase.js';
import { getAuth } from 'firebase-admin/auth';
import { isEmailAllowed } from '../services/allowlist.js';
import { normalizeEmail } from '../utils/email.js';

export default async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  // try isolado: o next() precisa ficar fora, senão um erro síncrono de um
  // handler downstream cai neste catch e vira "Token inválido", mascarando a
  // causa real.
  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(header.slice(7));
  } catch {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }

  // Daqui para baixo o usuário está autenticado, mas ainda não autorizado: 403.
  const email = normalizeEmail(decoded.email);
  if (!email) {
    return res.status(403).json({ message: 'Sua conta não possui um e-mail associado.' });
  }

  // Este é o gate real: verifyIdToken sem checkRevoked aceita tokens de usuários
  // já deletados até expirarem (~1h), então a allowlist aqui é o que fecha a
  // janela entre criar e remover uma conta não autorizada.
  try {
    if (!(await isEmailAllowed(email))) {
      return res.status(403).json({ message: 'Seu e-mail não está autorizado a acessar o RoomBook.' });
    }
  } catch (err) {
    console.error('[Allowlist] verificação falhou:', err.message);
    return res.status(503).json({ message: 'Não foi possível verificar seu acesso. Tente novamente.' });
  }

  req.user = { uid: decoded.uid, email };
  next();
}
