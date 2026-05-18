import { createAuthClient } from "better-auth/react"
import { adminClient, usernameClient } from "better-auth/client/plugins"

import { authRoles } from "@/lib/auth-roles"

export const authClient = createAuthClient({
  plugins: [
    adminClient({
      roles: authRoles,
    }),
    usernameClient(),
  ],
})
