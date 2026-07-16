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

const LIST_LIMIT = 500;

let listCache = null; // { at, emails }
let listInflight = null;

async function readList() {
  // select('active'): o e-mail é o ID do doc, então só o campo do filtro trafega.
  const snap = await getFirestore()
    .collection('allowedEmails')
    .select('active')
    .limit(LIST_LIMIT)
    .get();

  if (snap.size === LIST_LIMIT) {
    console.warn(`[Allowlist] atingiu LIST_LIMIT=${LIST_LIMIT}; e-mails além disso não são sugeridos.`);
  }

  // Espelha isEmailAllowed: `active` AUSENTE significa ativo. Por isso o filtro é
  // em JS e não no Firestore — where('active','!=',false) descartaria os docs sem
  // o campo, que são justamente os que devem entrar.
  return snap.docs
    .filter((d) => d.data()?.active !== false)
    .map((d) => d.id)
    .sort();
}

/** Lista os e-mails ativos. Cache próprio: um miss aqui custa N leituras, não 1. */
export async function listActiveEmails() {
  const now = Date.now();
  if (listCache && now - listCache.at < TTL_MS) return listCache.emails;
  if (listInflight) return listInflight;

  const p = readList()
    .then((emails) => {
      listCache = { at: Date.now(), emails };
      return emails;
    })
    .finally(() => {
      listInflight = null;
    });

  listInflight = p;
  return p; // devolve `p`, não `listInflight` — o finally já pode tê-lo zerado.
}

/** Exposto para testes. */
export function clearAllowlistCache() {
  cache.clear();
  listCache = null;
  listInflight = null;
}
