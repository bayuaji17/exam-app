import { APP_ROLES, type AppRole } from "@/lib/auth-roles"

/**
 * Just enough of an account to decide what may be done to it.
 */
export interface EditActor {
  id: string
  role: AppRole
}

export interface EditTarget {
  id: string
  role: AppRole
}

export type BanDurationPresetValue =
  | "1-hour"
  | "24-hours"
  | "7-days"
  | "30-days"

const HOUR_IN_SECONDS = 3600
const DAY_IN_SECONDS = 86_400

export const BAN_DURATION_PRESETS: {
  value: BanDurationPresetValue
  label: string
  seconds: number
}[] = [
  { value: "1-hour", label: "1 jam", seconds: HOUR_IN_SECONDS },
  { value: "24-hours", label: "24 jam", seconds: 24 * HOUR_IN_SECONDS },
  { value: "7-days", label: "7 hari", seconds: 7 * DAY_IN_SECONDS },
  { value: "30-days", label: "30 hari", seconds: 30 * DAY_IN_SECONDS },
]

export type BanDuration =
  | { kind: "permanent" }
  | { kind: "preset"; preset: BanDurationPresetValue }
  | { kind: "custom"; days: number }

/**
 * How long a ban should last, in seconds from now.
 *
 * `undefined` rather than 0 or null for a permanent ban: Better Auth's
 * `banExpiresIn` is optional, and omitting it is what leaves `banExpires`
 * empty. Sending a falsy number would be read as "expires immediately".
 */
export function banDurationToSeconds(
  duration: BanDuration
): number | undefined {
  if (duration.kind === "permanent") {
    return undefined
  }

  if (duration.kind === "custom") {
    if (!Number.isFinite(duration.days) || duration.days < 1) {
      return undefined
    }

    return Math.round(duration.days * DAY_IN_SECONDS)
  }

  return BAN_DURATION_PRESETS.find(
    (preset) => preset.value === duration.preset
  )?.seconds
}

/**
 * Fixed locale and zone, matching `lib/users/format.ts`.
 *
 * Left implicit this would follow the server's timezone, so the preview shown
 * while choosing a duration could disagree with the date stored afterwards.
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

/**
 * When a ban of this length would lift, for previewing the choice.
 * Null when the ban never expires.
 */
export function formatBanExpiry(
  seconds: number | undefined,
  now: Date = new Date()
): string | null {
  if (seconds === undefined) {
    return null
  }

  const expiresAt = new Date(now.getTime() + seconds * 1000)

  return BAN_EXPIRY_FORMAT.format(expiresAt).replace(":", ".")
}

function isSelf(actor: EditActor, target: EditTarget): boolean {
  return actor.id === target.id
}

/**
 * Super admins are edited through the seed script, never through the app, so
 * no in-app action may touch one. Without this an admin could ban the last
 * super admin and lock everyone out of role management.
 */
function targetsSuperAdmin(target: EditTarget): boolean {
  return target.role === APP_ROLES.SUPER_ADMIN
}

/**
 * Only a super admin changes roles, and never their own — self-demotion would
 * strip the last super admin with no way back.
 */
export function canChangeRole(actor: EditActor, target: EditTarget): boolean {
  if (isSelf(actor, target) || targetsSuperAdmin(target)) {
    return false
  }

  return actor.role === APP_ROLES.SUPER_ADMIN
}

/**
 * Admins and super admins may ban anyone below super admin, but not
 * themselves. Better Auth also refuses a self-ban; this keeps the form honest
 * before the request is made.
 */
export function canBanUser(actor: EditActor, target: EditTarget): boolean {
  if (isSelf(actor, target) || targetsSuperAdmin(target)) {
    return false
  }

  return actor.role === APP_ROLES.SUPER_ADMIN || actor.role === APP_ROLES.ADMIN
}

/**
 * Removal has no UI yet, but granting admins the `delete` permission made
 * `/admin/remove-user` reachable, so the rule lives here alongside the others
 * and is enforced by the same before-hook.
 *
 * Better Auth already refuses a self-removal; this keeps the two rules in one
 * place rather than relying on that alone.
 */
export function canRemoveUser(actor: EditActor, target: EditTarget): boolean {
  if (isSelf(actor, target) || targetsSuperAdmin(target)) {
    return false
  }

  return actor.role === APP_ROLES.SUPER_ADMIN || actor.role === APP_ROLES.ADMIN
}

/**
 * Whether the edit page has anything to offer for this pair.
 */
export function canEditUser(actor: EditActor, target: EditTarget): boolean {
  return canChangeRole(actor, target) || canBanUser(actor, target)
}
