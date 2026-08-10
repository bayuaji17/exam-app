import { randomUUID } from "node:crypto"
import { createHmac } from "node:crypto"
import { hashPassword } from "better-auth/crypto"
import nextEnv from "@next/env"
import pg from "pg"

const { loadEnvConfig } = nextEnv

/**
 * Marks every account these tests create, so cleanup can find them without
 * risking the seeded fixtures or a real super-admin.
 */
const CREATED_EMAIL_PREFIX = "e2e-created-"

/**
 * A fresh address per call.
 *
 * Better Auth rejects a duplicate email, so reusing one address would make the
 * suite pass once and fail on every re-run.
 */
export function uniqueTestEmail(label: string): string {
  return `${CREATED_EMAIL_PREFIX}${label}-${randomUUID().slice(0, 8)}@example.com`
}

function databaseUrl(): string {
  loadEnvConfig(process.cwd())

  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error("DATABASE_URL is not set.")
  }

  return url
}

/**
 * Delete every account these tests created.
 *
 * Scoped to the prefix above: a broader delete would take out the seeded role
 * fixtures and break the rest of the suite. Accounts cascade on user delete
 * (see the `account` foreign key), so removing the user is enough.
 */
export async function deleteCreatedTestUsers(): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    await pool.query('delete from "user" where "email" like $1', [
      `${CREATED_EMAIL_PREFIX}%`,
    ])
  } finally {
    await pool.end()
  }
}

/**
 * Whether an account with this email exists — used to assert a create really
 * reached the database rather than only re-rendering the list.
 */
export async function userExists(email: string): Promise<boolean> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    const result = await pool.query(
      'select 1 from "user" where lower("email") = lower($1) limit 1',
      [email]
    )

    return (result.rowCount ?? 0) > 0
  } finally {
    await pool.end()
  }
}

/**
 * The role stored for an account, or null when it does not exist.
 */
export async function storedRoleFor(email: string): Promise<string | null> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    const result = await pool.query<{ role: string }>(
      'select "role" from "user" where lower("email") = lower($1) limit 1',
      [email]
    )

    return result.rows[0]?.role ?? null
  } finally {
    await pool.end()
  }
}

export interface SeededTarget {
  id: string
  email: string
  password: string
}

/**
 * Insert an account to act on, without going through the admin API.
 *
 * The edit tests need a victim they can ban, demote, or promote. Reusing the
 * shared role fixtures would not do: banning destroys the target's sessions,
 * so the very next test that replayed those cookies would fail.
 */
export async function seedTargetUser(
  label: string,
  role: "user" | "admin" | "super-admin"
): Promise<SeededTarget> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })
  const client = await pool.connect()

  const id = randomUUID()
  const email = uniqueTestEmail(label)
  const password = "TargetUser123!"

  try {
    await client.query("begin")

    await client.query(
      `insert into "user" (
        "id", "name", "email", "emailVerified",
        "role", "banned", "createdAt", "updatedAt"
      ) values ($1, $2, $3, true, $4, false, now(), now())`,
      [id, `Target ${label}`, email, role]
    )

    await client.query(
      `insert into "account" (
        "id", "accountId", "providerId", "userId", "password",
        "createdAt", "updatedAt"
      ) values ($1, $2, 'credential', $3, $4, now(), now())`,
      [randomUUID(), id, id, await hashPassword(password)]
    )

    await client.query("commit")
  } catch (error) {
    await client.query("rollback").catch(() => {})
    throw error
  } finally {
    client.release()
    await pool.end()
  }

  return { id, email, password }
}

/**
 * Seed enough regular users to cross a table page boundary.
 *
 * This intentionally mirrors `seedTargetUser`'s direct fixture path rather
 * than exercising the create form for every row; the form itself is covered
 * separately, while pagination needs volume.
 */
export async function seedManyUsers(
  label: string,
  count: number
): Promise<SeededTarget[]> {
  const targets: SeededTarget[] = []

  for (let index = 1; index <= count; index += 1) {
    targets.push(await seedTargetUser(`${label}-${index}`, "user"))
  }

  return targets
}

/** Mark a fixture account as banned for status-filter coverage. */
export async function setUserBanState(
  email: string,
  banned: boolean,
  banReason = "Table filter test"
): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    await pool.query(
      `update "user"
       set "banned" = $2, "banReason" = case when $2 then $3 else null end,
           "banExpires" = null, "updatedAt" = now()
       where lower("email") = lower($1)`,
      [email, banned, banReason]
    )
  } finally {
    await pool.end()
  }
}

export interface StoredBanState {
  banned: boolean
  banReason: string | null
  banExpires: Date | null
}

export async function storedBanStateFor(
  email: string
): Promise<StoredBanState | null> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    const result = await pool.query<StoredBanState>(
      `select "banned", "banReason", "banExpires"
       from "user" where lower("email") = lower($1) limit 1`,
      [email]
    )

    return result.rows[0] ?? null
  } finally {
    await pool.end()
  }
}

/**
 * The id of a seeded role fixture, for tests that act on one by id.
 */
export async function userIdFor(email: string): Promise<string> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    const result = await pool.query<{ id: string }>(
      'select "id" from "user" where lower("email") = lower($1) limit 1',
      [email]
    )

    const id = result.rows[0]?.id

    if (!id) {
      throw new Error(`No user found for ${email}`)
    }

    return id
  } finally {
    await pool.end()
  }
}

export interface SeededSessionOptions {
  token: string
  ipAddress?: string | null
  userAgent?: string | null
  impersonatedBy?: string | null
  expiresInMs?: number
}

/**
 * The signed value Better Auth stores in the session cookie.
 *
 * The library signs session cookies as `<token>.<signature>` where the
 * signature is base64(HMAC-SHA256(secret, token)) — the same shape Hono's
 * signed-cookie helpers produce, since that is what Better Auth uses. A
 * context acting as "another device" must send this signed value, or the
 * server refuses the session.
 */
export function signSessionToken(token: string, secret: string): string {
  const signature = createHmac("sha256", secret).update(token).digest("base64")

  return `${token}.${signature}`
}

function sessionSecret(): string {
  loadEnvConfig(process.cwd())

  const secret = process.env.BETTER_AUTH_SECRET

  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is not set.")
  }

  return secret
}

/**
 * The signed cookie value for a session token, with the env loaded for the
 * worker process. Pass this as the `better-auth.session_token` cookie value
 * to act as the device holding that session.
 */
export function signedSessionCookieValue(token: string): string {
  return signSessionToken(token, sessionSecret())
}

/**
 * Insert an active session row for a user, with a token the test controls.
 *
 * Better Auth stores the session token in the cookie, so a context given this
 * token as its `better-auth.session_token` cookie is authenticated as that
 * user — no sign-in needed, which keeps the suite under the sign-in rate
 * limit and lets a test act as the "other device".
 */
export async function seedSessionForUser(
  userId: string,
  options: SeededSessionOptions
): Promise<{ id: string; token: string }> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })
  const client = await pool.connect()

  const id = randomUUID()
  const token = options.token

  try {
    await client.query("begin")

    await client.query(
      `insert into "session" (
        "id", "expiresAt", "token", "createdAt", "updatedAt",
        "ipAddress", "userAgent", "userId", "impersonatedBy"
      ) values ($1, $2, $3, now(), now(), $4, $5, $6, $7)`,
      [
        id,
        new Date(Date.now() + (options.expiresInMs ?? 7 * 86_400 * 1000)),
        token,
        options.ipAddress ?? null,
        options.userAgent ?? null,
        userId,
        options.impersonatedBy ?? null,
      ]
    )

    await client.query("commit")
  } catch (error) {
    await client.query("rollback").catch(() => {})
    throw error
  } finally {
    client.release()
    await pool.end()
  }

  return { id, token }
}

/**
 * Whether a session row still exists, for asserting a revoke really deleted it.
 */
export async function sessionExists(token: string): Promise<boolean> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    const result = await pool.query(
      'select 1 from "session" where "token" = $1 limit 1',
      [token]
    )

    return (result.rowCount ?? 0) > 0
  } finally {
    await pool.end()
  }
}

/**
 * Remove every session in the database.
 *
 * Global setup signs the fixture users in afresh each run, and every sign-in
 * leaves a row behind, so without this the fixtures accumulate dozens of
 * stale sessions and the sessions page grows unbounded. Called once at the
 * start of setup, before any sign-in, so the fixtures always start clean.
 */
export async function deleteAllSessions(): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    await pool.query('delete from "session"')
  } finally {
    await pool.end()
  }
}
