import nextEnv from "@next/env"

const { loadEnvConfig } = nextEnv
import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"

import * as schema from "../lib/db/schema"
import { migrateLegacyUserRoles, seedRbac } from "../lib/db/seed-rbac"

loadEnvConfig(process.cwd())

if (!process.env.DATABASE_URL) {
  throw new Error("Missing required environment variable: DATABASE_URL")
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

const db = drizzle(pool, { schema })

async function run() {
  console.log("Seeding RBAC permissions and default roles...")
  const { roleIdMap } = await seedRbac(db)
  console.log(`✓ Seeded ${roleIdMap.size} roles and system permissions.`)

  console.log("Migrating legacy user role assignments...")
  const { migratedCount, totalUsers } = await migrateLegacyUserRoles(db)
  console.log(
    `✓ Migrated ${migratedCount} of ${totalUsers} users into user_roles.`
  )

  await pool.end()
  console.log("RBAC setup complete.")
}

run().catch(async (err) => {
  console.error("RBAC seed failed:", err)
  await pool.end()
  process.exit(1)
})
