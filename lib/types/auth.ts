import type { auth } from "@/lib/auth"
import type { AppRole } from "@/lib/auth-roles"

export type AuthSession = typeof auth.$Infer.Session
export type AuthUser = AuthSession["user"] & {
  role: AppRole
}

export type { AppRole }
