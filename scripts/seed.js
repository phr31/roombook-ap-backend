import { query, pool } from '../db.js';

async function main() {
  await query(`
    INSERT INTO rooms (name, capacity) VALUES
      ('Sala 1', 8),
      ('Sala 2', 12),
      ('Sala 3', 6)
    ON CONFLICT (name) DO NOTHING
  `);
  console.log('Rooms seeded successfully.');
}

main()
  .catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
