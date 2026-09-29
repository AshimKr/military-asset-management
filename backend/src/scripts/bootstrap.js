import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

async function main() {
  const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || '');
  const adminName = String(process.env.ADMIN_NAME || 'System Admin').trim();

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be configured for deployment bootstrap');
  }
  if (adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      INSERT INTO bases(name, code) VALUES
        ('Alpha Base', 'ALPHA'),
        ('Bravo Base', 'BRAVO'),
        ('Charlie Base', 'CHARLIE')
      ON CONFLICT(code) DO NOTHING
    `);

    await client.query(`
      INSERT INTO equipment_types(name, category, code, unit) VALUES
        ('Utility Vehicle', 'Vehicle', 'VEH-UTIL', 'vehicle'),
        ('Standard Equipment Unit', 'Equipment', 'EQ-STD', 'unit'),
        ('Training Ammunition Pack', 'Consumable', 'CONS-TRAIN', 'pack')
      ON CONFLICT(code) DO NOTHING
    `);

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (existing.rowCount === 0) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await client.query(
        `INSERT INTO users(name, email, password_hash, role, base_id)
         VALUES($1, $2, $3, 'ADMIN', NULL)`,
        [adminName, adminEmail, passwordHash],
      );
      console.log(`Created deployment admin: ${adminEmail}`);
    } else {
      console.log(`Deployment admin already exists: ${adminEmail}`);
    }

    await client.query('COMMIT');
    console.log('Deployment bootstrap complete.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
