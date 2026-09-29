import 'dotenv/config';
import fs from 'fs/promises';
import { pool } from '../config/db.js';

try {
  const sql = await fs.readFile(new URL('../../db/001_init.sql', import.meta.url), 'utf8');
  await pool.query(sql);
  console.log('Database schema initialized.');
} finally {
  await pool.end();
}
