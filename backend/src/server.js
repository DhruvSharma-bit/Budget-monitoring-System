const app = require('./app')
const db = require('./config/db')
const { port } = require('./config/env')
const { ensureDatabaseArtifacts } = require('./db/bootstrap')

let server

async function startServer() {
  await db.query('SELECT 1')
  await ensureDatabaseArtifacts()
  server = app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`)
  })
}

async function gracefulShutdown(signal) {
  console.log(`${signal} received, shutting down backend...`)
  if (server) {
    server.close(async () => {
      await db.pool.end()
      process.exit(0)
    })
  } else {
    await db.pool.end()
    process.exit(0)
  }
}

startServer().catch(async (error) => {
  console.error('Failed to start backend:', error)
  await db.pool.end()
  process.exit(1)
})

process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
