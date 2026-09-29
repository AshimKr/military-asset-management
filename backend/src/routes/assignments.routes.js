import express from 'express';
import { pool, withTransaction } from '../config/db.js';
import { authenticate, allowRoles, assertBaseAccess } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { ensureStock } from '../services/stock.js';
import { writeAudit } from '../services/audit.js';

const router = express.Router();
router.use(authenticate, allowRoles('ADMIN', 'BASE_COMMANDER'));

router.get('/', asyncHandler(async (req, res) => {
  let baseId = req.query.baseId ? Number(req.query.baseId) : null;
  if (req.user.role !== 'ADMIN') baseId = assertBaseAccess(req.user, baseId || req.user.baseId);
  const { rows } = await pool.query(
    `SELECT a.id,a.quantity,a.personnel_reference AS "personnelReference",a.assigned_at AS "assignedAt",a.notes,
            b.id AS "baseId",b.name AS "baseName",e.id AS "equipmentTypeId",e.name AS "equipmentName"
     FROM assignments a JOIN bases b ON b.id=a.base_id JOIN equipment_types e ON e.id=a.equipment_type_id
     WHERE ($1::bigint IS NULL OR a.base_id=$1)
       AND ($2::bigint IS NULL OR a.equipment_type_id=$2)
       AND ($3::date IS NULL OR a.assigned_at >= $3::date)
       AND ($4::date IS NULL OR a.assigned_at < ($4::date + INTERVAL '1 day'))
     ORDER BY a.assigned_at DESC,a.id DESC`,
    [baseId, req.query.equipmentTypeId || null, req.query.from || null, req.query.to || null]
  );
  res.json(rows);
}));

router.post('/', asyncHandler(async (req, res) => {
  const baseId = assertBaseAccess(req.user, req.body.baseId);
  const equipmentTypeId = Number(req.body.equipmentTypeId);
  const quantity = Number(req.body.quantity);
  const personnelReference = String(req.body.personnelReference || '').trim();
  const assignedAt = req.body.assignedAt || new Date().toISOString();
  if (!Number.isInteger(equipmentTypeId) || !Number.isInteger(quantity) || quantity <= 0 || !personnelReference) throw new HttpError(400, 'Valid equipmentTypeId, quantity and personnelReference are required');

  const assignment = await withTransaction(async (client) => {
    await ensureStock(client, baseId, equipmentTypeId, quantity);
    const { rows } = await client.query(
      `INSERT INTO assignments(base_id,equipment_type_id,personnel_reference,quantity,assigned_at,notes,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [baseId,equipmentTypeId,personnelReference,quantity,assignedAt,req.body.notes || null,req.user.id]
    );
    const row=rows[0];
    await client.query(
      `INSERT INTO inventory_ledger(base_id,equipment_type_id,event_type,quantity_delta,occurred_at,reference_table,reference_id,created_by)
       VALUES($1,$2,'ASSIGNMENT',$3 * -1,$4,'assignments',$5,$6)`,
      [baseId,equipmentTypeId,quantity,assignedAt,row.id,req.user.id]
    );
    await writeAudit(client, req, { action:'ASSIGNMENT_CREATED', entityType:'assignment', entityId:row.id, baseId, details:{equipmentTypeId,quantity,personnelReference,assignedAt} });
    return row;
  });
  res.status(201).json(assignment);
}));

export default router;
