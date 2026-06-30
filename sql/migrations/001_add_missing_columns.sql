-- Migration 001: add columns that were absent when the table was first created.
-- Safe to re-run: IF NOT EXISTS is idempotent.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS room             VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meeting_link     TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS title            VARCHAR(80);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
