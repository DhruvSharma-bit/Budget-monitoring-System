const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const { z } = require('zod')
const db = require('../config/db')
const { jwtSecret, jwtExpiresIn, adminUsernames } = require('../config/env')
const { getSchemaMap, quoteIdent } = require('../db/schema')
const { createHttpError } = require('../utils/httpError')

const loginSchema = z.object({
  username: z.string().trim().min(1).optional(),
  email: z.string().trim().min(1).optional(),
  password: z.string().min(1),
}).refine((payload) => payload.username || payload.email, {
  message: 'username (or email field) is required',
})

function issueToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn },
  )
}

const normalizeRole = (rawRole, username) => {
  if (rawRole === true) return 'admin'
  if (typeof rawRole === 'string' && rawRole.trim()) {
    return rawRole.trim().toLowerCase()
  }
  const isAdminByUsername = adminUsernames.includes(String(username || '').toLowerCase())
  return isAdminByUsername ? 'admin' : 'user'
}

async function login(req, res) {
  const payload = loginSchema.parse(req.body)
  const identifier = (payload.username || payload.email || '').trim()
  const schema = await getSchemaMap()
  const users = schema.users

  const query = `
    SELECT *
    FROM ${quoteIdent(users.table)}
    WHERE ${quoteIdent(users.usernameColumn)} = $1
    LIMIT 1
  `

  const result = await db.query(query, [identifier])
  const userRow = result.rows[0]

  if (!userRow) {
    throw createHttpError(401, 'Invalid username or password')
  }

  const storedPassword = String(userRow[users.passwordColumn] || '')
  const isBcryptHash = storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')
  const isPasswordMatch = isBcryptHash
    ? await bcrypt.compare(payload.password, storedPassword)
    : payload.password === storedPassword

  if (!isPasswordMatch) {
    throw createHttpError(401, 'Invalid username or password')
  }

  const user = {
    id: String(userRow[users.idColumn]),
    name: userRow[users.nameColumn] || userRow[users.usernameColumn],
    email: userRow[users.usernameColumn],
    role: normalizeRole(users.roleColumn ? userRow[users.roleColumn] : null, userRow[users.usernameColumn]),
  }

  const token = issueToken(user)

  return res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user,
    },
  })
}

async function me(req, res) {
  return res.json({
    success: true,
    data: {
      id: req.user.sub,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  })
}

module.exports = {
  login,
  me,
}
