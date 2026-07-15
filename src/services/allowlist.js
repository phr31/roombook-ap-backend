import '../config/firebase.js';
import { getFirestore } from 'firebase-admin/firestore';
import { normalizeEmail } from '../utils/email.js';

// Cache em memória em vez de custom claims: claims só entram no JWT quando o
// cliente pega um token novo (até ~1h de lag), o que tornaria a revogação lenta
// e quebraria o fluxo principal do produto — "liberei você, entre agora".
// Também exigiriam uma Cloud Function sincronizando allowedEmails -> claims,
// criando uma segunda fonte de verdade.
const TTL_MS = parseInt(process.env.ALLOWLIST_CACHE_TTL_MS || '60000', 10);
const MAX_ENTRIES = 500;

const cache = new Map(); // email normalizado -> { at, allowed }

function prune(now) {
  for (const [key, value] of cache) {
    if (now - value.at >= TTL_MS) cache.delete(key);
  }
}

/**
 * Lança se o Firestore estiver indisponível — o chamador DEVE fail-closed.
 * Diferente do cliente, aqui não existe a opção "talvez": este é o gate real.
 */
export async function isEmailAllowed(email) {
  const id = normalizeEmail(email);
  if (!id) return false;

  const now = Date.now();
  const hit = cache.get(id);
  if (hit && now - hit.at < TTL_MS) return hit.allowed;

  // O Admin SDK ignora as security rules, então esta leitura independe do
  // firestore.rules do frontend.
  const snap = await getFirestore().collection('allowedEmails').doc(id).get();
  const allowed = snap.exists && snap.data()?.active !== false;

  if (cache.size > MAX_ENTRIES) prune(now);
  cache.set(id, { at: now, allowed });

  return allowed;
}

/** Exposto para testes. */
export function clearAllowlistCache() {
  cache.clear();
}
