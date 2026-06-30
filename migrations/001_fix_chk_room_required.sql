-- Alinha chk_room_required à coluna `room` (VARCHAR) usada pela aplicação,
-- em vez de `room_id` (que o backend nunca preenche).
BEGIN;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_room_required;

ALTER TABLE bookings ADD CONSTRAINT chk_room_required CHECK (
  (environment = 'room'   AND room IS NOT NULL) OR
  (environment = 'remote' AND room IS NULL)
);

COMMIT;
