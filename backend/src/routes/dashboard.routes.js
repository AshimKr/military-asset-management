import express from 'express';
import { pool } from '../config/db.js';
import { authenticate, allowRoles, assertBaseAccess } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';

const router = express.Router();
router.use(authenticate, allowRoles('ADMIN', 'BASE_COMMANDER'));

function filters(req) {
  const from = req.query.from;
  const to = req.query.to;
  if (!from || !to) throw new HttpError(400, 'from and to dates are required');
  let baseId = req.query.baseId ? Number(req.query.baseId) : null;
  if (req.user.role !== 'ADMIN') baseId = assertBaseAccess(req.user, baseId || req.user.baseId);
  const equipmentTypeId = req.query.equipmentTypeId ? Number(req.query.equipmentTypeId) : null;
  return { from, to, baseId, equipmentTypeId };
}

router.get('/', asyncHandler(async (req, res) => {
  const { from, to, baseId, equipmentTypeId } = filters(req);
  const { rows } = await pool.query(
    `SELECT
      COALESCE(SUM(quantity_delta) FILTER (WHERE occurred_at < $1::date), 0)::int AS "openingBalance",
      COALESCE(SUM(quantity_delta) FILTER (WHERE event_type = 'PURCHASE' AND occurred_at >= $1::date AND occurred_at < ($2::date + INTERVAL '1 day')), 0)::int AS purchases,
      COALESCE(SUM(quantity_delta) FILTER (WHERE event_type = 'TRANSFER_IN' AND occurred_at >= $1::date AND occurred_at < ($2::date + INTERVAL '1 day')), 0)::int AS "transferIn",
      COALESCE(-SUM(quantity_delta) FILTER (WHERE event_type = 'TRANSFER_OUT' AND occurred_at >= $1::date AND occurred_at < ($2::date + INTERVAL '1 day')), 0)::int AS "transferOut",
      COALESCE(-SUM(quantity_delta) FILTER (WHERE event_type = 'ASSIGNMENT' AND occurred_at >= $1::date AND occurred_at < ($2::date + INTERVAL '1 day')), 0)::int AS assigned,
      COALESCE(-SUM(quantity_delta) FILTER (WHERE event_type = 'EXPENDITURE' AND occurred_at >= $1::date AND occurred_at < ($2::date + INTERVAL '1 day')), 0)::int AS expended,
      COALESCE(SUM(quantity_delta) FILTER (WHERE occurred_at < ($2::date + INTERVAL '1 day')), 0)::int AS "closingBalance"
     FROM inventory_ledger
     WHERE ($3::bigint IS NULL OR base_id = $3)
       AND ($4::bigint IS NULL OR equipment_type_id = $4)`,
    [from, to, baseId, equipmentTypeId]
  );
  const metrics = rows[0];
  metrics.netMovement = metrics.purchases + metrics.transferIn - metrics.transferOut;
  res.json(metrics);
}));

router.get('/movements', asyncHandler(async (req, res) => {
  const { from, to, baseId, equipmentTypeId } = filters(req);
  const { rows } = await pool.query(
    `SELECT l.id, l.event_type AS "eventType", ABS(l.quantity_delta)::int AS quantity,
            l.occurred_at AS "occurredAt", b.name AS "baseName", e.name AS "equipmentName",
            l.reference_table AS "referenceTable", l.reference_id AS "referenceId"
     FROM inventory_ledger l
     JOIN bases b ON b.id = l.base_id
     JOIN equipment_types e ON e.id = l.equipment_type_id
     WHERE l.event_type IN ('PURCHASE','TRANSFER_IN','TRANSFER_OUT')
       AND l.occurred_at >= $1::date AND l.occurred_at < ($2::date + INTERVAL '1 day')
       AND ($3::bigint IS NULL OR l.base_id = $3)
       AND ($4::bigint IS NULL OR l.equipment_type_id = $4)
     ORDER BY l.occurred_at DESC, l.id DESC`,
    [from, to, baseId, equipmentTypeId]
  );
  res.json(rows);
}));

export default router;
