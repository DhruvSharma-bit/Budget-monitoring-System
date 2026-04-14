const { z } = require("zod");
const db = require("../config/db");
const { getSchemaMap, quoteIdent } = require("../db/schema");
const { calculateEventMetrics } = require("../utils/eventMetrics");
const { createHttpError } = require("../utils/httpError");
const { logAudit } = require("../utils/auditLog");

const eventCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  eventDate: z.coerce.date(),
  initialFunding: z.coerce.number().min(0).default(0),
});

const eventUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    eventDate: z.coerce.date().optional(),
  })
  .refine(
    (payload) => payload.name !== undefined || payload.eventDate !== undefined,
    {
      message: "At least one field is required: name or eventDate",
    },
  );

const fundingSourceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  amount: z.coerce.number().min(0),
});

const fundingAppendSchema = z.object({
  amount: z.coerce.number().positive(),
});

const categoryPaidEntrySchema = z.object({
  amount: z.coerce.number().positive(),
});

const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  allocated: z.coerce.number().min(0),
  paid: z.coerce.number().min(0).default(0),
});

const closeEventSchema = z.object({
  closingNote: z.string().trim().max(500).optional(),
});

const toNumber = (value) => Number(value || 0);

const toDateString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

const toDateTimeWithSeconds = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    const pad = (part) => String(part).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }

  const raw = String(value).trim();
  if (!raw) return null;
  if (raw.includes("T")) {
    return raw.replace("T", " ").slice(0, 19);
  }

  return raw.slice(0, 19);
};

const normalizeFundingSource = (row, schema) => ({
  id: String(row[schema.funding.idColumn]),
  name: row[schema.funding.nameColumn],
  amount: toNumber(row[schema.funding.amountColumn]),
  createdAt: schema.funding.createdAtColumn
    ? toDateTimeWithSeconds(row[schema.funding.createdAtColumn])
    : null,
});

const normalizeFundingAppendEntry = (row) => ({
  id: String(row.append_id),
  amount: toNumber(row.amount),
  action: String(row.action || "APPEND").toUpperCase(),
  newAmount: row.new_amount == null ? null : toNumber(row.new_amount),
  createdAt: toDateTimeWithSeconds(row.created_at),
});

const normalizeCategoryPaidEntry = (row) => ({
  id: String(row.entry_id),
  amount: toNumber(row.amount),
  action: String(row.action || "APPEND").toUpperCase(),
  newPaid: row.new_paid == null ? null : toNumber(row.new_paid),
  createdAt: toDateTimeWithSeconds(row.created_at),
});

const normalizeLifecycleStatus = (value) => {
  const rawStatus = String(value || "")
    .trim()
    .toUpperCase();
  if (!rawStatus || rawStatus === "DRAFT") return "ACTIVE";
  return rawStatus;
};

const normalizeCategory = (row, schema) => {
  const allocated = toNumber(row[schema.categories.amountColumn]);
  const paid = schema.categories.paidColumn
    ? toNumber(row[schema.categories.paidColumn])
    : 0;

  return {
    id: String(row[schema.categories.idColumn]),
    name: row[schema.categories.nameColumn],
    allocated,
    paid,
    createdAt: schema.categories.createdAtColumn
      ? toDateTimeWithSeconds(row[schema.categories.createdAtColumn])
      : null,
  };
};

const buildEventPayload = (
  eventRow,
  fundingRows,
  categoryRows,
  schema,
  fundingAppendEntriesBySourceId = new Map(),
  categoryPaidEntriesByCategoryId = new Map(),
) => {
  const eventId = String(eventRow[schema.events.idColumn]);
  const initialAllocation = schema.events.initialAllocationColumn
    ? toNumber(eventRow[schema.events.initialAllocationColumn])
    : 0;

  const dynamicFundingSources = fundingRows.map((row) => {
    const normalized = normalizeFundingSource(row, schema);
    const sourceId = String(row[schema.funding.idColumn]);
    return {
      ...normalized,
      appendEntries: fundingAppendEntriesBySourceId.get(sourceId) || [],
    };
  });
  const fundingSources =
    initialAllocation > 0
      ? [
          {
            id: `init-${eventId}`,
            name: "Initial Allocation",
            amount: initialAllocation,
            appendEntries: [],
          },
          ...dynamicFundingSources,
        ]
      : dynamicFundingSources;

  const categories = categoryRows.map((row) => {
    const normalized = normalizeCategory(row, schema);
    const categoryId = String(row[schema.categories.idColumn]);
    return {
      ...normalized,
      paidEntries: categoryPaidEntriesByCategoryId.get(categoryId) || [],
    };
  });
  const lifecycleStatus = normalizeLifecycleStatus(
    schema.events.statusColumn ? eventRow[schema.events.statusColumn] : null,
  );

  const baseEvent = {
    id: eventId,
    name: eventRow[schema.events.nameColumn],
    date: toDateString(eventRow[schema.events.dateColumn]),
    status: lifecycleStatus,
    lifecycleStatus,
    closedAt: schema.events.closedAtColumn
      ? eventRow[schema.events.closedAtColumn]
      : null,
    closedBy: schema.events.closedByColumn
      ? eventRow[schema.events.closedByColumn]
      : null,
    closingNote: schema.events.closingNoteColumn
      ? eventRow[schema.events.closingNoteColumn]
      : null,
    fundingSources,
    categories,
  };

  return {
    ...baseEvent,
    metrics: calculateEventMetrics(baseEvent),
  };
};

const fetchEventRowsByIds = async (eventIds, schema) => {
  if (eventIds.length === 0) {
    return [];
  }

  const fundingQuery = `
    SELECT *
    FROM ${quoteIdent(schema.funding.table)}
    WHERE ${quoteIdent(schema.funding.eventColumn)}::text = ANY($1::text[])
    ORDER BY ${quoteIdent(schema.funding.idColumn)} ASC
  `;
  const categoriesQuery = `
    SELECT *
    FROM ${quoteIdent(schema.categories.table)}
    WHERE ${quoteIdent(schema.categories.eventColumn)}::text = ANY($1::text[])
    ORDER BY ${quoteIdent(schema.categories.idColumn)} ASC
  `;

  const [fundingResult, categoriesResult] = await Promise.all([
    db.query(fundingQuery, [eventIds]),
    db.query(categoriesQuery, [eventIds]),
  ]);

  const fundingRows = fundingResult.rows;
  const fundingSourceIds = fundingRows.map((row) =>
    String(row[schema.funding.idColumn]),
  );

  let fundingAppendEntriesBySourceId = new Map();
  if (fundingSourceIds.length > 0) {
    const appendResult = await db.query(
      `
      SELECT "append_id", "source_id", "amount", "action", "new_amount", "created_at"
      FROM "funding_source_appends"
      WHERE "source_id"::text = ANY($1::text[])
      ORDER BY "created_at" DESC, "append_id" DESC
      `,
      [fundingSourceIds],
    );

    fundingAppendEntriesBySourceId = appendResult.rows.reduce((map, row) => {
      const key = String(row.source_id);
      const current = map.get(key) || [];
      current.push(normalizeFundingAppendEntry(row));
      map.set(key, current);
      return map;
    }, new Map());
  }

  const categoryRows = categoriesResult.rows;
  const categoryIds = categoryRows.map((row) =>
    String(row[schema.categories.idColumn]),
  );

  let categoryPaidEntriesByCategoryId = new Map();
  if (categoryIds.length > 0) {
    const paidEntryResult = await db.query(
      `
      SELECT "entry_id", "category_id", "amount", "action", "new_paid", "created_at"
      FROM "category_paid_entries"
      WHERE "category_id"::text = ANY($1::text[])
      ORDER BY "created_at" DESC, "entry_id" DESC
      `,
      [categoryIds],
    );

    categoryPaidEntriesByCategoryId = paidEntryResult.rows.reduce(
      (map, row) => {
        const key = String(row.category_id);
        const current = map.get(key) || [];
        current.push(normalizeCategoryPaidEntry(row));
        map.set(key, current);
        return map;
      },
      new Map(),
    );
  }

  const fundingByEventId = new Map();
  fundingRows.forEach((row) => {
    const key = String(row[schema.funding.eventColumn]);
    if (!fundingByEventId.has(key)) fundingByEventId.set(key, []);
    fundingByEventId.get(key).push(row);
  });

  const categoriesByEventId = new Map();
  categoryRows.forEach((row) => {
    const key = String(row[schema.categories.eventColumn]);
    if (!categoriesByEventId.has(key)) categoriesByEventId.set(key, []);
    categoriesByEventId.get(key).push(row);
  });

  return {
    fundingByEventId,
    categoriesByEventId,
    fundingAppendEntriesBySourceId,
    categoryPaidEntriesByCategoryId,
  };
};

const fetchAllEventsWithDetails = async (schema) => {
  const eventsQuery = `
    SELECT *
    FROM ${quoteIdent(schema.events.table)}
    ORDER BY ${quoteIdent(schema.events.dateColumn)} DESC, ${quoteIdent(schema.events.idColumn)} DESC
  `;
  const eventsResult = await db.query(eventsQuery);
  const eventRows = eventsResult.rows;
  const eventIds = eventRows.map((row) => String(row[schema.events.idColumn]));
  const childRows = await fetchEventRowsByIds(eventIds, schema);

  return eventRows.map((row) => {
    const eventId = String(row[schema.events.idColumn]);
    return buildEventPayload(
      row,
      childRows.fundingByEventId.get(eventId) || [],
      childRows.categoriesByEventId.get(eventId) || [],
      schema,
      childRows.fundingAppendEntriesBySourceId,
      childRows.categoryPaidEntriesByCategoryId,
    );
  });
};

const fetchEventRowById = async (eventId, schema) => {
  const eventQuery = `
    SELECT *
    FROM ${quoteIdent(schema.events.table)}
    WHERE ${quoteIdent(schema.events.idColumn)}::text = $1
    LIMIT 1
  `;
  const eventResult = await db.query(eventQuery, [String(eventId)]);
  const eventRow = eventResult.rows[0];

  if (!eventRow) {
    throw createHttpError(404, "Event not found");
  }

  return eventRow;
};

const assertEventIsEditable = (eventRow, schema) => {
  const lifecycleStatus = normalizeLifecycleStatus(
    schema.events.statusColumn ? eventRow[schema.events.statusColumn] : null,
  );

  if (lifecycleStatus === "CLOSED") {
    throw createHttpError(403, "This event is CLOSED and cannot be modified");
  }
};

const fetchEventById = async (eventId, schema) => {
  const eventRow = await fetchEventRowById(eventId, schema);
  const childRows = await fetchEventRowsByIds([String(eventId)], schema);
  return buildEventPayload(
    eventRow,
    childRows.fundingByEventId.get(String(eventId)) || [],
    childRows.categoriesByEventId.get(String(eventId)) || [],
    schema,
    childRows.fundingAppendEntriesBySourceId,
    childRows.categoryPaidEntriesByCategoryId,
  );
};

async function listEvents(req, res) {
  const schema = await getSchemaMap();
  const events = await fetchAllEventsWithDetails(schema);
  return res.json({
    success: true,
    data: events,
  });
}

async function getEvent(req, res) {
  const schema = await getSchemaMap();
  const event = await fetchEventById(req.params.eventId, schema);
  return res.json({
    success: true,
    data: event,
  });
}

async function createEvent(req, res) {
  const payload = eventCreateSchema.parse(req.body);
  const schema = await getSchemaMap();

  const columns = [schema.events.nameColumn, schema.events.dateColumn];
  const values = [payload.name, payload.eventDate];

  if (schema.events.initialAllocationColumn) {
    columns.push(schema.events.initialAllocationColumn);
    values.push(payload.initialFunding);
  }

  if (schema.events.statusColumn) {
    columns.push(schema.events.statusColumn);
    values.push("ACTIVE");
  }

  const insertQuery = `
    INSERT INTO ${quoteIdent(schema.events.table)} (${columns.map(quoteIdent).join(", ")})
    VALUES (${values.map((_, index) => `$${index + 1}`).join(", ")})
    RETURNING *
  `;

  const insertResult = await db.query(insertQuery, values);
  const createdId = String(insertResult.rows[0][schema.events.idColumn]);
  const event = await fetchEventById(createdId, schema);
  await logAudit({
    req,
    action: "CREATE",
    entityType: "event",
    entityId: createdId,
    eventId: createdId,
    details: {
      payload,
      metrics: event.metrics,
    },
  });

  return res.status(201).json({
    success: true,
    message: "Event created",
    data: event,
  });
}

async function updateEvent(req, res) {
  const payload = eventUpdateSchema.parse(req.body);
  const schema = await getSchemaMap();
  const eventRow = await fetchEventRowById(req.params.eventId, schema);
  assertEventIsEditable(eventRow, schema);
  const updates = [];
  const values = [];

  if (payload.name !== undefined) {
    updates.push(
      `${quoteIdent(schema.events.nameColumn)} = $${values.length + 1}`,
    );
    values.push(payload.name);
  }
  if (payload.eventDate !== undefined) {
    updates.push(
      `${quoteIdent(schema.events.dateColumn)} = $${values.length + 1}`,
    );
    values.push(payload.eventDate);
  }

  if (updates.length === 0) {
    throw createHttpError(400, "No valid fields to update");
  }

  values.push(String(req.params.eventId));
  const updateQuery = `
    UPDATE ${quoteIdent(schema.events.table)}
    SET ${updates.join(", ")}
    WHERE ${quoteIdent(schema.events.idColumn)}::text = $${values.length}
    RETURNING *
  `;

  const updateResult = await db.query(updateQuery, values);
  if (updateResult.rowCount === 0) {
    throw createHttpError(404, "Event not found");
  }

  const event = await fetchEventById(req.params.eventId, schema);
  await logAudit({
    req,
    action: "UPDATE",
    entityType: "event",
    entityId: req.params.eventId,
    eventId: req.params.eventId,
    details: {
      before: {
        name: eventRow[schema.events.nameColumn],
        date: eventRow[schema.events.dateColumn],
      },
      after: {
        name: event.name,
        date: event.date,
      },
    },
  });
  return res.json({
    success: true,
    message: "Event updated",
    data: event,
  });
}

async function createFundingSource(req, res) {
  const payload = fundingSourceSchema.parse(req.body);
  const schema = await getSchemaMap();

  const eventRow = await fetchEventRowById(req.params.eventId, schema);
  assertEventIsEditable(eventRow, schema);

  const columns = [
    schema.funding.nameColumn,
    schema.funding.amountColumn,
    schema.funding.eventColumn,
  ];
  const values = [payload.name, payload.amount, String(req.params.eventId)];

  if (schema.funding.lastEditedByColumn && req.user?.sub) {
    columns.push(schema.funding.lastEditedByColumn);
    values.push(req.user.sub);
  }

  const insertQuery = `
    INSERT INTO ${quoteIdent(schema.funding.table)} (${columns.map(quoteIdent).join(", ")})
    VALUES (${values.map((_, index) => `$${index + 1}`).join(", ")})
    RETURNING *
  `;
  const insertResult = await db.query(insertQuery, values);

  const event = await fetchEventById(req.params.eventId, schema);
  const inserted = insertResult.rows[0];
  await logAudit({
    req,
    action: "CREATE",
    entityType: "funding_source",
    entityId: inserted ? String(inserted[schema.funding.idColumn]) : null,
    eventId: req.params.eventId,
    details: {
      name: payload.name,
      amount: payload.amount,
    },
  });
  return res.status(201).json({
    success: true,
    message: "Funding source added",
    data: event,
  });
}

async function updateFundingSource(req, res) {
  const payload = fundingSourceSchema.parse(req.body);
  const schema = await getSchemaMap();
  const eventRow = await fetchEventRowById(req.params.eventId, schema);
  assertEventIsEditable(eventRow, schema);

  const sourceQuery = `
    SELECT *
    FROM ${quoteIdent(schema.funding.table)}
    WHERE ${quoteIdent(schema.funding.idColumn)}::text = $1
      AND ${quoteIdent(schema.funding.eventColumn)}::text = $2
    LIMIT 1
  `;

  const sourceResult = await db.query(sourceQuery, [
    String(req.params.sourceId),
    String(req.params.eventId),
  ]);
  const sourceRow = sourceResult.rows[0];
  if (!sourceRow) {
    throw createHttpError(404, "Funding source not found for this event");
  }

  const sourceId = String(sourceRow[schema.funding.idColumn]);
  const previousAmount = toNumber(sourceRow[schema.funding.amountColumn]);
  const nextAmount = toNumber(payload.amount);
  const amountDelta = nextAmount - previousAmount;

  const updates = [
    `${quoteIdent(schema.funding.nameColumn)} = $1`,
    `${quoteIdent(schema.funding.amountColumn)} = $2`,
  ];
  const values = [payload.name, payload.amount];

  if (schema.funding.lastEditedByColumn && req.user?.sub) {
    updates.push(`${quoteIdent(schema.funding.lastEditedByColumn)} = $3`);
    values.push(req.user.sub);
  }

  values.push(String(req.params.sourceId));
  values.push(String(req.params.eventId));

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    const updateQuery = `
      UPDATE ${quoteIdent(schema.funding.table)}
      SET ${updates.join(", ")}
      WHERE ${quoteIdent(schema.funding.idColumn)}::text = $${values.length - 1}
        AND ${quoteIdent(schema.funding.eventColumn)}::text = $${values.length}
      RETURNING *
    `;
    const result = await client.query(updateQuery, values);
    if (result.rowCount === 0) {
      throw createHttpError(404, "Funding source not found for this event");
    }

    if (amountDelta !== 0) {
      await client.query(
        `
        INSERT INTO "funding_source_appends"
          ("source_id", "event_id", "amount", "action", "new_amount", "appended_by")
        VALUES ($1::bigint, $2::bigint, $3, 'EDIT', $4, $5)
        `,
        [
          sourceId,
          String(req.params.eventId),
          amountDelta,
          nextAmount,
          req.user?.sub || null,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const event = await fetchEventById(req.params.eventId, schema);
  await logAudit({
    req,
    action: "UPDATE",
    entityType: "funding_source",
    entityId: req.params.sourceId,
    eventId: req.params.eventId,
    details: {
      name: payload.name,
      previousAmount,
      amount: payload.amount,
      amountDelta,
    },
  });
  return res.json({
    success: true,
    message: "Funding source updated",
    data: event,
  });
}

async function deleteFundingSource(req, res) {
  const schema = await getSchemaMap();
  const eventRow = await fetchEventRowById(req.params.eventId, schema);
  assertEventIsEditable(eventRow, schema);
  const deleteQuery = `
    DELETE FROM ${quoteIdent(schema.funding.table)}
    WHERE ${quoteIdent(schema.funding.idColumn)}::text = $1
      AND ${quoteIdent(schema.funding.eventColumn)}::text = $2
    RETURNING *
  `;

  const result = await db.query(deleteQuery, [
    String(req.params.sourceId),
    String(req.params.eventId),
  ]);
  if (result.rowCount === 0) {
    throw createHttpError(404, "Funding source not found for this event");
  }

  const event = await fetchEventById(req.params.eventId, schema);
  await logAudit({
    req,
    action: "DELETE",
    entityType: "funding_source",
    entityId: req.params.sourceId,
    eventId: req.params.eventId,
    details: {
      removed: result.rows[0] || null,
    },
  });
  return res.json({
    success: true,
    message: "Funding source removed",
    data: event,
  });
}

async function appendFundingSource(req, res) {
  const payload = fundingAppendSchema.parse(req.body);
  const schema = await getSchemaMap();
  const eventRow = await fetchEventRowById(req.params.eventId, schema);
  assertEventIsEditable(eventRow, schema);

  const sourceQuery = `
    SELECT *
    FROM ${quoteIdent(schema.funding.table)}
    WHERE ${quoteIdent(schema.funding.idColumn)}::text = $1
      AND ${quoteIdent(schema.funding.eventColumn)}::text = $2
    LIMIT 1
  `;

  const sourceResult = await db.query(sourceQuery, [
    String(req.params.sourceId),
    String(req.params.eventId),
  ]);
  const sourceRow = sourceResult.rows[0];
  if (!sourceRow) {
    throw createHttpError(404, "Funding source not found for this event");
  }

  const sourceId = String(sourceRow[schema.funding.idColumn]);
  const previousAmount = toNumber(sourceRow[schema.funding.amountColumn]);
  const nextAmount = previousAmount + payload.amount;

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    const values = [nextAmount];
    const updates = [`${quoteIdent(schema.funding.amountColumn)} = $1`];
    if (schema.funding.lastEditedByColumn && req.user?.sub) {
      updates.push(
        `${quoteIdent(schema.funding.lastEditedByColumn)} = $${values.length + 1}`,
      );
      values.push(req.user.sub);
    }
    values.push(sourceId);
    values.push(String(req.params.eventId));

    await client.query(
      `
      UPDATE ${quoteIdent(schema.funding.table)}
      SET ${updates.join(", ")}
      WHERE ${quoteIdent(schema.funding.idColumn)}::text = $${values.length - 1}
        AND ${quoteIdent(schema.funding.eventColumn)}::text = $${values.length}
      `,
      values,
    );

    await client.query(
      `
      INSERT INTO "funding_source_appends"
        ("source_id", "event_id", "amount", "action", "new_amount", "appended_by")
      VALUES ($1::bigint, $2::bigint, $3, 'APPEND', $4, $5)
      `,
      [
        sourceId,
        String(req.params.eventId),
        payload.amount,
        nextAmount,
        req.user?.sub || null,
      ],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const event = await fetchEventById(req.params.eventId, schema);
  await logAudit({
    req,
    action: "APPEND",
    entityType: "funding_source",
    entityId: sourceId,
    eventId: req.params.eventId,
    details: {
      appendAmount: payload.amount,
      previousAmount,
      newAmount: nextAmount,
    },
  });

  return res.json({
    success: true,
    message: "Funding source amount appended",
    data: event,
  });
}

async function createCategory(req, res) {
  const payload = categorySchema.parse(req.body);
  const schema = await getSchemaMap();
  const eventRow = await fetchEventRowById(req.params.eventId, schema);
  assertEventIsEditable(eventRow, schema);

  if (!schema.categories.paidColumn) {
    throw createHttpError(
      500,
      "categories.paid column is missing. Add a paid column so paid updates can be stored.",
    );
  }

  const columns = [schema.categories.nameColumn, schema.categories.eventColumn];
  const values = [payload.name, String(req.params.eventId)];

  columns.push(schema.categories.amountColumn);
  values.push(payload.allocated);

  if (schema.categories.paidColumn) {
    columns.push(schema.categories.paidColumn);
    values.push(payload.paid);
  }

  if (schema.categories.lastEditedByColumn && req.user?.sub) {
    columns.push(schema.categories.lastEditedByColumn);
    values.push(req.user.sub);
  }

  const insertQuery = `
    INSERT INTO ${quoteIdent(schema.categories.table)} (${columns.map(quoteIdent).join(", ")})
    VALUES (${values.map((_, index) => `$${index + 1}`).join(", ")})
    RETURNING *
  `;
  const insertResult = await db.query(insertQuery, values);

  const inserted = insertResult.rows[0];
  const insertedCategoryId = inserted
    ? String(inserted[schema.categories.idColumn])
    : null;

  if (insertedCategoryId && Number(payload.paid || 0) > 0) {
    await db.query(
      `
      INSERT INTO "category_paid_entries"
        ("category_id", "event_id", "amount", "action", "new_paid", "recorded_by")
      VALUES ($1::bigint, $2::bigint, $3, 'APPEND', $4, $5)
      `,
      [
        insertedCategoryId,
        String(req.params.eventId),
        Number(payload.paid || 0),
        Number(payload.paid || 0),
        req.user?.sub || null,
      ],
    );
  }

  const event = await fetchEventById(req.params.eventId, schema);
  await logAudit({
    req,
    action: "CREATE",
    entityType: "category",
    entityId: inserted ? String(inserted[schema.categories.idColumn]) : null,
    eventId: req.params.eventId,
    details: {
      name: payload.name,
      allocated: payload.allocated,
      paid: payload.paid,
    },
  });
  return res.status(201).json({
    success: true,
    message: "Category added",
    data: event,
  });
}

async function updateCategory(req, res) {
  const payload = categorySchema.parse(req.body);
  const schema = await getSchemaMap();
  const eventRow = await fetchEventRowById(req.params.eventId, schema);
  assertEventIsEditable(eventRow, schema);

  if (!schema.categories.paidColumn) {
    throw createHttpError(
      500,
      "categories.paid column is missing. Add a paid column so paid updates can be stored.",
    );
  }

  const categoryQuery = `
    SELECT *
    FROM ${quoteIdent(schema.categories.table)}
    WHERE ${quoteIdent(schema.categories.idColumn)}::text = $1
      AND ${quoteIdent(schema.categories.eventColumn)}::text = $2
    LIMIT 1
  `;

  const categoryResult = await db.query(categoryQuery, [
    String(req.params.categoryId),
    String(req.params.eventId),
  ]);
  const categoryRow = categoryResult.rows[0];
  if (!categoryRow) {
    throw createHttpError(404, "Category not found for this event");
  }

  const categoryId = String(categoryRow[schema.categories.idColumn]);
  const previousPaid = toNumber(categoryRow[schema.categories.paidColumn]);
  const nextPaid = toNumber(payload.paid);
  const paidDelta = nextPaid - previousPaid;

  const updates = [
    `${quoteIdent(schema.categories.nameColumn)} = $1`,
    `${quoteIdent(schema.categories.amountColumn)} = $2`,
  ];
  const values = [payload.name, payload.allocated];

  if (schema.categories.paidColumn) {
    updates.push(
      `${quoteIdent(schema.categories.paidColumn)} = $${values.length + 1}`,
    );
    values.push(payload.paid);
  }
  if (schema.categories.lastEditedByColumn && req.user?.sub) {
    updates.push(
      `${quoteIdent(schema.categories.lastEditedByColumn)} = $${values.length + 1}`,
    );
    values.push(req.user.sub);
  }

  values.push(String(req.params.categoryId));
  values.push(String(req.params.eventId));

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    const updateQuery = `
      UPDATE ${quoteIdent(schema.categories.table)}
      SET ${updates.join(", ")}
      WHERE ${quoteIdent(schema.categories.idColumn)}::text = $${values.length - 1}
        AND ${quoteIdent(schema.categories.eventColumn)}::text = $${values.length}
      RETURNING *
    `;
    const result = await client.query(updateQuery, values);
    if (result.rowCount === 0) {
      throw createHttpError(404, "Category not found for this event");
    }

    if (paidDelta !== 0) {
      await client.query(
        `
        INSERT INTO "category_paid_entries"
          ("category_id", "event_id", "amount", "action", "new_paid", "recorded_by")
        VALUES ($1::bigint, $2::bigint, $3, 'EDIT', $4, $5)
        `,
        [
          categoryId,
          String(req.params.eventId),
          paidDelta,
          nextPaid,
          req.user?.sub || null,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const event = await fetchEventById(req.params.eventId, schema);
  await logAudit({
    req,
    action: "UPDATE",
    entityType: "category",
    entityId: req.params.categoryId,
    eventId: req.params.eventId,
    details: {
      name: payload.name,
      allocated: payload.allocated,
      paid: payload.paid,
      paidDelta,
    },
  });
  return res.json({
    success: true,
    message: "Category updated",
    data: event,
  });
}

async function addCategoryPaidEntry(req, res) {
  const payload = categoryPaidEntrySchema.parse(req.body);
  const schema = await getSchemaMap();
  const eventRow = await fetchEventRowById(req.params.eventId, schema);
  assertEventIsEditable(eventRow, schema);

  if (!schema.categories.paidColumn) {
    throw createHttpError(
      500,
      "categories.paid column is missing. Add a paid column so paid updates can be stored.",
    );
  }

  const categoryQuery = `
    SELECT *
    FROM ${quoteIdent(schema.categories.table)}
    WHERE ${quoteIdent(schema.categories.idColumn)}::text = $1
      AND ${quoteIdent(schema.categories.eventColumn)}::text = $2
    LIMIT 1
  `;

  const categoryResult = await db.query(categoryQuery, [
    String(req.params.categoryId),
    String(req.params.eventId),
  ]);
  const categoryRow = categoryResult.rows[0];
  if (!categoryRow) {
    throw createHttpError(404, "Category not found for this event");
  }

  const categoryId = String(categoryRow[schema.categories.idColumn]);
  const previousPaid = toNumber(categoryRow[schema.categories.paidColumn]);
  const nextPaid = previousPaid + payload.amount;

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    const values = [nextPaid];
    const updates = [`${quoteIdent(schema.categories.paidColumn)} = $1`];
    if (schema.categories.lastEditedByColumn && req.user?.sub) {
      updates.push(
        `${quoteIdent(schema.categories.lastEditedByColumn)} = $${values.length + 1}`,
      );
      values.push(req.user.sub);
    }
    values.push(categoryId);
    values.push(String(req.params.eventId));

    await client.query(
      `
      UPDATE ${quoteIdent(schema.categories.table)}
      SET ${updates.join(", ")}
      WHERE ${quoteIdent(schema.categories.idColumn)}::text = $${values.length - 1}
        AND ${quoteIdent(schema.categories.eventColumn)}::text = $${values.length}
      `,
      values,
    );

    await client.query(
      `
      INSERT INTO "category_paid_entries"
        ("category_id", "event_id", "amount", "action", "new_paid", "recorded_by")
      VALUES ($1::bigint, $2::bigint, $3, 'APPEND', $4, $5)
      `,
      [
        categoryId,
        String(req.params.eventId),
        payload.amount,
        nextPaid,
        req.user?.sub || null,
      ],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const event = await fetchEventById(req.params.eventId, schema);
  await logAudit({
    req,
    action: "APPEND_PAID",
    entityType: "category",
    entityId: categoryId,
    eventId: req.params.eventId,
    details: {
      appendPaid: payload.amount,
      previousPaid,
      newPaid: nextPaid,
    },
  });

  return res.json({
    success: true,
    message: "Category paid amount appended",
    data: event,
  });
}

async function deleteCategory(req, res) {
  const schema = await getSchemaMap();
  const eventRow = await fetchEventRowById(req.params.eventId, schema);
  assertEventIsEditable(eventRow, schema);
  const deleteQuery = `
    DELETE FROM ${quoteIdent(schema.categories.table)}
    WHERE ${quoteIdent(schema.categories.idColumn)}::text = $1
      AND ${quoteIdent(schema.categories.eventColumn)}::text = $2
    RETURNING *
  `;

  const result = await db.query(deleteQuery, [
    String(req.params.categoryId),
    String(req.params.eventId),
  ]);
  if (result.rowCount === 0) {
    throw createHttpError(404, "Category not found for this event");
  }

  const event = await fetchEventById(req.params.eventId, schema);
  await logAudit({
    req,
    action: "DELETE",
    entityType: "category",
    entityId: req.params.categoryId,
    eventId: req.params.eventId,
    details: {
      removed: result.rows[0] || null,
    },
  });
  return res.json({
    success: true,
    message: "Category removed",
    data: event,
  });
}

async function closeEvent(req, res) {
  const payload = closeEventSchema.parse(req.body || {});
  const schema = await getSchemaMap();
  const eventRow = await fetchEventRowById(req.params.eventId, schema);
  const currentStatus = normalizeLifecycleStatus(
    schema.events.statusColumn ? eventRow[schema.events.statusColumn] : null,
  );

  if (currentStatus === "CLOSED") {
    throw createHttpError(400, "Event is already CLOSED");
  }

  if (!schema.events.statusColumn) {
    throw createHttpError(
      400,
      "events.status column is required to close an event",
    );
  }

  const currentEvent = await fetchEventById(req.params.eventId, schema);
  const hasPending = Number(currentEvent.metrics.pending || 0) > 0;
  const updates = [`${quoteIdent(schema.events.statusColumn)} = $1`];
  const values = ["CLOSED"];

  if (schema.events.closedAtColumn) {
    updates.push(
      `${quoteIdent(schema.events.closedAtColumn)} = $${values.length + 1}`,
    );
    values.push(new Date());
  }
  if (schema.events.closedByColumn) {
    updates.push(
      `${quoteIdent(schema.events.closedByColumn)} = $${values.length + 1}`,
    );
    values.push(req.user?.sub || null);
  }
  if (schema.events.closingNoteColumn) {
    updates.push(
      `${quoteIdent(schema.events.closingNoteColumn)} = $${values.length + 1}`,
    );
    values.push(payload.closingNote || null);
  }

  values.push(String(req.params.eventId));
  const updateQuery = `
    UPDATE ${quoteIdent(schema.events.table)}
    SET ${updates.join(", ")}
    WHERE ${quoteIdent(schema.events.idColumn)}::text = $${values.length}
    RETURNING *
  `;
  const result = await db.query(updateQuery, values);
  if (result.rowCount === 0) {
    throw createHttpError(404, "Event not found");
  }

  const event = await fetchEventById(req.params.eventId, schema);
  const warning = hasPending
    ? {
        code: "EVENT_CLOSED_WITH_PENDING",
        message: `Event closed with pending amount ${event.metrics.pending}.`,
      }
    : null;

  await logAudit({
    req,
    action: "CLOSE",
    entityType: "event",
    entityId: req.params.eventId,
    eventId: req.params.eventId,
    details: {
      closingNote: payload.closingNote || null,
      pending: event.metrics.pending,
      warning,
    },
  });

  return res.json({
    success: true,
    message: warning
      ? "Event closed with pending amount warning"
      : "Event closed successfully",
    warning,
    data: event,
  });
}

async function reopenEvent(req, res) {
  const schema = await getSchemaMap();
  const eventRow = await fetchEventRowById(req.params.eventId, schema);

  if (!schema.events.statusColumn) {
    throw createHttpError(
      400,
      "events.status column is required to reopen an event",
    );
  }

  const currentStatus = normalizeLifecycleStatus(
    schema.events.statusColumn ? eventRow[schema.events.statusColumn] : null,
  );
  if (currentStatus !== "CLOSED") {
    throw createHttpError(400, "Only CLOSED events can be reopened");
  }

  const updates = [`${quoteIdent(schema.events.statusColumn)} = $1`];
  const values = ["ACTIVE"];

  if (schema.events.closedAtColumn) {
    updates.push(
      `${quoteIdent(schema.events.closedAtColumn)} = $${values.length + 1}`,
    );
    values.push(null);
  }
  if (schema.events.closedByColumn) {
    updates.push(
      `${quoteIdent(schema.events.closedByColumn)} = $${values.length + 1}`,
    );
    values.push(null);
  }
  if (schema.events.closingNoteColumn) {
    updates.push(
      `${quoteIdent(schema.events.closingNoteColumn)} = $${values.length + 1}`,
    );
    values.push(null);
  }

  values.push(String(req.params.eventId));
  const updateQuery = `
    UPDATE ${quoteIdent(schema.events.table)}
    SET ${updates.join(", ")}
    WHERE ${quoteIdent(schema.events.idColumn)}::text = $${values.length}
    RETURNING *
  `;
  const result = await db.query(updateQuery, values);
  if (result.rowCount === 0) {
    throw createHttpError(404, "Event not found");
  }

  const event = await fetchEventById(req.params.eventId, schema);
  await logAudit({
    req,
    action: "REOPEN",
    entityType: "event",
    entityId: req.params.eventId,
    eventId: req.params.eventId,
    details: {},
  });
  return res.json({
    success: true,
    message: "Event reopened successfully",
    data: event,
  });
}

module.exports = {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  closeEvent,
  reopenEvent,
  createFundingSource,
  updateFundingSource,
  appendFundingSource,
  deleteFundingSource,
  createCategory,
  updateCategory,
  addCategoryPaidEntry,
  deleteCategory,
};
