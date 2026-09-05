import { APP_ROLES, type SystemRole } from "@/lib/auth-roles"

/**
 * Human-readable label for each role.
 *
 * Typed as a total map over `SystemRole` so adding a role to `APP_ROLES` fails
 * typecheck here until it gets a label, rather than rendering a raw slug like
 * "super-admin" in the UI.
 */
const ROLE_LABELS: Record<SystemRole, string> = {
  [APP_ROLES.USER]: "User",
  [APP_ROLES.ADMIN]: "Admin",
  [APP_ROLES.SUPER_ADMIN]: "Super Admin",
}

export function formatRoleLabel(role: SystemRole): string {
  return ROLE_LABELS[role]
}

/**
 * Value + label pairs for role filter dropdowns, derived from the same
 * ROLE_LABELS map so the UI can never show a label the formatter does not
 * know. Pages filter this list down when they manage a subset of roles.
 */
export const ROLE_OPTIONS = (
  Object.entries(ROLE_LABELS) as [SystemRole, string][]
).map(([value, label]) => ({ value, label }))

/**
 * Fixed locale and timezone.
 *
 * Left implicit, this would format in whatever timezone the server process
 * runs in, so the same row could render a different date locally, in CI, and
 * in production. Pinning both makes the output a property of the data alone.
 */
const JOINED_AT_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

export function formatJoinedAt(date: Date): string {
  return JOINED_AT_FORMAT.format(date)
}

/**
 * A ban-expiry moment, shown as a date and time.
 *
 * Same fixed locale and zone as `formatJoinedAt`, plus the time. Takes the
 * date as an argument rather than reading the clock, so a server component
 * can render it without an impure `Date.now()` call.
 */
const BAN_EXPIRY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
})

export function formatBanExpiryDate(date: Date): string {
  return BAN_EXPIRY_FORMAT.format(date).replace(":", ".")
}
