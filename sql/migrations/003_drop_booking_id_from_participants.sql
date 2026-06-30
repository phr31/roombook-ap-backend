-- Migration 003: remove legacy booking_id column from booking_participants.
-- The table is now a global email registry; participant-booking relationships
-- are stored as a JSONB array of IDs inside bookings.participants.
-- DROP COLUMN IF EXISTS also drops any FK/check constraints on the column.

ALTER TABLE booking_participants DROP COLUMN IF EXISTS booking_id;
