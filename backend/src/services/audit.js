export async function writeAudit(client, req, { action, entityType, entityId = null, baseId = null, details = {} }) {
  await client.query(
    `INSERT INTO audit_logs
      (user_id, action, entity_type, entity_id, base_id, request_id, details, ip_address, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)`,
    [
      req.user?.id ?? null,
      action,
      entityType,
      entityId ? String(entityId) : null,
      baseId,
      req.requestId,
      JSON.stringify(details),
      req.ip || null,
      req.get('user-agent') || null,
    ]
  );
}
