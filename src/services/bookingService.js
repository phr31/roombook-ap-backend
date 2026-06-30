import { query } from '../../db.js';
import { sendBookingConfirmation } from '../config/email.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** pg returns DATE columns as "YYYY-MM-DD" strings and TIMESTAMPTZ as Date objects. */
export function formatDate(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.split('T')[0]; // already "YYYY-MM-DD"
  return d.toISOString().split('T')[0];
}

/**
 * Upsert each email into booking_participants and return their IDs.
 * Uses ON CONFLICT DO NOTHING + SELECT to avoid race conditions.
 */
export async function resolveParticipantIds(emails) {
  const ids = [];
  for (const email of emails) {
    const result = await query(
      `INSERT INTO booking_participants (email)
       VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      [email]
    );
    ids.push(result.rows[0].id);
  }
  return ids;
}

/** Fetch emails for a list of booking_participant IDs. */
export async function getParticipantEmails(ids) {
  if (!ids?.length) return [];
  const result = await query(
    `SELECT email FROM booking_participants WHERE id = ANY($1)`,
    [ids]
  );
  return result.rows.map((r) => r.email);
}

/** Map a raw DB row + resolved emails to the shape expected by the frontend. */
function formatBooking(row, emails) {
  return {
    id: String(row.id),
    date: formatDate(row.date),
    startTime: row.start_time?.slice(0, 5),
    endTime: row.end_time?.slice(0, 5),
    environment: row.environment,
    ...(row.room != null && { room: row.room }),
    ...(row.meeting_link != null && { meetingLink: row.meeting_link }),
    ...(row.title != null && { title: row.title }),
    createdBy: row.created_by,
    createdByEmail: row.created_by_email,
    participants: emails,
    createdAt: new Date(row.created_at).getTime(), // frontend expects Unix ms
  };
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function getAllBookings() {
  const result = await query(`SELECT * FROM bookings ORDER BY date ASC`);

  return Promise.all(
    result.rows.map(async (row) => {
      const ids = Array.isArray(row.participants) ? row.participants : [];
      const emails = await getParticipantEmails(ids);
      return formatBooking(row, emails);
    })
  );
}

export async function createBooking(input, user) {
  const { date, startTime, endTime, environment, room, meetingLink, title, participants: emails } = input;

  // ── Conflict check (physical rooms only) ─────────────────────────────────
  // Overlap condition: existingStart < newEnd  AND  existingEnd > newStart
  if (environment === 'room' && room) {
    const conflict = await query(
      `SELECT id, start_time, end_time
       FROM bookings
       WHERE date = $1
         AND environment = 'room'
         AND room = $2
         AND start_time < $3
         AND end_time   > $4`,
      [date, room, endTime, startTime]
    );

    if (conflict.rows.length > 0) {
      const c = conflict.rows[0];
      const err = new Error(
        `Conflito de horário: ${room} já está reservada das ${c.start_time} às ${c.end_time} nessa data.`
      );
      err.statusCode = 409;
      throw err;
    }
  }

  // ── Upsert participants → get their IDs ──────────────────────────────────
  const participantIds = await resolveParticipantIds(emails);

  // ── Insert booking ────────────────────────────────────────────────────────
  const result = await query(
    `INSERT INTO bookings
       (date, start_time, end_time, environment, room, meeting_link, title,
        created_by, created_by_email, participants)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     RETURNING *`,
    [
      date,
      startTime,
      endTime,
      environment,
      environment === "room" ? (room ?? null) : null,
      meetingLink || null,
      title || null,
      user.uid,
      user.email,
      JSON.stringify(participantIds),
    ]
  );

  const formatted = formatBooking(result.rows[0], emails);

  // Fire-and-forget — confirmation email doesn't block the HTTP response
  sendBookingConfirmation(formatted, emails).catch((e) =>
    console.error('[Email] Confirmation failed:', e.message)
  );

  return formatted;
}

export async function deleteBooking(id, uid) {
  const numericId = parseInt(id, 10);

  if (isNaN(numericId)) {
    const err = new Error('ID inválido');
    err.statusCode = 400;
    throw err;
  }

  const found = await query(
    `SELECT id, created_by FROM bookings WHERE id = $1`,
    [numericId]
  );

  if (found.rows.length === 0) {
    const err = new Error('Agendamento não encontrado');
    err.statusCode = 404;
    throw err;
  }

  if (found.rows[0].created_by !== uid) {
    const err = new Error('Você não tem permissão para cancelar este agendamento');
    err.statusCode = 403;
    throw err;
  }

  await query(`DELETE FROM bookings WHERE id = $1`, [numericId]);
}
