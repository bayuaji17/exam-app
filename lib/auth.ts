import { betterAuth } from "better-auth"
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin as adminPlugin } from "better-auth/plugins/admin"
import { username } from "better-auth/plugins/username"
import { eq } from "drizzle-orm"

import {
  APP_ROLES,
  type SystemRole,
  authRoles,
  getAppRoles,
  isAppRole,
} from "@/lib/auth-roles"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import {
  canBanUser,
  canChangeRole,
  canRemoveUser,
} from "@/lib/users/edit"

function getRequestedRole(role: unknown): SystemRole {
  if (role === undefined || role === null || role === "") {
    return APP_ROLES.USER
  }

  if (Array.isArray(role)) {
    throw new APIError("BAD_REQUEST", {
      message: "Users must have exactly one role.",
    })
  }

  if (!isAppRole(role)) {
    throw new APIError("BAD_REQUEST", {
      message: "Invalid user role.",
    })
  }

  return role
}

function getBodyRole(body: unknown): unknown {
  if (!body || typeof body !== "object") {
    return undefined
  }

  return (body as { role?: unknown }).role
}

function getBodyUserId(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return undefined
  }

  const userId = (body as { userId?: unknown }).userId

  return typeof userId === "string" ? userId : undefined
}

function getSessionUserRole(session: unknown): unknown {
  return (
    session as {
      user?: {
        role?: unknown
      }
    } | null
  )?.user?.role
}

function getSessionUserId(session: unknown): string | undefined {
  const id = (
    session as {
      user?: {
        id?: unknown
      }
    } | null
  )?.user?.id

  return typeof id === "string" ? id : undefined
}

function assertCanCreateRole(actorRoles: SystemRole[], targetRole: SystemRole) {
  if (targetRole === APP_ROLES.SUPER_ADMIN) {
    throw new APIError("FORBIDDEN", {
      message: "Super admin users cannot be created from the app.",
    })
  }

  if (actorRoles.includes(APP_ROLES.SUPER_ADMIN)) {
    return
  }

  if (actorRoles.includes(APP_ROLES.ADMIN) && targetRole === APP_ROLES.USER) {
    return
  }

  throw new APIError("FORBIDDEN", {
    message: "You are not allowed to create a user with this role.",
  })
}

/**
 * The paths that act on an existing account, and the rule each one answers to.
 *
 * Better Auth's own permission checks are rank-blind: `user: ["ban"]` allows
 * banning anybody, including a super admin. These rules add the hierarchy.
 */
const TARGETED_ADMIN_RULES = {
  "/admin/set-role": {
    can: canChangeRole,
    message: "You are not allowed to change this user's role.",
  },
  "/admin/ban-user": {
    can: canBanUser,
    message: "You are not allowed to ban this user.",
  },
  "/admin/remove-user": {
    can: canRemoveUser,
    message: "You are not allowed to remove this user.",
  },
} as const

function isTargetedAdminPath(
  path: string
): path is keyof typeof TARGETED_ADMIN_RULES {
  return path in TARGETED_ADMIN_RULES
}

/**
 * The role stored for an account, read straight from the table.
 *
 * The rules need the *target's* rank, and the request only carries an id, so
 * this lookup is unavoidable. An unknown id is reported as such rather than
 * defaulted to `user`, which would let a typo pass the hierarchy check.
 */
async function getStoredRole(userId: string): Promise<SystemRole> {
  const [row] = await db
    .select({ role: schema.user.role })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1)

  if (!row) {
    throw new APIError("NOT_FOUND", {
      message: "User not found.",
    })
  }

  const [role] = getAppRoles(row.role)

  if (!role) {
    throw new APIError("BAD_REQUEST", {
      message: "User has an unrecognised role.",
    })
  }

  return role
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const isCreate = ctx.path === "/admin/create-user"

      if (!isCreate && !isTargetedAdminPath(ctx.path)) {
        return
      }

      // The session is not on `ctx.context` in a before-hook; it has to be
      // resolved from the request, the same way the admin plugin does it.
      const session = await getSessionFromCtx(ctx)
      const actorRoles = getAppRoles(getSessionUserRole(session))
      const actorId = getSessionUserId(session)

      if (actorRoles.length === 0 || !actorId) {
        throw new APIError("UNAUTHORIZED", {
          message: "You must be signed in to manage users.",
        })
      }

      if (isCreate) {
        assertCanCreateRole(actorRoles, getRequestedRole(getBodyRole(ctx.body)))
        return
      }

      // TypeScript needs a fresh assertion after the early returns above.
      if (!isTargetedAdminPath(ctx.path)) {
        return
      }

      const rule = TARGETED_ADMIN_RULES[ctx.path]
      const targetId = getBodyUserId(ctx.body)

      if (!targetId) {
        throw new APIError("BAD_REQUEST", {
          message: "A user id is required.",
        })
      }

      const actor = { id: actorId, role: actorRoles[0] }
      const target = { id: targetId, role: await getStoredRole(targetId) }

      if (!rule.can(actor, target)) {
        throw new APIError("FORBIDDEN", { message: rule.message })
      }

      // A role change also may not *create* a super admin, which the rank
      // check above cannot see: the target is a regular user either way.
      if (ctx.path === "/admin/set-role") {
        assertCanCreateRole(actorRoles, getRequestedRole(getBodyRole(ctx.body)))
      }
    }),
  },
  plugins: [
    adminPlugin({
      roles: authRoles,
      defaultRole: APP_ROLES.USER,
      adminRoles: [APP_ROLES.SUPER_ADMIN, APP_ROLES.ADMIN],
    }),
    username(),
  ],
})
