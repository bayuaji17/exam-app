import type { auth } from "@/lib/auth"
import type { SystemRole } from "@/lib/auth-roles"

export type AuthSession = typeof auth.$Infer.Session
export type AuthUser = AuthSession["user"] & {
  role: SystemRole
}

export type { SystemRole }
