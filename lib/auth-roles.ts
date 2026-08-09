import { defaultAc, defaultStatements } from "better-auth/plugins/admin/access"

export const APP_ROLES = {
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  USER: "user",
} as const

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES]

export const superAdminAccess = defaultAc.newRole({
  user: [...defaultStatements.user],
  session: [...defaultStatements.session],
})

/**
 * Admins may create accounts, ban and unban them, and remove them.
 *
 * `ban` covers unban too — Better Auth checks the same permission for both.
 * Notably absent is `set-role`: only a super-admin changes anyone's role.
 *
 * None of these permissions know anything about the target's rank, so on their
 * own they would let an admin ban or remove a super-admin. The before-hook in
 * `lib/auth.ts` is what prevents that.
 */
export const adminAccess = defaultAc.newRole({
  user: ["create", "ban", "delete"],
  session: [],
})

export const userAccess = defaultAc.newRole({
  user: [],
  session: [],
})

export const authRoles = {
  [APP_ROLES.SUPER_ADMIN]: superAdminAccess,
  [APP_ROLES.ADMIN]: adminAccess,
  [APP_ROLES.USER]: userAccess,
}

export function isAppRole(role: unknown): role is AppRole {
  return Object.values(APP_ROLES).includes(role as AppRole)
}

export function getAppRoles(role: unknown): AppRole[] {
  if (typeof role !== "string") {
    return []
  }

  return role
    .split(",")
    .map((value) => value.trim())
    .filter(isAppRole)
}
