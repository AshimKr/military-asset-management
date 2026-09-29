import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { pool } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';

const router = express.Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) throw new HttpError(400, 'Email and password are required');

  const { rows } = await pool.query(
    `SELECT id, name, email, password_hash, role, base_id, active
     FROM users WHERE email = $1`, [email]
  );
  const user = rows[0];
  if (!user || !user.active || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'Invalid credentials');
  }

  const token = jwt.sign(
    { role: user.role, baseId: user.base_id, name: user.name },
    process.env.JWT_SECRET,
    { subject: user.id, expiresIn: process.env.JWT_EXPIRES_IN || '30m' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, baseId: user.base_id },
  });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, base_id AS "baseId" FROM users WHERE id = $1 AND active = TRUE`,
    [req.user.id]
  );
  if (!rows[0]) throw new HttpError(401, 'User no longer active');
  res.json(rows[0]);
}));

export default router;
