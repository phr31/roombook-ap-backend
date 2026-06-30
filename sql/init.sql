-- RoomBook AP — Database initialization
-- Run once against your PostgreSQL database:
--   psql "<DATABASE_URL>" -f sql/init.sql

CREATE TABLE IF NOT EXISTS rooms (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(255) UNIQUE NOT NULL,
  capacity INT
);

-- Global participant registry: each email is stored once.
-- Bookings store a JSONB array of IDs referencing this table.
CREATE TABLE IF NOT EXISTS booking_participants (
  id    SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id               SERIAL PRIMARY KEY,
  date             DATE         NOT NULL,
  start_time       VARCHAR(5)   NOT NULL,   -- "HH:mm"
  end_time         VARCHAR(5)   NOT NULL,
  environment      VARCHAR(20)  NOT NULL,   -- "room" | "remote"
  room             VARCHAR(255),
  meeting_link     TEXT,
  title            VARCHAR(80),
  created_by       VARCHAR(255) NOT NULL,   -- Firebase UID
  created_by_email VARCHAR(255) NOT NULL,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  reminder_sent_at TIMESTAMPTZ,
  participants     JSONB        DEFAULT '[]'::jsonb  -- array of booking_participant IDs
);

-- Seed default rooms
INSERT INTO rooms (name, capacity) VALUES
  ('Sala 1', 8),
  ('Sala 2', 12),
  ('Sala 3', 6)
ON CONFLICT (name) DO NOTHING;
