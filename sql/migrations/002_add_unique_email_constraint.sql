-- Migration 002: add UNIQUE index on booking_participants.email
-- Required for the ON CONFLICT (email) upsert in resolveParticipantIds.
-- CREATE UNIQUE INDEX IF NOT EXISTS is idempotent and works like a UNIQUE constraint.

CREATE UNIQUE INDEX IF NOT EXISTS booking_participants_email_key
  ON booking_participants (email);
