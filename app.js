import 'dotenv/config';

import express from 'express';
import cors from 'cors';

import bookingRoutes from './src/routes/bookingRoutes.js';
import errorHandler from './src/middlewares/errorHandler.js';
import { startReminderJob } from './src/jobs/reminderJob.js';
import { runMigrations } from './src/migrate.js';

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:8080')
  .split(',')
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/bookings', bookingRoutes);

app.use((_req, res) => res.status(404).json({ message: 'Rota nao encontrada' }));
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3001', 10);

await runMigrations();

app.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
  startReminderJob();
});

export default app;
