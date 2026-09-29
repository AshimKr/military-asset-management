import express from 'express';
import { pool, withTransaction } from '../config/db.js';
import { authenticate, allowRoles, assertBaseAccess } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { ensureStock } from '../services/stock.js';
import { writeAudit } from '../services/audit.js';

const router = express.Router();
router.use(authenticate, allowRoles('ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER'));

router.get('/', asyncHandler(async (req, res) => {
  const equipmentTypeId = req.query.equipmentTypeId ? Number(req.query.equipmentTypeId) : null;
  const from = req.query.from || null;
  const to = req.query.to || null;
  const scopedBaseId = req.user.role === 'ADMIN' ? (req.query.baseId ? Number(req.query.baseId) : null) : Number(req.user.baseId);

  const { rows } = await pool.query(
    `SELECT t.id, t.quantity, t.transferred_at AS "transferredAt", t.notes,
            fb.id AS "fromBaseId", fb.name AS "fromBaseName", tb.id AS "toBaseId", tb.name AS "toBaseName",
            e.id AS "equipmentTypeId", e.name AS "equipmentName"
     FROM transfers t
     JOIN bases fb ON fb.id=t.from_base_id
     JOIN bases tb ON tb.id=t.to_base_id
     JOIN equipment_types e ON e.id=t.equipment_type_id
     WHERE ($1::bigint IS NULL OR t.from_base_id=$1 OR t.to_base_id=$1)
       AND ($2::bigint IS NULL OR t.equipment_type_id=$2)
       AND ($3::date IS NULL OR t.transferred_at >= $3::date)
       AND ($4::date IS NULL OR t.transferred_at < ($4::date + INTERVAL '1 day'))
     ORDER BY t.transferred_at DESC, t.id DESC`,
    [scopedBaseId, equipmentTypeId, from, to]
  );
  res.json(rows);
}));

router.post('/', asyncHandler(async (req, res) => {
  const fromBaseId = assertBaseAccess(req.user, req.body.fromBaseId);
  const toBaseId = Number(req.body.toBaseId);
  const equipmentTypeId = Number(req.body.equipmentTypeId);
  const quantity = Number(req.body.quantity);
  const transferredAt = req.body.transferredAt || new Date().toISOString();
  if (!Number.isInteger(toBaseId) || toBaseId <= 0 || toBaseId === fromBaseId) throw new HttpError(400, 'A different valid destination base is required');
  if (!Number.isInteger(equipmentTypeId) || !Number.isInteger(quantity) || quantity <= 0) throw new HttpError(400, 'Valid equipmentTypeId and positive integer quantity are required');

  const transfer = await withTransaction(async (client) => {
    await ensureStock(client, fromBaseId, equipmentTypeId, quantity);
    const { rows } = await client.query(
      `INSERT INTO transfers(from_base_id,to_base_id,equipment_type_id,quantity,transferred_at,notes,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [fromBaseId, toBaseId, equipmentTypeId, quantity, transferredAt, req.body.notes || null, req.user.id]
    );
    const row = rows[0];
    await client.query(
      `INSERT INTO inventory_ledger(base_id,equipment_type_id,event_type,quantity_delta,occurred_at,reference_table,reference_id,created_by)
       VALUES ($1,$3,'TRANSFER_OUT',$4 * -1,$5,'transfers',$6,$7),
              ($2,$3,'TRANSFER_IN',$4,$5,'transfers',$6,$7)`,
      [fromBaseId, toBaseId, equipmentTypeId, quantity, transferredAt, row.id, req.user.id]
    );
    await writeAudit(client, req, { action: 'TRANSFER_CREATED', entityType: 'transfer', entityId: row.id, baseId: fromBaseId, details: { fromBaseId, toBaseId, equipmentTypeId, quantity, transferredAt } });
    return row;
  });
  res.status(201).json(transfer);
}));

export default router;
