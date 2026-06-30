export default function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Erro interno do servidor';

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${req.method} ${req.path} → ${status}:`, err.message);
  }

  res.status(status).json({ message });
}
