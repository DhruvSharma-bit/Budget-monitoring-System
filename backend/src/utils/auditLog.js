const db = require('../config/db')

const getIpAddress = (req) => {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }
  return req.ip || null
}

async function logAudit({
  req,
  action,
  entityType,
  entityId = null,
  eventId = null,
  details = {},
}) {
  try {
    const query = `
      INSERT INTO "audit_logs"
      (
        "user_id",
        "user_role",
        "user_name",
        "user_email",
        "action",
        "entity_type",
        "entity_id",
        "event_id",
        "details",
        "ip_address",
        "user_agent"
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)
    `

    await db.query(query, [
      req.user?.sub ? String(req.user.sub) : null,
      req.user?.role ? String(req.user.role) : null,
      req.user?.name ? String(req.user.name) : null,
      req.user?.email ? String(req.user.email) : null,
      String(action),
      String(entityType),
      entityId != null ? String(entityId) : null,
      eventId != null ? String(eventId) : null,
      JSON.stringify(details || {}),
      getIpAddress(req),
      req.headers['user-agent'] ? String(req.headers['user-agent']) : null,
    ])
  } catch (error) {
    console.error('Failed to write audit log:', error.message)
  }
}

module.exports = {
  logAudit,
}
