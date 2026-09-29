import { HttpError } from '../utils/http.js';

export async function getAvailableStock(client, baseId, equipmentTypeId) {
  const { rows } = await client.query(
    `SELECT COALESCE(SUM(quantity_delta), 0)::int AS available
     FROM inventory_ledger
     WHERE base_id = $1 AND equipment_type_id = $2`,
    [baseId, equipmentTypeId]
  );
  return rows[0].available;
}

export async function ensureStock(client, baseId, equipmentTypeId, quantity) {
  // Transaction-scoped advisory lock prevents two concurrent issues from both
  // reading the same stock before either writes its deduction.
  const lockKey = BigInt(baseId) * 1_000_000n + BigInt(equipmentTypeId);
  await client.query('SELECT pg_advisory_xact_lock($1)', [lockKey.toString()]);
  const available = await getAvailableStock(client, baseId, equipmentTypeId);
  if (available < quantity) {
    throw new HttpError(409, `Insufficient available stock. Available: ${available}`);
  }
  return available;
}
