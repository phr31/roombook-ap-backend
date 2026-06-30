-- Migration 004: add participants JSONB column to bookings.
-- Stores an array of booking_participant IDs for each booking.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb;
