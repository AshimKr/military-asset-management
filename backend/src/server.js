import 'dotenv/config';
import { app } from './app.js';
import { pool } from './config/db.js';

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be configured');

await pool.query('SELECT 1');
app.listen(port, host, () => console.log(`API listening on ${host}:${port}`));
