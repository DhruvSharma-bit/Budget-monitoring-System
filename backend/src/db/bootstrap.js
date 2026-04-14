const db = require("../config/db");

const ensureColumn = async (tableName, columnName, definition) => {
  await db.query(`
    ALTER TABLE "${tableName}"
    ADD COLUMN IF NOT EXISTS "${columnName}" ${definition}
  `);
};

async function ensureDatabaseArtifacts() {
  await ensureColumn("categories", "paid", "NUMERIC(14,2) NOT NULL DEFAULT 0");
  await ensureColumn(
    "categories",
    "created_at",
    "TIMESTAMP NOT NULL DEFAULT NOW()",
  );

  await ensureColumn(
    "funding_sources",
    "created_at",
    "TIMESTAMP NOT NULL DEFAULT NOW()",
  );

  await db.query(`
    CREATE TABLE IF NOT EXISTS "funding_source_appends" (
      "append_id" BIGSERIAL PRIMARY KEY,
      "source_id" BIGINT NOT NULL,
      "event_id" BIGINT NOT NULL,
      "amount" NUMERIC(14,2) NOT NULL,
      "appended_by" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT "fk_funding_source_appends_source"
        FOREIGN KEY ("source_id") REFERENCES "funding_sources" ("funder_id") ON DELETE CASCADE,
      CONSTRAINT "fk_funding_source_appends_event"
        FOREIGN KEY ("event_id") REFERENCES "events" ("event_id") ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS "idx_funding_source_appends_source_id"
    ON "funding_source_appends" ("source_id")
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS "idx_funding_source_appends_created_at"
    ON "funding_source_appends" ("created_at" DESC)
  `);

  await ensureColumn(
    "funding_source_appends",
    "action",
    "TEXT NOT NULL DEFAULT 'APPEND'",
  );
  await ensureColumn("funding_source_appends", "new_amount", "NUMERIC(14,2)");

  await db.query(`
    CREATE TABLE IF NOT EXISTS "category_paid_entries" (
      "entry_id" BIGSERIAL PRIMARY KEY,
      "category_id" BIGINT NOT NULL,
      "event_id" BIGINT NOT NULL,
      "amount" NUMERIC(14,2) NOT NULL,
      "action" TEXT NOT NULL DEFAULT 'APPEND',
      "new_paid" NUMERIC(14,2),
      "recorded_by" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT "fk_category_paid_entries_category"
        FOREIGN KEY ("category_id") REFERENCES "categories" ("category_id") ON DELETE CASCADE,
      CONSTRAINT "fk_category_paid_entries_event"
        FOREIGN KEY ("event_id") REFERENCES "events" ("event_id") ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS "idx_category_paid_entries_category_id"
    ON "category_paid_entries" ("category_id")
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS "idx_category_paid_entries_created_at"
    ON "category_paid_entries" ("created_at" DESC)
  `);

  await ensureColumn(
    "category_paid_entries",
    "action",
    "TEXT NOT NULL DEFAULT 'APPEND'",
  );
  await ensureColumn("category_paid_entries", "new_paid", "NUMERIC(14,2)");

  await ensureColumn(
    "events",
    "status",
    "VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'",
  );
  await ensureColumn("events", "closed_at", "TIMESTAMP");
  await ensureColumn("events", "closed_by", "TEXT");
  await ensureColumn("events", "closing_note", "TEXT");

  await db.query(`
    UPDATE "events"
    SET "status" = 'ACTIVE'
    WHERE "status" IS NULL
      OR UPPER(TRIM("status")) IN ('', 'DRAFT')
  `);

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
  `);

  await ensureColumn("audit_logs", "user_name", "TEXT");
  await ensureColumn("audit_logs", "user_email", "TEXT");

  await db.query(`
    CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at"
    ON "audit_logs" ("created_at" DESC)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS "idx_audit_logs_event_id"
    ON "audit_logs" ("event_id")
  `);
}

module.exports = {
  ensureDatabaseArtifacts,
};
