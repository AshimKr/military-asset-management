import express from 'express';
import { withTransaction } from '../config/db.js';
import { authenticate, allowRoles } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { writeAudit } from '../services/audit.js';

const router=express.Router();
router.use(authenticate, allowRoles('ADMIN'));

router.post('/opening-balance', asyncHandler(async (req,res)=>{
  const baseId=Number(req.body.baseId);
  const equipmentTypeId=Number(req.body.equipmentTypeId);
  const quantity=Number(req.body.quantity);
  const occurredAt=req.body.occurredAt || new Date().toISOString();
  if(!Number.isInteger(baseId)||!Number.isInteger(equipmentTypeId)||!Number.isInteger(quantity)||quantity<=0){
    throw new HttpError(400,'Valid baseId, equipmentTypeId and positive integer quantity are required');
  }
  const row=await withTransaction(async(client)=>{
    const {rows}=await client.query(
      `INSERT INTO inventory_ledger(base_id,equipment_type_id,event_type,quantity_delta,occurred_at,created_by)
       VALUES($1,$2,'OPENING_BALANCE',$3,$4,$5) RETURNING *`,
      [baseId,equipmentTypeId,quantity,occurredAt,req.user.id]
    );
    await writeAudit(client,req,{action:'OPENING_BALANCE_CREATED',entityType:'inventory_ledger',entityId:rows[0].id,baseId,details:{equipmentTypeId,quantity,occurredAt}});
    return rows[0];
  });
  res.status(201).json(row);
}));
export default router;
