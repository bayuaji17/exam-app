import { betterAuth } from "better-auth"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin as adminPlugin } from "better-auth/plugins/admin"

import {
  APP_ROLES,
  type AppRole,
  authRoles,
  getAppRoles,
  isAppRole,
} from "@/lib/auth-roles"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"

function getRequestedRole(role: unknown): AppRole {
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

function getSessionRole(context: unknown): unknown {
  return (
    context as {
      session?: {
        user?: {
          role?: unknown
        }
      }
    }
  ).session?.user?.role
}

function assertCanCreateRole(actorRoles: AppRole[], targetRole: AppRole) {
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
      if (ctx.path !== "/admin/create-user") {
        return
      }

      const actorRoles = getAppRoles(getSessionRole(ctx.context))

      if (actorRoles.length === 0) {
        throw new APIError("UNAUTHORIZED", {
          message: "You must be signed in to create users.",
        })
      }

      assertCanCreateRole(actorRoles, getRequestedRole(getBodyRole(ctx.body)))
    }),
  },
  plugins: [
    adminPlugin({
      roles: authRoles,
      defaultRole: APP_ROLES.USER,
      adminRoles: [APP_ROLES.SUPER_ADMIN, APP_ROLES.ADMIN],
    }),
  ],
})
