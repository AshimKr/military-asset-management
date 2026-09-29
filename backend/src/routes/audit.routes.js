import express from 'express';
import { pool } from '../config/db.js';
import { authenticate, allowRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

const router=express.Router();
router.use(authenticate,allowRoles('ADMIN'));
router.get('/',asyncHandler(async(req,res)=>{
  const limit=Math.min(Math.max(Number(req.query.limit)||100,1),500);
  const {rows}=await pool.query(
    `SELECT a.id,a.action,a.entity_type AS "entityType",a.entity_id AS "entityId",a.base_id AS "baseId",
            a.request_id AS "requestId",a.details,a.created_at AS "createdAt",u.name AS "userName",u.email AS "userEmail"
     FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id
     ORDER BY a.created_at DESC LIMIT $1`,[limit]
  );
  res.json(rows);
}));
export default router;
