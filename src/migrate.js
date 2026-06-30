import { query } from '../db.js';

export async function runMigrations() {
  // 1. Base tables (no constraints that might not exist yet)
  await query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id       SERIAL PRIMARY KEY,
      name     VARCHAR(255) NOT NULL,
      capacity INT
    );

    CREATE TABLE IF NOT EXISTS booking_participants (
      id    SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id               SERIAL PRIMARY KEY,
      date             DATE         NOT NULL,
      start_time       VARCHAR(5)   NOT NULL,
      end_time         VARCHAR(5)   NOT NULL,
      environment      VARCHAR(20)  NOT NULL,
      created_by       VARCHAR(255) NOT NULL,
      created_by_email VARCHAR(255) NOT NULL,
      created_at       TIMESTAMPTZ  DEFAULT NOW()
    );
  `);

  // 2. Unique indexes (required before any ON CONFLICT clauses)
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS rooms_name_key
      ON rooms (name);
    CREATE UNIQUE INDEX IF NOT EXISTS booking_participants_email_key
      ON booking_participants (email);
  `);

  // 3. Seed default rooms (safe after the unique index exists)
  await query(`
    INSERT INTO rooms (name, capacity) VALUES
      ('Sala 1', 8), ('Sala 2', 12), ('Sala 3', 6)
    ON CONFLICT (name) DO NOTHING;
  `);

  // 4. Add columns to bookings that were introduced after the initial deploy
  await query(`
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS room             VARCHAR(255);
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meeting_link     TEXT;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS title            VARCHAR(80);
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS participants     JSONB DEFAULT '[]'::jsonb;
  `);

  // 5. Drop legacy booking_id column from participant registry
  await query(`
    ALTER TABLE booking_participants DROP COLUMN IF EXISTS booking_id;
  `);

  console.log('[DB] Migrations OK');
}
