const dotenv = require('dotenv')

dotenv.config()

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'budget_monitor_local_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminUsernames: (process.env.ADMIN_USERNAMES || 'admin@college.edu,admin@dtu.ac.in')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
}

if (!config.databaseUrl) {
  throw new Error('Set DIRECT_DATABASE_URL (preferred) or DATABASE_URL in .env')
}

if (!/^postgres(ql)?:\/\//i.test(config.databaseUrl)) {
  throw new Error(
    'Database URL must start with postgresql:// or postgres://. Set DIRECT_DATABASE_URL to a direct PostgreSQL URL.',
  )
}

module.exports = config
