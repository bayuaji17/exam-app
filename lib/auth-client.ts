import { createAuthClient } from "better-auth/react"
import { adminClient } from "better-auth/client/plugins"

import { authRoles } from "@/lib/auth-roles"

export const authClient = createAuthClient({
  plugins: [
    adminClient({
      roles: authRoles,
    }),
  ],
})
