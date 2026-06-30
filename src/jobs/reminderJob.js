import cron from 'node-cron';
import { query } from '../../db.js';
import { formatDate, getParticipantEmails } from '../services/bookingService.js';
import { sendReminderEmail } from '../config/email.js';

// ─── Time helpers (all local time — startTime is entered in local timezone) ──

function padTwo(n) {
  return String(n).padStart(2, '0');
}

function nowAsHHMM() {
  const d = new Date();
  return `${padTwo(d.getHours())}:${padTwo(d.getMinutes())}`;
}

function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${padTwo(Math.floor(total / 60))}:${padTwo(total % 60)}`;
}

// ─── Job ─────────────────────────────────────────────────────────────────────

async function sendReminders() {
  const now = nowAsHHMM();
  const windowStart = addMinutes(now, 10);
  const windowEnd = addMinutes(now, 60);

  console.log(`[ReminderJob] ${formatDate(new Date())} — window ${windowStart}–${windowEnd}`);

  const result = await query(
    `SELECT * FROM bookings
     WHERE date = CURRENT_DATE
       AND reminder_sent_at IS NULL
       AND start_time >= $1
       AND start_time <= $2`,
    [windowStart, windowEnd]
  );

  if (result.rows.length === 0) {
    console.log('[ReminderJob] Nothing to remind.');
    return;
  }

  for (const row of result.rows) {
    try {
      const ids = Array.isArray(row.participants) ? row.participants : [];
      const emails = await getParticipantEmails(ids);

      await sendReminderEmail(
        {
          date: formatDate(row.date),
          startTime: row.start_time,
          endTime: row.end_time,
          environment: row.environment,
          room: row.room,
          meetingLink: row.meeting_link,
          title: row.title,
          createdByEmail: row.created_by_email,
        },
        emails
      );

      await query(
        `UPDATE bookings SET reminder_sent_at = NOW() WHERE id = $1`,
        [row.id]
      );

      console.log(`[ReminderJob] Reminder sent for booking #${row.id}`);
    } catch (err) {
      console.error(`[ReminderJob] Failed for booking #${row.id}:`, err.message);
    }
  }
}

export function startReminderJob() {
  cron.schedule('0,15,30,45 * * * *', sendReminders);
  console.log('[ReminderJob] Scheduled (every 15 min).');
}
