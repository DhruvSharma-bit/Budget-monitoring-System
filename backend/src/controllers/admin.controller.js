const { z } = require('zod')
const db = require('../config/db')

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  eventId: z.string().trim().optional(),
  action: z.string().trim().optional(),
  entityType: z.string().trim().optional(),
  userId: z.string().trim().optional(),
})

async function listAuditLogs(req, res) {
  const parsed = querySchema.parse(req.query || {})
  const offset = (parsed.page - 1) * parsed.limit

  const conditions = []
  const values = []

  if (parsed.eventId) {
    values.push(parsed.eventId)
    conditions.push(`"event_id" = $${values.length}`)
  }
  if (parsed.action) {
    values.push(parsed.action)
    conditions.push(`"action" = $${values.length}`)
  }
  if (parsed.entityType) {
    values.push(parsed.entityType)
    conditions.push(`"entity_type" = $${values.length}`)
  }
  if (parsed.userId) {
    values.push(parsed.userId)
    conditions.push(`"user_id" = $${values.length}`)
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const countQuery = `SELECT COUNT(*)::int AS total FROM "audit_logs" ${whereSql}`
  const countResult = await db.query(countQuery, values)
  const total = countResult.rows[0]?.total || 0

  const listValues = [...values, parsed.limit, offset]
  const listQuery = `
    SELECT
      "log_id"::text AS "id",
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
      "user_agent",
      "created_at"
    FROM "audit_logs"
    ${whereSql}
    ORDER BY "created_at" DESC, "log_id" DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `
  const listResult = await db.query(listQuery, listValues)

  return res.json({
    success: true,
    data: listResult.rows,
    meta: {
      page: parsed.page,
      limit: parsed.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.limit)),
    },
  })
}

module.exports = {
  listAuditLogs,
}
