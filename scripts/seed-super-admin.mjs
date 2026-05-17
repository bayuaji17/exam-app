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

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

const client = await pool.connect()

try {
  await client.query("begin")

  const existingUser = await client.query(
    'select "id" from "user" where lower("email") = lower($1) limit 1',
    [email],
  )

  if (existingUser.rowCount > 0) {
    throw new Error(`User already exists: ${email}`)
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
      "role",
      "banned",
      "createdAt",
      "updatedAt"
    ) values ($1, $2, $3, true, 'super-admin', false, now(), now())`,
    [userId, name, email],
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
    [accountId, userId, userId, hashedPassword],
  )

  await client.query("commit")
  console.log(`Seeded super admin: ${email}`)
} catch (error) {
  await client.query("rollback").catch(() => {})
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  client.release()
  await pool.end()
}
