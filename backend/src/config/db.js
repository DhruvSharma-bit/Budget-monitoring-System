const { Pool } = require('pg')
const { databaseUrl, nodeEnv } = require('./env')

const pool = new Pool({
  connectionString: databaseUrl,
  max: nodeEnv === 'production' ? 20 : 10,
})

const query = (text, params = []) => pool.query(text, params)

module.exports = {
  pool,
  query,
}
