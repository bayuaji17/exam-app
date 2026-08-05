import { type AppRole, APP_ROLES } from "@/lib/auth-roles"

/**
 * `/dashboard` is the overview page, not a namespace. Matching it as a prefix
 * would make every route beneath it readable by any signed-in user, so it is
 * matched exactly and every other pattern is matched as a prefix.
 */
const EXACT_ONLY = new Set(["/dashboard"])

/**
 * Access tiers, lowest privilege first. A role is granted a tier if that tier
 * appears in its entry in ROLE_TIERS below.
 */
const TIERS = {
  /** Any authenticated user. */
  ACCOUNT: [
    "/dashboard",
    "/dashboard/settings",
    "/dashboard/profile",
  ] as string[],

  /** Admin and super-admin: platform administration. */
  MANAGEMENT: [
    "/dashboard/users",
    "/dashboard/user-groups",
    "/dashboard/roles",
    "/dashboard/question-banks",
    "/dashboard/exams",
    "/dashboard/exam-schedules",
    "/dashboard/exam-sessions",
    "/dashboard/exam-access-rules",
    "/dashboard/exam-introductions",
    "/dashboard/manual-grading",
    "/dashboard/scoring-rules",
    "/dashboard/exam-results",
    "/dashboard/activity-tracking",
    "/dashboard/anti-cheat",
    "/dashboard/attempt-history",
    "/dashboard/reports/exam-results",
    "/dashboard/reports/individual",
    "/dashboard/reports/sessions",
  ] as string[],

  /** Super-admin only: managing the admin roster itself. */
  ADMIN_ROSTER: ["/dashboard/admins"] as string[],
} as const

type TierName = keyof typeof TIERS

const ROLE_TIERS: Record<AppRole, readonly TierName[]> = {
  [APP_ROLES.USER]: ["ACCOUNT"],
  [APP_ROLES.ADMIN]: ["ACCOUNT", "MANAGEMENT"],
  [APP_ROLES.SUPER_ADMIN]: ["ACCOUNT", "MANAGEMENT", "ADMIN_ROSTER"],
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
 * Resolve a route to the tier that owns it, choosing the most specific pattern
 * so that `/dashboard/users` resolves to MANAGEMENT rather than to the
 * `/dashboard` entry in ACCOUNT.
 */
function resolveTier(route: string): TierName | null {
  let owner: TierName | null = null
  let longest = -1

  for (const tier of Object.keys(TIERS) as TierName[]) {
    for (const pattern of TIERS[tier]) {
      if (matches(route, pattern) && pattern.length > longest) {
        owner = tier
        longest = pattern.length
      }
    }
  }

  return owner
}

/**
 * Whether a role may open a dashboard route. Unknown routes are denied, so a
 * typo in a future link cannot silently grant access.
 */
export function userHasPermission(role: AppRole, route: string): boolean {
  const normalized = normalize(route)

  if (normalized === null) {
    return false
  }

  const tier = resolveTier(normalized)

  if (tier === null) {
    return false
  }

  return ROLE_TIERS[role]?.includes(tier) ?? false
}

/**
 * Every route a role may open, for driving navigation menus.
 */
export function getPermittedRoutes(role: AppRole): string[] {
  return (ROLE_TIERS[role] ?? []).flatMap((tier) => [...TIERS[tier]])
}
