const { z } = require('zod')
const db = require('../config/db')
const { getSchemaMap, quoteIdent } = require('../db/schema')
const { calculateEventMetrics } = require('../utils/eventMetrics')
const { createHttpError } = require('../utils/httpError')

const eventCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  eventDate: z.coerce.date(),
  initialFunding: z.coerce.number().min(0).default(0),
})

const eventUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    eventDate: z.coerce.date().optional(),
  })
  .refine((payload) => payload.name !== undefined || payload.eventDate !== undefined, {
    message: 'At least one field is required: name or eventDate',
  })

const fundingSourceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  amount: z.coerce.number().min(0),
})

const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  allocated: z.coerce.number().min(0),
  paid: z.coerce.number().min(0).default(0),
})

const toNumber = (value) => Number(value || 0)

const toDateString = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

const normalizeFundingSource = (row, schema) => ({
  id: String(row[schema.funding.idColumn]),
  name: row[schema.funding.nameColumn],
  amount: toNumber(row[schema.funding.amountColumn]),
})

const normalizeCategory = (row, schema) => {
  const allocated = toNumber(row[schema.categories.amountColumn])
  const paid = schema.categories.paidColumn ? toNumber(row[schema.categories.paidColumn]) : 0

  return {
    id: String(row[schema.categories.idColumn]),
    name: row[schema.categories.nameColumn],
    allocated,
    paid,
  }
}

const buildEventPayload = (eventRow, fundingRows, categoryRows, schema) => {
  const eventId = String(eventRow[schema.events.idColumn])
  const initialAllocation = schema.events.initialAllocationColumn
    ? toNumber(eventRow[schema.events.initialAllocationColumn])
    : 0

  const dynamicFundingSources = fundingRows.map((row) => normalizeFundingSource(row, schema))
  const fundingSources =
    initialAllocation > 0
      ? [
          {
            id: `init-${eventId}`,
            name: 'Initial Allocation',
            amount: initialAllocation,
          },
          ...dynamicFundingSources,
        ]
      : dynamicFundingSources

  const categories = categoryRows.map((row) => normalizeCategory(row, schema))

  const baseEvent = {
    id: eventId,
    name: eventRow[schema.events.nameColumn],
    date: toDateString(eventRow[schema.events.dateColumn]),
    fundingSources,
    categories,
  }

  return {
    ...baseEvent,
    metrics: calculateEventMetrics(baseEvent),
  }
}

const fetchEventRowsByIds = async (eventIds, schema) => {
  if (eventIds.length === 0) {
    return []
  }

  const fundingQuery = `
    SELECT *
    FROM ${quoteIdent(schema.funding.table)}
    WHERE ${quoteIdent(schema.funding.eventColumn)}::text = ANY($1::text[])
    ORDER BY ${quoteIdent(schema.funding.idColumn)} ASC
  `
  const categoriesQuery = `
    SELECT *
    FROM ${quoteIdent(schema.categories.table)}
    WHERE ${quoteIdent(schema.categories.eventColumn)}::text = ANY($1::text[])
    ORDER BY ${quoteIdent(schema.categories.idColumn)} ASC
  `

  const [fundingResult, categoriesResult] = await Promise.all([
    db.query(fundingQuery, [eventIds]),
    db.query(categoriesQuery, [eventIds]),
  ])

  const fundingByEventId = new Map()
  fundingResult.rows.forEach((row) => {
    const key = String(row[schema.funding.eventColumn])
    if (!fundingByEventId.has(key)) fundingByEventId.set(key, [])
    fundingByEventId.get(key).push(row)
  })

  const categoriesByEventId = new Map()
  categoriesResult.rows.forEach((row) => {
    const key = String(row[schema.categories.eventColumn])
    if (!categoriesByEventId.has(key)) categoriesByEventId.set(key, [])
    categoriesByEventId.get(key).push(row)
  })

  return {
    fundingByEventId,
    categoriesByEventId,
  }
}

const fetchAllEventsWithDetails = async (schema) => {
  const eventsQuery = `
    SELECT *
    FROM ${quoteIdent(schema.events.table)}
    ORDER BY ${quoteIdent(schema.events.dateColumn)} DESC, ${quoteIdent(schema.events.idColumn)} DESC
  `
  const eventsResult = await db.query(eventsQuery)
  const eventRows = eventsResult.rows
  const eventIds = eventRows.map((row) => String(row[schema.events.idColumn]))
  const childRows = await fetchEventRowsByIds(eventIds, schema)

  return eventRows.map((row) => {
    const eventId = String(row[schema.events.idColumn])
    return buildEventPayload(
      row,
      childRows.fundingByEventId.get(eventId) || [],
      childRows.categoriesByEventId.get(eventId) || [],
      schema,
    )
  })
}

const fetchEventById = async (eventId, schema) => {
  const eventQuery = `
    SELECT *
    FROM ${quoteIdent(schema.events.table)}
    WHERE ${quoteIdent(schema.events.idColumn)}::text = $1
    LIMIT 1
  `
  const eventResult = await db.query(eventQuery, [String(eventId)])
  const eventRow = eventResult.rows[0]

  if (!eventRow) {
    throw createHttpError(404, 'Event not found')
  }

  const childRows = await fetchEventRowsByIds([String(eventId)], schema)
  return buildEventPayload(
    eventRow,
    childRows.fundingByEventId.get(String(eventId)) || [],
    childRows.categoriesByEventId.get(String(eventId)) || [],
    schema,
  )
}

async function listEvents(req, res) {
  const schema = await getSchemaMap()
  const events = await fetchAllEventsWithDetails(schema)
  return res.json({
    success: true,
    data: events,
  })
}

async function getEvent(req, res) {
  const schema = await getSchemaMap()
  const event = await fetchEventById(req.params.eventId, schema)
  return res.json({
    success: true,
    data: event,
  })
}

async function createEvent(req, res) {
  const payload = eventCreateSchema.parse(req.body)
  const schema = await getSchemaMap()

  const columns = [schema.events.nameColumn, schema.events.dateColumn]
  const values = [payload.name, payload.eventDate]

  if (schema.events.initialAllocationColumn) {
    columns.push(schema.events.initialAllocationColumn)
    values.push(payload.initialFunding)
  }

  const insertQuery = `
    INSERT INTO ${quoteIdent(schema.events.table)} (${columns.map(quoteIdent).join(', ')})
    VALUES (${values.map((_, index) => `$${index + 1}`).join(', ')})
    RETURNING *
  `

  const insertResult = await db.query(insertQuery, values)
  const createdId = String(insertResult.rows[0][schema.events.idColumn])
  const event = await fetchEventById(createdId, schema)

  return res.status(201).json({
    success: true,
    message: 'Event created',
    data: event,
  })
}

async function updateEvent(req, res) {
  const payload = eventUpdateSchema.parse(req.body)
  const schema = await getSchemaMap()
  const updates = []
  const values = []

  if (payload.name !== undefined) {
    updates.push(`${quoteIdent(schema.events.nameColumn)} = $${values.length + 1}`)
    values.push(payload.name)
  }
  if (payload.eventDate !== undefined) {
    updates.push(`${quoteIdent(schema.events.dateColumn)} = $${values.length + 1}`)
    values.push(payload.eventDate)
  }

  if (updates.length === 0) {
    throw createHttpError(400, 'No valid fields to update')
  }

  values.push(String(req.params.eventId))
  const updateQuery = `
    UPDATE ${quoteIdent(schema.events.table)}
    SET ${updates.join(', ')}
    WHERE ${quoteIdent(schema.events.idColumn)}::text = $${values.length}
    RETURNING *
  `

  const updateResult = await db.query(updateQuery, values)
  if (updateResult.rowCount === 0) {
    throw createHttpError(404, 'Event not found')
  }

  const event = await fetchEventById(req.params.eventId, schema)
  return res.json({
    success: true,
    message: 'Event updated',
    data: event,
  })
}

async function createFundingSource(req, res) {
  const payload = fundingSourceSchema.parse(req.body)
  const schema = await getSchemaMap()

  await fetchEventById(req.params.eventId, schema)

  const columns = [schema.funding.nameColumn, schema.funding.amountColumn, schema.funding.eventColumn]
  const values = [payload.name, payload.amount, String(req.params.eventId)]

  if (schema.funding.lastEditedByColumn && req.user?.sub) {
    columns.push(schema.funding.lastEditedByColumn)
    values.push(req.user.sub)
  }

  const insertQuery = `
    INSERT INTO ${quoteIdent(schema.funding.table)} (${columns.map(quoteIdent).join(', ')})
    VALUES (${values.map((_, index) => `$${index + 1}`).join(', ')})
  `
  await db.query(insertQuery, values)

  const event = await fetchEventById(req.params.eventId, schema)
  return res.status(201).json({
    success: true,
    message: 'Funding source added',
    data: event,
  })
}

async function updateFundingSource(req, res) {
  const payload = fundingSourceSchema.parse(req.body)
  const schema = await getSchemaMap()

  const updates = [
    `${quoteIdent(schema.funding.nameColumn)} = $1`,
    `${quoteIdent(schema.funding.amountColumn)} = $2`,
  ]
  const values = [payload.name, payload.amount]

  if (schema.funding.lastEditedByColumn && req.user?.sub) {
    updates.push(`${quoteIdent(schema.funding.lastEditedByColumn)} = $3`)
    values.push(req.user.sub)
  }

  values.push(String(req.params.sourceId))
  values.push(String(req.params.eventId))

  const updateQuery = `
    UPDATE ${quoteIdent(schema.funding.table)}
    SET ${updates.join(', ')}
    WHERE ${quoteIdent(schema.funding.idColumn)}::text = $${values.length - 1}
      AND ${quoteIdent(schema.funding.eventColumn)}::text = $${values.length}
    RETURNING *
  `
  const result = await db.query(updateQuery, values)
  if (result.rowCount === 0) {
    throw createHttpError(404, 'Funding source not found for this event')
  }

  const event = await fetchEventById(req.params.eventId, schema)
  return res.json({
    success: true,
    message: 'Funding source updated',
    data: event,
  })
}

async function deleteFundingSource(req, res) {
  const schema = await getSchemaMap()
  const deleteQuery = `
    DELETE FROM ${quoteIdent(schema.funding.table)}
    WHERE ${quoteIdent(schema.funding.idColumn)}::text = $1
      AND ${quoteIdent(schema.funding.eventColumn)}::text = $2
    RETURNING *
  `

  const result = await db.query(deleteQuery, [String(req.params.sourceId), String(req.params.eventId)])
  if (result.rowCount === 0) {
    throw createHttpError(404, 'Funding source not found for this event')
  }

  const event = await fetchEventById(req.params.eventId, schema)
  return res.json({
    success: true,
    message: 'Funding source removed',
    data: event,
  })
}

async function createCategory(req, res) {
  const payload = categorySchema.parse(req.body)
  const schema = await getSchemaMap()
  await fetchEventById(req.params.eventId, schema)

  const columns = [schema.categories.nameColumn, schema.categories.eventColumn]
  const values = [payload.name, String(req.params.eventId)]

  columns.push(schema.categories.amountColumn)
  values.push(payload.allocated)

  if (schema.categories.paidColumn) {
    columns.push(schema.categories.paidColumn)
    values.push(payload.paid)
  }

  if (schema.categories.lastEditedByColumn && req.user?.sub) {
    columns.push(schema.categories.lastEditedByColumn)
    values.push(req.user.sub)
  }

  const insertQuery = `
    INSERT INTO ${quoteIdent(schema.categories.table)} (${columns.map(quoteIdent).join(', ')})
    VALUES (${values.map((_, index) => `$${index + 1}`).join(', ')})
  `
  await db.query(insertQuery, values)

  const event = await fetchEventById(req.params.eventId, schema)
  return res.status(201).json({
    success: true,
    message: 'Category added',
    data: event,
  })
}

async function updateCategory(req, res) {
  const payload = categorySchema.parse(req.body)
  const schema = await getSchemaMap()
  const updates = [
    `${quoteIdent(schema.categories.nameColumn)} = $1`,
    `${quoteIdent(schema.categories.amountColumn)} = $2`,
  ]
  const values = [payload.name, payload.allocated]

  if (schema.categories.paidColumn) {
    updates.push(`${quoteIdent(schema.categories.paidColumn)} = $${values.length + 1}`)
    values.push(payload.paid)
  }
  if (schema.categories.lastEditedByColumn && req.user?.sub) {
    updates.push(`${quoteIdent(schema.categories.lastEditedByColumn)} = $${values.length + 1}`)
    values.push(req.user.sub)
  }

  values.push(String(req.params.categoryId))
  values.push(String(req.params.eventId))

  const updateQuery = `
    UPDATE ${quoteIdent(schema.categories.table)}
    SET ${updates.join(', ')}
    WHERE ${quoteIdent(schema.categories.idColumn)}::text = $${values.length - 1}
      AND ${quoteIdent(schema.categories.eventColumn)}::text = $${values.length}
    RETURNING *
  `
  const result = await db.query(updateQuery, values)
  if (result.rowCount === 0) {
    throw createHttpError(404, 'Category not found for this event')
  }

  const event = await fetchEventById(req.params.eventId, schema)
  return res.json({
    success: true,
    message: 'Category updated',
    data: event,
  })
}

async function deleteCategory(req, res) {
  const schema = await getSchemaMap()
  const deleteQuery = `
    DELETE FROM ${quoteIdent(schema.categories.table)}
    WHERE ${quoteIdent(schema.categories.idColumn)}::text = $1
      AND ${quoteIdent(schema.categories.eventColumn)}::text = $2
    RETURNING *
  `

  const result = await db.query(deleteQuery, [String(req.params.categoryId), String(req.params.eventId)])
  if (result.rowCount === 0) {
    throw createHttpError(404, 'Category not found for this event')
  }

  const event = await fetchEventById(req.params.eventId, schema)
  return res.json({
    success: true,
    message: 'Category removed',
    data: event,
  })
}

module.exports = {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  createFundingSource,
  updateFundingSource,
  deleteFundingSource,
  createCategory,
  updateCategory,
  deleteCategory,
}
