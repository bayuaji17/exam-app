import { randomUUID } from "node:crypto"

import nextEnv from "@next/env"
import { hashPassword } from "better-auth/crypto"
import pg from "pg"

const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd())

const requiredEnv = [
  "DATABASE_URL",
  "SUPER_ADMIN_EMAIL",
  "SUPER_ADMIN_PASSWORD",
  "SUPER_ADMIN_NAME",
]

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
}

const email = process.env.SUPER_ADMIN_EMAIL.toLowerCase()
const password = process.env.SUPER_ADMIN_PASSWORD
const name = process.env.SUPER_ADMIN_NAME
const username = process.env.SUPER_ADMIN_USERNAME?.trim().toLowerCase() || null
const displayUsername =
  process.env.SUPER_ADMIN_DISPLAY_USERNAME?.trim() ||
  process.env.SUPER_ADMIN_USERNAME?.trim() ||
  null

if (username) {
  if (username.length < 3 || username.length > 30) {
    throw new Error("SUPER_ADMIN_USERNAME must be between 3 and 30 characters.")
  }

  if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
    throw new Error(
      "SUPER_ADMIN_USERNAME can only contain letters, numbers, underscores, and dots."
    )
  }
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

const client = await pool.connect()

try {
  await client.query("begin")

  const existingUser = await client.query(
    'select "id" from "user" where lower("email") = lower($1) limit 1',
    [email]
  )

  if (existingUser.rowCount > 0) {
    throw new Error(`User already exists: ${email}`)
  }

  if (username) {
    const existingUsername = await client.query(
      'select "id" from "user" where "username" = $1 limit 1',
      [username]
    )

    if (existingUsername.rowCount > 0) {
      throw new Error(`Username already exists: ${username}`)
    }
  }

  const userId = randomUUID()
  const accountId = randomUUID()
  const hashedPassword = await hashPassword(password)

  await client.query(
    `insert into "user" (
      "id",
      "name",
      "email",
      "emailVerified",
      "username",
      "displayUsername",
      "role",
      "banned",
      "createdAt",
      "updatedAt"
    ) values ($1, $2, $3, true, $4, $5, 'super-admin', false, now(), now())`,
    [userId, name, email, username, displayUsername]
  )

  await client.query(
    `insert into "account" (
      "id",
      "accountId",
      "providerId",
      "userId",
      "password",
      "createdAt",
      "updatedAt"
    ) values ($1, $2, 'credential', $3, $4, now(), now())`,
    [accountId, userId, userId, hashedPassword]
  )

  await client.query("commit")
  console.log(`Seeded super admin: ${email}${username ? ` (${username})` : ""}`)
} catch (error) {
  await client.query("rollback").catch(() => {})
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  client.release()
  await pool.end()
}
