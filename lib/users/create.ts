import { z } from "zod"

import { APP_ROLES, type SystemRole } from "@/lib/auth-roles"

/**
 * Roles that can ever be handed out from the app.
 *
 * `super-admin` is absent on purpose: the server rejects it outright
 * (`assertCanCreateRole` in `lib/auth.ts`), and the only way to get one is the
 * seed script.
 */
export const CREATABLE_ROLES = [APP_ROLES.USER, APP_ROLES.ADMIN] as const

export type CreatableRole = (typeof CREATABLE_ROLES)[number]

/**
 * Whether an actor may hand out a role. The single rule behind both the
 * server-side enforcement (`assertCanCreateRole` in `lib/auth.ts`) and the
 * role options the forms offer, so the two cannot drift.
 */
export function canAssignRole(
  actorRoles: SystemRole[],
  targetRole: SystemRole
): boolean {
  if (!(CREATABLE_ROLES as readonly SystemRole[]).includes(targetRole)) {
    return false
  }

  if (actorRoles.includes(APP_ROLES.SUPER_ADMIN)) {
    return true
  }

  return (
    actorRoles.includes(APP_ROLES.ADMIN) && targetRole === APP_ROLES.USER
  )
}

/**
 * Which roles this actor may hand out, in least-privileged-first order.
 *
 * The server rule (`assertCanCreateRole` in `lib/auth.ts`) is the protection;
 * this only decides what the forms offer, and both now derive from
 * `canAssignRole`.
 */
export function getAssignableRoles(actorRoles: SystemRole[]): CreatableRole[] {
  return CREATABLE_ROLES.filter((role) => canAssignRole(actorRoles, role))
}

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      (value) => z.email().safeParse(value).success,
      "Enter a valid email address"
    ),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(CREATABLE_ROLES),
})

export type CreateUserFormValues = z.infer<typeof createUserSchema>
