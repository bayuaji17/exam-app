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
 * Which roles this actor may hand out, in least-privileged-first order.
 *
 * This mirrors `assertCanCreateRole` in `lib/auth.ts`, which is the rule that
 * actually protects the data — this one only decides what the form offers.
 * They are asserted to agree in `__test__/unit/users-create.test.ts`, so the
 * pair cannot drift silently.
 */
export function getAssignableRoles(actorRoles: SystemRole[]): CreatableRole[] {
  if (actorRoles.includes(APP_ROLES.SUPER_ADMIN)) {
    return [APP_ROLES.USER, APP_ROLES.ADMIN]
  }

  if (actorRoles.includes(APP_ROLES.ADMIN)) {
    return [APP_ROLES.USER]
  }

  return []
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
