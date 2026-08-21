import { randomUUID } from "node:crypto"
import { hashPassword } from "better-auth/crypto"
import pg from "pg"

export interface TestUser {
  email: string
  password: string
  name: string
  username: string
  role: "user" | "admin" | "super-admin"
}

export const TEST_USERS: TestUser[] = [
  {
    email: "test-user@example.com",
    password: "TestUser123!",
    name: "Test User",
    username: "testuser",
    role: "user",
  },
  {
    email: "test-admin@example.com",
    password: "TestAdmin123!",
    name: "Test Admin",
    username: "testadmin",
    role: "admin",
  },
  {
    email: "test-superadmin@example.com",
    password: "TestSuperAdmin123!",
    name: "Test Super Admin",
    username: "testsuperadmin",
    role: "super-admin",
  },
]

/**
 * Seed test users for E2E tests. Idempotent: skips users that already exist.
 */
export async function seedTestUsers(databaseUrl: string): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl })
  const client = await pool.connect()

  try {
    for (const user of TEST_USERS) {
      await client.query("begin")

      const existing = await client.query(
        'select "id" from "user" where lower("email") = lower($1) limit 1',
        [user.email]
      )

      if (existing.rowCount !== null && existing.rowCount > 0) {
        await client.query("rollback")
        console.log(`Skipped existing test user: ${user.email}`)
        continue
      }

      const userId = randomUUID()
      const accountId = randomUUID()
      const hashedPassword = await hashPassword(user.password)

      await client.query(
        `insert into "user" (
          "id", "name", "email", "emailVerified", "username",
          "displayUsername", "role", "banned", "createdAt", "updatedAt"
        ) values ($1, $2, $3, true, $4, $5, $6, false, now(), now())`,
        [userId, user.name, user.email, user.username, user.username, user.role]
      )

      await client.query(
        `insert into "account" (
          "id", "issuer", "accountId", "providerId", "userId", "password",
          "createdAt", "updatedAt"
        ) values ($1, 'local:credential', $2, 'credential', $3, $4, now(), now())`,
        [accountId, userId, userId, hashedPassword]
      )

      await client.query("commit")
      console.log(`Seeded test user: ${user.email} (${user.role})`)
    }
  } catch (error) {
    await client.query("rollback").catch(() => {})
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}
