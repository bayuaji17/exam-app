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

export const adminAccess = defaultAc.newRole({
  user: ["create"],
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
