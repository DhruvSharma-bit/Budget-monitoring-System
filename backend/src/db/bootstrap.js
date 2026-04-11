const db = require('../config/db')

const ensureColumn = async (tableName, columnName, definition) => {
  await db.query(`
    ALTER TABLE "${tableName}"
    ADD COLUMN IF NOT EXISTS "${columnName}" ${definition}
  `)
}

async function ensureDatabaseArtifacts() {
  await ensureColumn('categories', 'paid', 'NUMERIC(14,2) NOT NULL DEFAULT 0')

  await ensureColumn('events', 'status', "VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'")
  await ensureColumn('events', 'closed_at', 'TIMESTAMP')
  await ensureColumn('events', 'closed_by', 'TEXT')
  await ensureColumn('events', 'closing_note', 'TEXT')

  await db.query(`
    UPDATE "events"
    SET "status" = 'ACTIVE'
    WHERE "status" IS NULL
      OR UPPER(TRIM("status")) IN ('', 'DRAFT')
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS "audit_logs" (
      "log_id" BIGSERIAL PRIMARY KEY,
      "user_id" TEXT,
      "user_role" TEXT,
      "user_name" TEXT,
      "user_email" TEXT,
      "action" TEXT NOT NULL,
      "entity_type" TEXT NOT NULL,
      "entity_id" TEXT,
      "event_id" TEXT,
      "details" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "ip_address" TEXT,
      "user_agent" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)

  await ensureColumn('audit_logs', 'user_name', 'TEXT')
  await ensureColumn('audit_logs', 'user_email', 'TEXT')

  await db.query(`
    CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at"
    ON "audit_logs" ("created_at" DESC)
  `)
  await db.query(`
    CREATE INDEX IF NOT EXISTS "idx_audit_logs_event_id"
    ON "audit_logs" ("event_id")
  `)
}

module.exports = {
  ensureDatabaseArtifacts,
}
