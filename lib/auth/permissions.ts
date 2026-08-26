import { APP_ROLES, type SystemRole } from "@/lib/auth-roles"
import {
  type AppPermission,
  hasPermission,
  PERMISSIONS,
  WILDCARD_PERMISSION,
} from "./permissions-catalog"

/**
 * `/dashboard` is the overview page, not a namespace. Matching it as a prefix
 * would make every route beneath it readable by any signed-in user, so it is
 * matched exactly and every other pattern is matched as a prefix.
 */
const EXACT_ONLY = new Set(["/dashboard"])

/**
 * Base routes accessible to any authenticated user.
 */
const ACCOUNT_ROUTES = [
  "/dashboard",
  "/dashboard/settings",
  "/dashboard/settings/profile",
  "/dashboard/settings/security",
  "/dashboard/settings/security/sessions",
  "/dashboard/profile",
  "/dashboard/forbidden",
]

/**
 * Mapping of dashboard route patterns to their required permission.
 */
export const ROUTE_PERMISSION_MAP: Record<string, AppPermission> = {
  "/dashboard/users": PERMISSIONS.USERS_READ,
  "/dashboard/user-groups": PERMISSIONS.USER_GROUPS_READ,
  "/dashboard/roles": PERMISSIONS.ROLES_READ,
  "/dashboard/admins": PERMISSIONS.SYSTEM_SETTINGS_READ,
  "/dashboard/question-banks": PERMISSIONS.QUESTION_BANKS_READ,
  "/dashboard/exams": PERMISSIONS.EXAMS_READ,
  "/dashboard/exam-schedules": PERMISSIONS.EXAM_SCHEDULES_READ,
  "/dashboard/exam-sessions": PERMISSIONS.EXAM_SCHEDULES_READ,
  "/dashboard/exam-access-rules": PERMISSIONS.ELIGIBILITY_MANAGE,
  "/dashboard/exam-introductions": PERMISSIONS.EXAM_SCHEDULES_READ,
  "/dashboard/manual-grading": PERMISSIONS.GRADING_READ,
  "/dashboard/scoring-rules": PERMISSIONS.EXAMS_READ,
  "/dashboard/exam-results": PERMISSIONS.RESULTS_READ,
  "/dashboard/activity-tracking": PERMISSIONS.ACTIVITY_LOGS_READ,
  "/dashboard/anti-cheat": PERMISSIONS.ACTIVITY_LOGS_READ,
  "/dashboard/attempt-history": PERMISSIONS.RESULTS_READ,
  "/dashboard/reports": PERMISSIONS.REPORTS_EXPORT,
  "/dashboard/reports/exam-results": PERMISSIONS.REPORTS_EXPORT,
  "/dashboard/reports/individual": PERMISSIONS.REPORTS_EXPORT,
  "/dashboard/reports/sessions": PERMISSIONS.REPORTS_EXPORT,
  "/dashboard/settings/system": PERMISSIONS.SYSTEM_SETTINGS_READ,
}

function normalize(route: string): string | null {
  if (typeof route !== "string" || route.length === 0) {
    return null
  }

  const trimmed =
    route.length > 1 && route.endsWith("/") ? route.slice(0, -1) : route

  return trimmed.startsWith("/dashboard") ? trimmed : null
}

/**
 * A route matches a pattern when it is the pattern itself or nested beneath it.
 * The trailing-slash check stops `/dashboard/users-export` from matching
 * `/dashboard/users`. Patterns in EXACT_ONLY never match nested routes.
 */
function matches(route: string, pattern: string): boolean {
  if (route === pattern) {
    return true
  }

  if (EXACT_ONLY.has(pattern)) {
    return false
  }

  return route.startsWith(`${pattern}/`)
}

/**
 * Finds the most specific registered pattern that matches the route.
 */
function findMatchingPattern(
  route: string,
  patterns: readonly string[]
): string | null {
  let matchedPattern: string | null = null
  let longest = -1

  for (const pattern of patterns) {
    if (matches(route, pattern) && pattern.length > longest) {
      matchedPattern = pattern
      longest = pattern.length
    }
  }

  return matchedPattern
}

/**
 * Resolves the required permission for a given dashboard route.
 * Returns `null` for account routes that are open to any signed-in user,
 * or `undefined` if the route is unknown (not registered).
 */
export function getRequiredPermissionForRoute(
  route: string
): AppPermission | null | undefined {
  const normalized = normalize(route)
  if (normalized === null) {
    return undefined
  }

  // System config is a special subpath under settings that requires SYSTEM_SETTINGS_READ
  if (matches(normalized, "/dashboard/settings/system")) {
    return PERMISSIONS.SYSTEM_SETTINGS_READ
  }

  // Check account routes
  const matchingAccountPattern = findMatchingPattern(normalized, ACCOUNT_ROUTES)
  if (matchingAccountPattern !== null) {
    return null
  }

  // Check guarded routes
  const guardedPatterns = Object.keys(ROUTE_PERMISSION_MAP)
  const matchingGuardedPattern = findMatchingPattern(normalized, guardedPatterns)
  if (matchingGuardedPattern !== null) {
    return ROUTE_PERMISSION_MAP[matchingGuardedPattern]
  }

  // Route is unknown
  return undefined
}

/**
 * Evaluates whether a set of user permissions allows access to a dashboard route.
 */
export function canAccessRoute(
  userPermissions: readonly string[] | Set<string>,
  route: string
): boolean {
  const required = getRequiredPermissionForRoute(route)

  // Route is unknown or malformed
  if (required === undefined) {
    return false
  }

  // Account route open to all authenticated users
  if (required === null) {
    return true
  }

  // Permission-guarded route
  return hasPermission(userPermissions, required)
}

/**
 * Legacy & polymorphic route permission helper.
 * Supports legacy SystemRole (`user`, `admin`, `super-admin`) as well as
 * dynamic permission lists/sets.
 */
export function userHasPermission(
  roleOrPermissions: SystemRole | readonly string[] | Set<string>,
  route: string
): boolean {
  if (typeof roleOrPermissions === "string") {
    // Legacy SystemRole check
    if (roleOrPermissions === APP_ROLES.SUPER_ADMIN) {
      return canAccessRoute([WILDCARD_PERMISSION], route)
    }

    if (roleOrPermissions === APP_ROLES.ADMIN) {
      const normalized = normalize(route)
      if (!normalized) return false

      // Admin cannot access admins roster or system config
      if (
        matches(normalized, "/dashboard/admins") ||
        matches(normalized, "/dashboard/settings/system")
      ) {
        return false
      }

      // Check if it's a known route
      const required = getRequiredPermissionForRoute(normalized)
      return required !== undefined
    }

    if (roleOrPermissions === APP_ROLES.USER) {
      const normalized = normalize(route)
      if (!normalized) return false

      // User cannot access system config
      if (matches(normalized, "/dashboard/settings/system")) {
        return false
      }

      const matchingAccountPattern = findMatchingPattern(normalized, ACCOUNT_ROUTES)
      return matchingAccountPattern !== null
    }

    return false
  }

  return canAccessRoute(roleOrPermissions, route)
}
