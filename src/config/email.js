import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || process.env.SMTP_USER;

function locationHtml(booking) {
  return booking.environment === 'room'
    ? `<strong>Sala:</strong> ${booking.room}`
    : `<strong>Link:</strong> <a href="${booking.meetingLink}">${booking.meetingLink}</a>`;
}

export async function sendBookingConfirmation(booking, participantEmails) {
  if (!process.env.SMTP_HOST) return;

  const subject = `[RoomBook] Reunião confirmada: ${booking.title || 'Sem título'} — ${booking.date}`;
  const html = `
    <h2 style="color:#1d4ed8">Reunião Confirmada ✓</h2>
    <p>Você foi adicionado a uma reunião. Confira os detalhes abaixo.</p>
    <table cellpadding="6">
      <tr><td><strong>Título:</strong></td><td>${booking.title || '—'}</td></tr>
      <tr><td><strong>Data:</strong></td><td>${booking.date}</td></tr>
      <tr><td><strong>Horário:</strong></td><td>${booking.startTime} – ${booking.endTime}</td></tr>
      <tr><td>${locationHtml(booking)}</td></tr>
      <tr><td><strong>Organizador:</strong></td><td>${booking.createdByEmail}</td></tr>
    </table>
    <p style="color:#6b7280;font-size:12px">E-mail automático — RoomBook.</p>
  `;

  const to = [...new Set([booking.createdByEmail, ...participantEmails])].join(', ');
  await transporter.sendMail({ from: FROM, to, subject, html });
}

export async function sendReminderEmail(booking, participantEmails) {
  if (!process.env.SMTP_HOST) return;

  const subject = `[RoomBook] Lembrete: ${booking.title || 'Reunião'} começa às ${booking.startTime}`;
  const html = `
    <h2 style="color:#b45309">Lembrete de Reunião ⏰</h2>
    <p>Sua reunião começa em breve!</p>
    <table cellpadding="6">
      <tr><td><strong>Título:</strong></td><td>${booking.title || '—'}</td></tr>
      <tr><td><strong>Data:</strong></td><td>${booking.date}</td></tr>
      <tr><td><strong>Horário:</strong></td><td>${booking.startTime} – ${booking.endTime}</td></tr>
      <tr><td>${locationHtml(booking)}</td></tr>
    </table>
    <p style="color:#6b7280;font-size:12px">E-mail automático — RoomBook.</p>
  `;

  const to = [...new Set([booking.createdByEmail, ...participantEmails])].join(', ');
  await transporter.sendMail({ from: FROM, to, subject, html });
}
