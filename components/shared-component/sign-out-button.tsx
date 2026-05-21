"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LogOutIcon } from "lucide-react"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { authClient } from "@/lib/auth-client"

function SignOutButton() {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = React.useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)

    try {
      await authClient.signOut()
      router.push("/login")
      router.refresh()
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <DropdownMenuItem
      variant="destructive"
      disabled={isSigningOut}
      onSelect={(event) => {
        event.preventDefault()
        void handleSignOut()
      }}
    >
      <LogOutIcon />
      {isSigningOut ? "Logging out..." : "Logout"}
    </DropdownMenuItem>
  )
}

export { SignOutButton }
