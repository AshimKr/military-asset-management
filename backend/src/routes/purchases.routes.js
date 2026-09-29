import express from 'express';
import { pool, withTransaction } from '../config/db.js';
import { authenticate, allowRoles, assertBaseAccess } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { writeAudit } from '../services/audit.js';

const router = express.Router();
router.use(authenticate, allowRoles('ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER'));

router.get('/', asyncHandler(async (req, res) => {
  let baseId = req.query.baseId ? Number(req.query.baseId) : null;
  if (req.user.role !== 'ADMIN') baseId = assertBaseAccess(req.user, baseId || req.user.baseId);
  const equipmentTypeId = req.query.equipmentTypeId ? Number(req.query.equipmentTypeId) : null;
  const from = req.query.from || null;
  const to = req.query.to || null;

  const { rows } = await pool.query(
    `SELECT p.id, p.quantity, p.purchase_date AS "purchaseDate", p.supplier_reference AS "supplierReference",
            p.notes, p.created_at AS "createdAt", b.id AS "baseId", b.name AS "baseName",
            e.id AS "equipmentTypeId", e.name AS "equipmentName"
     FROM purchases p
     JOIN bases b ON b.id = p.base_id
     JOIN equipment_types e ON e.id = p.equipment_type_id
     WHERE ($1::bigint IS NULL OR p.base_id = $1)
       AND ($2::bigint IS NULL OR p.equipment_type_id = $2)
       AND ($3::date IS NULL OR p.purchase_date >= $3::date)
       AND ($4::date IS NULL OR p.purchase_date <= $4::date)
     ORDER BY p.purchase_date DESC, p.id DESC`,
    [baseId, equipmentTypeId, from, to]
  );
  res.json(rows);
}));

router.post('/', asyncHandler(async (req, res) => {
  const baseId = assertBaseAccess(req.user, req.body.baseId);
  const equipmentTypeId = Number(req.body.equipmentTypeId);
  const quantity = Number(req.body.quantity);
  const purchaseDate = req.body.purchaseDate;
  if (!Number.isInteger(equipmentTypeId) || !Number.isInteger(quantity) || quantity <= 0 || !purchaseDate) {
    throw new HttpError(400, 'baseId, equipmentTypeId, positive integer quantity, and purchaseDate are required');
  }

  const purchase = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO purchases(base_id, equipment_type_id, quantity, purchase_date, supplier_reference, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [baseId, equipmentTypeId, quantity, purchaseDate, req.body.supplierReference || null, req.body.notes || null, req.user.id]
    );
    const row = rows[0];
    await client.query(
      `INSERT INTO inventory_ledger(base_id, equipment_type_id, event_type, quantity_delta, occurred_at, reference_table, reference_id, created_by)
       VALUES ($1,$2,'PURCHASE',$3,$4::date,'purchases',$5,$6)`,
      [baseId, equipmentTypeId, quantity, purchaseDate, row.id, req.user.id]
    );
    await writeAudit(client, req, { action: 'PURCHASE_CREATED', entityType: 'purchase', entityId: row.id, baseId, details: { equipmentTypeId, quantity, purchaseDate } });
    return row;
  });
  res.status(201).json(purchase);
}));

export default router;
