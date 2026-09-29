import express from 'express';
import { pool } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

const router = express.Router();
router.use(authenticate);

router.get('/bases', asyncHandler(async (req, res) => {
  if (req.user.role === 'ADMIN') {
    const { rows } = await pool.query('SELECT id, name, code FROM bases ORDER BY name');
    return res.json(rows);
  }
  const { rows } = await pool.query('SELECT id, name, code FROM bases WHERE id = $1', [req.user.baseId]);
  res.json(rows);
}));

router.get('/transfer-bases', asyncHandler(async (_req, res) => {
  const { rows } = await pool.query('SELECT id, name, code FROM bases ORDER BY name');
  res.json(rows);
}));

router.get('/equipment-types', asyncHandler(async (_req, res) => {
  const { rows } = await pool.query('SELECT id, name, category, code, unit FROM equipment_types ORDER BY category, name');
  res.json(rows);
}));

export default router;
