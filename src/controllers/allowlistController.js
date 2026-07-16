import { listActiveEmails } from '../services/allowlist.js';

export async function list(req, res, next) {
  try {
    res.json(await listActiveEmails());
  } catch (err) {
    next(err);
  }
}
