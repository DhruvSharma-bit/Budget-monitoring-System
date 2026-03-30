const db = require('../config/db')

const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`

let schemaCache = null

const findColumn = (columnsSet, candidates) => candidates.find((column) => columnsSet.has(column)) || null

async function loadColumnsByTable() {
  const { rows } = await db.query(
    `
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('users', 'events', 'funding_sources', 'categories')
    `,
  )

  const byTable = {
    users: new Set(),
    events: new Set(),
    funding_sources: new Set(),
    categories: new Set(),
  }

  rows.forEach((row) => {
    if (byTable[row.table_name]) {
      byTable[row.table_name].add(row.column_name)
    }
  })

  return byTable
}

function assertColumn(column, message) {
  if (!column) {
    throw new Error(message)
  }
}

async function getSchemaMap() {
  if (schemaCache) return schemaCache

  const tables = await loadColumnsByTable()

  const users = tables.users
  const events = tables.events
  const funding = tables.funding_sources
  const categories = tables.categories

  const usersMap = {
    table: 'users',
    idColumn: findColumn(users, ['user_id', 'id']),
    nameColumn: findColumn(users, ['name', 'full_name']),
    usernameColumn: findColumn(users, ['username', 'email']),
    passwordColumn: findColumn(users, ['password_hash', 'password']),
    roleColumn: findColumn(users, ['role', 'user_role', 'access_role', 'is_admin']),
  }

  const eventsMap = {
    table: 'events',
    idColumn: findColumn(events, ['event_id', 'id']),
    nameColumn: findColumn(events, ['name']),
    dateColumn: findColumn(events, ['date', 'event_date']),
    initialAllocationColumn: findColumn(events, ['initial_allocation']),
  }

  const fundingMap = {
    table: 'funding_sources',
    idColumn: findColumn(funding, ['funder_id', 'funding_source_id', 'id']),
    eventColumn: findColumn(funding, ['event', 'event_id']),
    nameColumn: findColumn(funding, ['name']),
    amountColumn: findColumn(funding, ['amount']),
    lastEditedByColumn: findColumn(funding, ['last_edited_by']),
  }

  const categoriesMap = {
    table: 'categories',
    idColumn: findColumn(categories, ['category_id', 'id']),
    eventColumn: findColumn(categories, ['event', 'event_id']),
    nameColumn: findColumn(categories, ['name']),
    amountColumn: findColumn(categories, ['amount', 'allocated']),
    paidColumn: findColumn(categories, ['paid']),
    lastEditedByColumn: findColumn(categories, ['last_edited_by']),
  }

  assertColumn(usersMap.idColumn, 'users table must have user_id or id')
  assertColumn(usersMap.usernameColumn, 'users table must have username column')
  assertColumn(usersMap.passwordColumn, 'users table must have password_hash column')

  assertColumn(eventsMap.idColumn, 'events table must have event_id or id')
  assertColumn(eventsMap.nameColumn, 'events table must have name column')
  assertColumn(eventsMap.dateColumn, 'events table must have date column')

  assertColumn(fundingMap.idColumn, 'funding_sources table must have funder_id or id')
  assertColumn(fundingMap.eventColumn, 'funding_sources table must have event/event_id column')
  assertColumn(fundingMap.nameColumn, 'funding_sources table must have name column')
  assertColumn(fundingMap.amountColumn, 'funding_sources table must have amount column')

  assertColumn(categoriesMap.idColumn, 'categories table must have category_id or id')
  assertColumn(categoriesMap.eventColumn, 'categories table must have event/event_id column')
  assertColumn(categoriesMap.nameColumn, 'categories table must have name column')
  assertColumn(categoriesMap.amountColumn, 'categories table must have amount or allocated column')

  schemaCache = {
    users: usersMap,
    events: eventsMap,
    funding: fundingMap,
    categories: categoriesMap,
  }

  return schemaCache
}

module.exports = {
  getSchemaMap,
  quoteIdent,
}
