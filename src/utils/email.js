/**
 * Chave canônica da allowlist: o ID do documento em `allowedEmails` é sempre
 * este valor. Duplicado do frontend (src/lib/email.ts) de propósito — são dois
 * repositórios sem package compartilhado, e um monorepo para três linhas não se
 * paga. Se um lado mudar, o outro precisa mudar junto.
 */
export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}
