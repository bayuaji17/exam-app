"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

/**
 * Sign out from the participant shell: end the session and return to the
 * login page.
 */
export function ExamSignOutButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleSignOut() {
    await authClient.signOut()

    startTransition(() => {
      router.push("/login")
      router.refresh()
    })
  }

  return (
    <Button
      disabled={isPending}
      size="sm"
      type="button"
      variant="outline"
      onClick={handleSignOut}
    >
      Keluar
    </Button>
  )
}
